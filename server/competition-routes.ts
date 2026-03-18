/**
 * server/competition-routes.ts — REST API routes for the competition system
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { CompetitionEngine } from "./competition-engine";
import type { ArenaEngine } from "./engine";
import * as compDb from "./competition-db";
import * as dbHelpers from "./db";

function parseIntParam(val: string): number {
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Invalid ID parameter");
  return n;
}

function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

// ─── Zod Schemas ────────────────────────────────────────────

const createSeasonSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(32),
  startDate: z.number().positive(),
  endDate: z.number().positive(),
});

const createCompetitionSchema = z.object({
  seasonId: z.number().positive(),
  title: z.string().min(1).max(256),
  slug: z.string().min(1).max(64),
  description: z.string().optional(),
  competitionNumber: z.number().int().positive(),
  competitionType: z.enum(["regular", "grand_final", "special", "practice"]).default("regular"),
  participantMode: z.enum(["human", "agent"]).default("human"),
  maxParticipants: z.number().int().positive().default(50),
  minParticipants: z.number().int().positive().default(5),
  registrationOpenAt: z.number().positive().optional(),
  registrationCloseAt: z.number().positive().optional(),
  startTime: z.number().positive(),
  endTime: z.number().positive(),
  symbol: z.string().regex(/^[A-Z]{2,10}(?:USDT|USDC)$/).default("SOLUSDT"),
  startingCapital: z.number().positive().default(5000),
  maxTradesPerMatch: z.number().int().positive().default(40),
  closeOnlySeconds: z.number().int().nonnegative().default(1800),
  feeRate: z.number().nonnegative().default(0.0005),
  prizePool: z.number().nonnegative().default(500),
  requireMinSeasonPoints: z.number().int().nonnegative().default(0),
  requireMinTier: z.string().optional(),
  inviteOnly: z.boolean().default(false),
});

const updateCompetitionSchema = createCompetitionSchema.partial();

const transitionSchema = z.object({
  status: z.enum(["announced", "registration_open", "registration_closed", "live", "ended_early", "cancelled"]),
});

const reviewSchema = z.object({
  decision: z.enum(["accepted", "rejected", "waitlisted"]),
});

const batchReviewSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
  ids: z.array(z.number().positive()),
});

type RawLeaderboardRow = {
  arenaAccountId: number;
  rank: number;
  username: string;
  pnlPct: number;
  pnl: number;
  weightedPnl: number;
  matchPoints: number;
  prizeEligible: boolean;
  prizeAmount: number;
  rankTier?: string;
};

type MatchTradePoint = {
  arenaAccountId: number;
  pnl: number;
  closeTime: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isAgentCompetition(participantMode?: string | null): boolean {
  return (participantMode ?? "human") === "agent";
}

function formatCurveLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSampleTimes(startTime: number, endTime: number, points = 24): number[] {
  if (endTime <= startTime) {
    return [endTime];
  }

  const count = Math.max(2, points);
  return Array.from({ length: count }, (_, index) => {
    if (index === count - 1) return endTime;
    return Math.round(startTime + ((endTime - startTime) * index) / (count - 1));
  });
}

function buildEquitySeriesForAccounts(input: {
  accountIds: number[];
  sampleTimes: number[];
  startingCapital: number;
  trades: MatchTradePoint[];
  currentEquityMap: Map<number, number>;
}): Map<number, number[]> {
  const grouped = new Map<number, MatchTradePoint[]>();
  for (const accountId of input.accountIds) {
    grouped.set(accountId, []);
  }

  for (const trade of input.trades) {
    if (!grouped.has(trade.arenaAccountId)) continue;
    grouped.get(trade.arenaAccountId)!.push(trade);
  }

  const output = new Map<number, number[]>();
  for (const accountId of input.accountIds) {
    const seriesTrades = grouped.get(accountId) ?? [];
    let tradeIndex = 0;
    let realizedPnl = 0;
    const series: number[] = [];

    for (const sampleTime of input.sampleTimes) {
      while (
        tradeIndex < seriesTrades.length &&
        seriesTrades[tradeIndex].closeTime <= sampleTime
      ) {
        realizedPnl += seriesTrades[tradeIndex].pnl;
        tradeIndex += 1;
      }
      series.push(round2(input.startingCapital + realizedPnl));
    }

    if (series.length > 0) {
      const currentEquity = input.currentEquityMap.get(accountId);
      if (typeof currentEquity === "number") {
        series[series.length - 1] = round2(currentEquity);
      }
    }

    output.set(accountId, series);
  }

  return output;
}

// ─── Route Registration ─────────────────────────────────────

export function registerCompetitionRoutes(
  app: Express,
  engine: CompetitionEngine,
  arenaEngine: ArenaEngine,
) {
  const getCompetitionByIdentifier = async (identifier: string) => {
    if (/^\d+$/.test(identifier)) {
      return compDb.getCompetitionById(parseIntParam(identifier));
    }
    return compDb.getCompetitionBySlug(identifier);
  };

  const getCurrentAccountId = async (req: Request) => {
    const token = getAuthToken(req);
    if (!token) return null;
    const account = await arenaEngine.getAccountByToken(token);
    return account?.id ?? null;
  };

  const toLeaderboardRows = (
    rows: RawLeaderboardRow[],
    accountId: number | null,
    isBot = false,
  ) => rows.map((row) => ({
    rank: row.rank,
    username: row.username,
    pnlPct: row.pnlPct,
    pnl: row.pnl,
    weightedPnl: row.weightedPnl,
    matchPoints: row.matchPoints,
    prizeEligible: row.prizeEligible,
    prizeAmount: row.prizeAmount,
    rankTier: row.rankTier,
    isYou: accountId !== null && row.arenaAccountId === accountId,
    isBot,
  }));

  const buildLiveLeaderboardRows = async (
    comp: NonNullable<Awaited<ReturnType<typeof compDb.getCompetitionById>>>,
  ): Promise<RawLeaderboardRow[]> => {
    if ((comp.status !== "live" && comp.status !== "settling") || !comp.matchId) {
      return [];
    }

    const acceptedIds = new Set(await compDb.getAcceptedAccountIds(comp.id));
    return arenaEngine.buildLeaderboard(comp.matchId, acceptedIds, comp.id);
  };

  const pickLandingAgentCompetition = async () => {
    const liveCompetitions = await compDb.listCompetitions({ status: "live" });
    const liveAgentCompetitions = liveCompetitions
      .filter((comp) => isAgentCompetition(comp.participantMode))
      .sort((a, b) => b.startTime - a.startTime);

    return liveAgentCompetitions[0] ?? null;
  };

  const getCurrentOwnedAgentAccountId = async (req: Request) => {
    const token = getAuthToken(req);
    if (!token) return null;
    const account = await arenaEngine.getAccountByToken(token);
    if (!account || account.accountType !== "human") return null;
    const agent = await dbHelpers.getCurrentAgentForOwner(account.id);
    return agent?.arenaAccountId ?? null;
  };
  // ─── Public Endpoints ───────────────────────────────────────

  /** Public: Competition showcase for landing page (no auth required) */
  app.get("/api/public/competitions", async (_req: Request, res: Response) => {
    try {
      // Fetch all non-draft, non-cancelled competitions
      const allComps = await compDb.listCompetitions({});
      const visibleComps = allComps.filter(
        (c) => c.status !== "draft" && c.status !== "cancelled",
      );

      // Get current season
      const seasons = await compDb.listSeasons();
      const activeSeason = seasons.find((s) => s.status === "active") ?? seasons[0] ?? null;

      // Separate into categories
      const live = visibleComps.filter((c) => c.status === "live");
      const upcoming = visibleComps.filter(
        (c) => c.status === "announced" || c.status === "registration_open" || c.status === "registration_closed",
      );
      const completed = visibleComps
        .filter((c) => c.status === "completed" || c.status === "ended_early" || c.status === "settling")
        .slice(0, 5); // Last 5 completed

      const mapComp = async (c: (typeof visibleComps)[0]) => {
        const registered = await compDb.countRegistrations(c.id);
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          competitionType: c.competitionType,
          participantMode: c.participantMode ?? "human",
          status: c.status,
          prizePool: c.prizePool,
          symbol: c.symbol,
          startTime: c.startTime,
          endTime: c.endTime,
          registeredCount: registered,
          maxParticipants: c.maxParticipants,
          coverImageUrl: c.coverImageUrl ?? null,
        };
      };

      res.json({
        season: activeSeason
          ? { id: activeSeason.id, name: activeSeason.name, slug: activeSeason.slug }
          : null,
        live: await Promise.all(live.map(mapComp)),
        upcoming: await Promise.all(upcoming.map(mapComp)),
        completed: await Promise.all(completed.map(mapComp)),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/public/agent-showcase", async (req: Request, res: Response) => {
    try {
      const comp = await pickLandingAgentCompetition();
      if (!comp) {
        res.json({
          competition: null,
          topAgents: [],
          curvePoints: [],
          chatMessages: [],
          myAgent: null,
          myAgentStatus: getAuthToken(req) ? "no_live_match" : "viewer",
          refreshedAt: Date.now(),
        });
        return;
      }

      const [leaderboardRows, myAgentAccountId, chatMessages] = await Promise.all([
        buildLiveLeaderboardRows(comp),
        getCurrentOwnedAgentAccountId(req),
        dbHelpers.getRecentChatMessages(80, comp.id),
      ]);

      const participantIds = leaderboardRows.map((row) => row.arenaAccountId);
      const currentEquityMap = new Map(
        leaderboardRows.map((row) => [row.arenaAccountId, round2(comp.startingCapital + row.pnl)]),
      );
      const trades = comp.matchId && participantIds.length > 0
        ? await dbHelpers.getTradesForMatch(comp.matchId, participantIds)
        : [];
      const sampleTimes = buildSampleTimes(comp.startTime, Date.now(), 24);
      const allSeriesMap = buildEquitySeriesForAccounts({
        accountIds: participantIds,
        sampleTimes,
        startingCapital: comp.startingCapital,
        trades,
        currentEquityMap,
      });

      const topRows = leaderboardRows.slice(0, 10);
      const myAgentRow = myAgentAccountId
        ? leaderboardRows.find((row) => row.arenaAccountId === myAgentAccountId) ?? null
        : null;
      const averageSeries = sampleTimes.map((_, index) => {
        if (participantIds.length === 0) return comp.startingCapital;
        const total = participantIds.reduce(
          (sum, accountId) => sum + (allSeriesMap.get(accountId)?.[index] ?? comp.startingCapital),
          0,
        );
        return round2(total / participantIds.length);
      });

      res.json({
        competition: {
          id: comp.id,
          slug: comp.slug,
          title: comp.title,
          symbol: comp.symbol,
          prizePool: comp.prizePool,
          startTime: comp.startTime,
          endTime: comp.endTime,
          participantCount: leaderboardRows.length,
        },
        topAgents: topRows.map((row) => ({
          rank: row.rank,
          username: row.username,
          pnlPct: row.pnlPct,
          latestEquity: round2(comp.startingCapital + row.pnl),
          isMyAgent: row.arenaAccountId === myAgentAccountId,
        })),
        curvePoints: sampleTimes.map((timestamp, index) => ({
          timestamp,
          label: formatCurveLabel(timestamp),
          topAgents: topRows.map((row) => ({
            username: row.username,
            equity: allSeriesMap.get(row.arenaAccountId)?.[index] ?? comp.startingCapital,
          })),
          myAgent: myAgentRow
            ? allSeriesMap.get(myAgentRow.arenaAccountId)?.[index] ?? comp.startingCapital
            : null,
          average: averageSeries[index] ?? comp.startingCapital,
        })),
        chatMessages,
        myAgent: myAgentRow
          ? {
              rank: myAgentRow.rank,
              username: myAgentRow.username,
              pnlPct: myAgentRow.pnlPct,
              latestEquity: round2(comp.startingCapital + myAgentRow.pnl),
            }
          : null,
        myAgentStatus: !getAuthToken(req)
          ? "viewer"
          : !myAgentAccountId
            ? "no_agent"
            : myAgentRow
              ? "in_match"
              : "not_in_match",
        refreshedAt: Date.now(),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/public/agent-showcase/leaderboard", async (req: Request, res: Response) => {
    try {
      const identifier = typeof req.query.competitionId === "string"
        ? req.query.competitionId
        : typeof req.query.slug === "string"
          ? req.query.slug
          : null;
      if (!identifier) {
        res.status(400).json({ error: "competitionId or slug is required" });
        return;
      }

      const comp = await getCompetitionByIdentifier(identifier);
      if (!comp || !isAgentCompetition(comp.participantMode)) {
        res.status(404).json({ error: "Agent competition not found" });
        return;
      }

      const leaderboardRows = await buildLiveLeaderboardRows(comp);
      const myAgentAccountId = await getCurrentOwnedAgentAccountId(req);
      const offset = Math.max(0, Number(req.query.offset ?? 0));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 100)));
      const pageRows = leaderboardRows.slice(offset, offset + limit);
      const myAgentRow = myAgentAccountId
        ? leaderboardRows.find((row) => row.arenaAccountId === myAgentAccountId) ?? null
        : null;

      res.json({
        competitionId: comp.id,
        items: toLeaderboardRows(pageRows, myAgentAccountId, true),
        offset,
        limit,
        total: leaderboardRows.length,
        hasMore: offset + limit < leaderboardRows.length,
        myAgent: myAgentRow
          ? {
              rank: myAgentRow.rank,
              username: myAgentRow.username,
              pnlPct: myAgentRow.pnlPct,
              latestEquity: round2(comp.startingCapital + myAgentRow.pnl),
              inPage: myAgentRow.rank > offset && myAgentRow.rank <= offset + limit,
            }
          : null,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** List competitions */
  app.get("/api/competitions", async (req: Request, res: Response) => {
    try {
      const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
      const status = req.query.status as string | undefined;
      const comps = await compDb.listCompetitions({ seasonId, status });

      // Add registration counts
      const token = getAuthToken(req);
      let accountId: number | null = null;
      if (token) {
        const account = await arenaEngine.getAccountByToken(token);
        accountId = account?.id ?? null;
      }

      const items = [];
      for (const comp of comps) {
        const registered = await compDb.countRegistrations(comp.id);
        const accepted = await compDb.countRegistrations(comp.id, "accepted");
        let myStatus = null;
        if (accountId) {
          const reg = await compDb.getRegistration(comp.id, accountId);
          myStatus = reg?.status ?? null;
        }
        items.push({
          id: comp.id,
          slug: comp.slug,
          title: comp.title,
          competitionNumber: comp.competitionNumber,
          competitionType: comp.competitionType,
          participantMode: comp.participantMode ?? "human",
          status: comp.status,
          maxParticipants: comp.maxParticipants,
          registeredCount: registered,
          acceptedCount: accepted,
          prizePool: comp.prizePool,
          symbol: comp.symbol,
          startTime: comp.startTime,
          endTime: comp.endTime,
          registrationOpenAt: comp.registrationOpenAt,
          registrationCloseAt: comp.registrationCloseAt,
          coverImageUrl: comp.coverImageUrl ?? null,
          myRegistrationStatus: myStatus,
        });
      }
      res.json({ items, total: items.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Get competition detail */
  app.get("/api/competitions/:identifier", async (req: Request, res: Response) => {
    try {
      const comp = await getCompetitionByIdentifier(req.params.identifier);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }

      const registered = await compDb.countRegistrations(comp.id);
      const accepted = await compDb.countRegistrations(comp.id, "accepted");

      // My registration status
      let myReg = null;
      const token = getAuthToken(req);
      if (token) {
        const account = await arenaEngine.getAccountByToken(token);
        if (account) {
          const reg = await compDb.getRegistration(comp.id, account.id);
          myReg = reg ? { status: reg.status, appliedAt: reg.appliedAt } : null;
        }
      }

      res.json({
        ...comp,
        registeredCount: registered,
        acceptedCount: accepted,
        participantMode: comp.participantMode ?? "human",
        inviteOnly: !!comp.inviteOnly,
        myRegistration: myReg,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Competition leaderboard */
  app.get("/api/competitions/:identifier/leaderboard", async (req: Request, res: Response) => {
    try {
      const comp = await getCompetitionByIdentifier(req.params.identifier);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }

      const accountId = await getCurrentAccountId(req);
      if (comp.status === "completed" || comp.status === "ended_early") {
        const results = await compDb.getMatchResultsForCompetition(comp.id);
        res.json(toLeaderboardRows(
          results.map((r) => ({
            arenaAccountId: r.arenaAccountId,
            rank: r.finalRank,
            username: r.username ?? `#${r.arenaAccountId}`,
            pnl: r.totalPnl,
            pnlPct: r.totalPnlPct,
            weightedPnl: r.totalWeightedPnl,
            matchPoints: r.pointsEarned,
            prizeEligible: !!r.prizeEligible,
            prizeAmount: r.prizeWon,
            rankTier: r.rankTierAtTime ?? undefined,
          })),
          accountId,
          isAgentCompetition(comp.participantMode),
        ));
      } else if (comp.status === "live" && comp.matchId) {
        const acceptedIds = new Set(await compDb.getAcceptedAccountIds(comp.id));
        const lb = await arenaEngine.buildLeaderboard(comp.matchId, acceptedIds, comp.id);
        res.json(toLeaderboardRows(lb.slice(0, 100), accountId, isAgentCompetition(comp.participantMode)));
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Competition results payload for the results page */
  app.get("/api/competitions/:identifier/results", async (req: Request, res: Response) => {
    try {
      const comp = await getCompetitionByIdentifier(req.params.identifier);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }

      const accountId = await getCurrentAccountId(req);
      let leaderboard: ReturnType<typeof toLeaderboardRows> = [];
      let participantCount = 0;

      if (comp.status === "completed" || comp.status === "ended_early") {
        const results = await compDb.getMatchResultsForCompetition(comp.id);
        participantCount = results[0]?.participantCount ?? results.length;
        leaderboard = toLeaderboardRows(
          results.map((r) => ({
            arenaAccountId: r.arenaAccountId,
            rank: r.finalRank,
            username: r.username ?? `#${r.arenaAccountId}`,
            pnl: r.totalPnl,
            pnlPct: r.totalPnlPct,
            weightedPnl: r.totalWeightedPnl,
            matchPoints: r.pointsEarned,
            prizeEligible: !!r.prizeEligible,
            prizeAmount: r.prizeWon,
            rankTier: r.rankTierAtTime ?? undefined,
          })),
          accountId,
          isAgentCompetition(comp.participantMode),
        );
      } else if ((comp.status === "live" || comp.status === "settling") && comp.matchId) {
        const acceptedIds = new Set(await compDb.getAcceptedAccountIds(comp.id));
        const rows = await arenaEngine.buildLeaderboard(comp.matchId, acceptedIds, comp.id);
        participantCount = rows.length;
        leaderboard = toLeaderboardRows(rows.slice(0, 100), accountId, isAgentCompetition(comp.participantMode));
      }

      res.json({
        competitionId: comp.id,
        title: comp.title,
        status: comp.status,
        participantCount,
        prizePool: comp.prizePool,
        leaderboard,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Read-only spectator payload for live competitions */
  app.get("/api/competitions/:identifier/spectator-feed", async (req: Request, res: Response) => {
    try {
      const comp = await getCompetitionByIdentifier(req.params.identifier);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }

      const accountId = await getCurrentAccountId(req);
      let leaderboard: ReturnType<typeof toLeaderboardRows> = [];
      if ((comp.status === "live" || comp.status === "settling") && comp.matchId) {
        const acceptedIds = new Set(await compDb.getAcceptedAccountIds(comp.id));
        const rows = await arenaEngine.buildLeaderboard(comp.matchId, acceptedIds, comp.id);
        leaderboard = toLeaderboardRows(rows.slice(0, 100), accountId, isAgentCompetition(comp.participantMode));
      } else if (comp.status === "completed" || comp.status === "ended_early") {
        const results = await compDb.getMatchResultsForCompetition(comp.id);
        leaderboard = toLeaderboardRows(
          results.map((r) => ({
            arenaAccountId: r.arenaAccountId,
            rank: r.finalRank,
            username: r.username ?? `#${r.arenaAccountId}`,
            pnl: r.totalPnl,
            pnlPct: r.totalPnlPct,
            weightedPnl: r.totalWeightedPnl,
            matchPoints: r.pointsEarned,
            prizeEligible: !!r.prizeEligible,
            prizeAmount: r.prizeWon,
            rankTier: r.rankTierAtTime ?? undefined,
          })),
          accountId,
          isAgentCompetition(comp.participantMode),
        );
      }

      res.json({
        competitionId: comp.id,
        title: comp.title,
        status: comp.status,
        participantMode: comp.participantMode ?? "human",
        symbol: comp.symbol,
        startingCapital: comp.startingCapital,
        startTime: comp.startTime,
        endTime: comp.endTime,
        prizePool: comp.prizePool,
        leaderboard,
        chatMessages: await dbHelpers.getRecentChatMessages(120, comp.id),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** List seasons */
  app.get("/api/seasons", async (_req: Request, res: Response) => {
    try {
      res.json(await compDb.listSeasons());
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Season leaderboard — ranked by seasonRankScore = seasonPoints × avgHoldWeight */
  app.get("/api/seasons/:seasonSlug/leaderboard", async (req: Request, res: Response) => {
    try {
      const season = await compDb.getSeasonBySlug(req.params.seasonSlug);
      if (!season) {
        res.status(404).json({ error: "Season not found" });
        return;
      }

      const limit = Math.min(Math.max(1, Number(req.query.limit) || 500), 1000);
      const leaderboard = await dbHelpers.getSeasonLeaderboard(season.id, limit);

      // Find current user's position if authenticated
      const token = getAuthToken(req);
      const account = token ? await arenaEngine.getAccountByToken(token) : null;
      const me = account ? leaderboard.find(r => r.arenaAccountId === account.id) : null;

      res.json({
        seasonId: season.id,
        seasonName: season.name,
        leaderboard,
        me: me ?? null,
        grandFinalLine: await dbHelpers.getGrandFinalLine(500, season.id),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Admin: Season leaderboard */
  app.get("/api/admin/seasons/:id/leaderboard", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    try {
      const seasonId = parseIntParam(req.params.id);
      const limit = Math.min(Math.max(1, Number(req.query.limit) || 500), 1000);
      const leaderboard = await dbHelpers.getSeasonLeaderboard(seasonId, limit);
      const grandFinalLine = await dbHelpers.getGrandFinalLine(500, seasonId);
      res.json({ leaderboard, grandFinalLine });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ─── Authenticated Endpoints ────────────────────────────────

  /** Register for competition */
  app.post("/api/competitions/:slug/register", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      const comp = await compDb.getCompetitionBySlug(req.params.slug);
      if (!comp) { res.status(404).json({ error: "Competition not found" }); return; }
      await engine.register(comp.id, account.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** Withdraw from competition */
  app.post("/api/competitions/:slug/withdraw", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      const comp = await compDb.getCompetitionBySlug(req.params.slug);
      if (!comp) { res.status(404).json({ error: "Competition not found" }); return; }
      await engine.withdraw(comp.id, account.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** Hub data */
  app.get("/api/hub", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      const data = await engine.getHubData(account.id);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Match history */
  app.get("/api/me/history", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      const limit = Number(req.query.limit ?? 50);
      const results = await compDb.getMatchResultsForUser(account.id, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Notifications */
  app.get("/api/me/notifications", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      const limit = Number(req.query.limit ?? 50);
      const items = await compDb.getNotificationsForUser(account.id, limit);
      const unreadCount = await compDb.getUnreadCount(account.id);
      res.json({ items, unreadCount });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/me/notifications/unread-count", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      const count = await compDb.getUnreadCount(account.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/me/notifications/:id/read", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      await compDb.markNotificationRead(parseIntParam(req.params.id), account.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/me/notifications/read-all", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      await compDb.markAllNotificationsRead(account.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ─── Admin Endpoints ────────────────────────────────────────

  /** Admin auth check middleware helper */
  async function requireAdmin(req: Request, res: Response): Promise<number | null> {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) { res.status(401).json({ error: "Unauthorized" }); return null; }
    // Check admin role (from arena_accounts.role column)
    const fullAccount = await import("./db").then((m) => m.getArenaAccountById(account.id));
    if (!fullAccount || (fullAccount as any).role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return null;
    }
    return account.id;
  }

  /** Create season */
  app.post("/api/admin/seasons", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const parsed = createSeasonSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

    try {
      const id = await compDb.createSeason(parsed.data);
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** List seasons (admin) */
  app.get("/api/admin/seasons", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    try {
      res.json(await compDb.listSeasons());
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Create competition */
  app.post("/api/admin/competitions", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const parsed = createCompetitionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

    try {
      const id = await compDb.createCompetition({
        ...parsed.data,
        inviteOnly: parsed.data.inviteOnly ? 1 : 0,
        createdBy: adminId,
      });
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** Update competition */
  app.put("/api/admin/competitions/:id", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const parsed = updateCompetitionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

    try {
      const updates: any = { ...parsed.data };
      if (updates.inviteOnly !== undefined) updates.inviteOnly = updates.inviteOnly ? 1 : 0;
      await compDb.updateCompetition(parseIntParam(req.params.id), updates);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** Transition competition status */
  app.post("/api/admin/competitions/:id/transition", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid status" }); return; }

    try {
      await engine.transitionStatus(parseIntParam(req.params.id), parsed.data.status, adminId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** List registrations for competition */
  app.get("/api/admin/competitions/:id/registrations", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    try {
      const status = req.query.status as string | undefined;
      const regs = await compDb.listRegistrations(parseIntParam(req.params.id), status);
      res.json(regs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Review single registration */
  app.post("/api/admin/registrations/:id/review", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

    try {
      await engine.reviewRegistration(parseIntParam(req.params.id), parsed.data.decision, adminId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** Batch review registrations */
  app.post("/api/admin/competitions/:id/registrations/batch", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const parsed = batchReviewSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

    try {
      const count = await engine.batchReview(
        parseIntParam(req.params.id),
        parsed.data.ids,
        parsed.data.action,
        adminId,
      );
      res.json({ ok: true, processed: count });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /** Duplicate competition */
  app.post("/api/admin/competitions/:id/duplicate", async (req: Request, res: Response) => {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    try {
      const original = await compDb.getCompetitionById(parseIntParam(req.params.id));
      if (!original) { res.status(404).json({ error: "Not found" }); return; }

      const id = await compDb.createCompetition({
        seasonId: original.seasonId,
        title: `${original.title} (副本)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        description: original.description ?? undefined,
        competitionNumber: original.competitionNumber + 1,
        competitionType: original.competitionType,
        participantMode: original.participantMode ?? "human",
        maxParticipants: original.maxParticipants,
        minParticipants: original.minParticipants,
        startTime: original.startTime + 24 * 60 * 60 * 1000, // +1 day
        endTime: original.endTime + 24 * 60 * 60 * 1000,
        registrationOpenAt: original.registrationOpenAt
          ? original.registrationOpenAt + 24 * 60 * 60 * 1000
          : undefined,
        registrationCloseAt: original.registrationCloseAt
          ? original.registrationCloseAt + 24 * 60 * 60 * 1000
          : undefined,
        symbol: original.symbol,
        startingCapital: original.startingCapital,
        maxTradesPerMatch: original.maxTradesPerMatch,
        closeOnlySeconds: original.closeOnlySeconds,
        feeRate: original.feeRate,
        prizePool: original.prizePool,
        requireMinSeasonPoints: original.requireMinSeasonPoints,
        requireMinTier: original.requireMinTier || undefined,
        inviteOnly: original.inviteOnly,
        createdBy: adminId,
      });
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
}
