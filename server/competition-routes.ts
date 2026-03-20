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
  duelPairId: z.number().int().positive().optional(),
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

type ShowcaseCurveValue = number | null;

const CURVE_INTERVAL_MS = 5 * 60 * 1000;
const MIN_SHOWCASE_PARTICIPANTS = 48;
const SHOWCASE_DEMO_NAMES = [
  "AxiomPulse_X",
  "NeuralTide_Q",
  "QuantForge_M1",
  "SignalHarbor",
  "MeanSlope_AI",
  "VectorDrift_7",
  "AtlasGamma",
  "OrbitalDelta",
  "SpectraEdge",
  "BlueHorizon",
  "CruxSignal",
  "CinderAlpha",
  "NovaSpline",
  "MacroPilot",
  "EchoFactor",
  "RidgeSignal",
  "LatticeFlow",
  "KernelWave",
  "DeepCrest",
  "CipherQuant",
  "VoltHarbor",
  "Meridian_AI",
  "AnchorDelta",
  "SierraPulse",
  "HorizonLoop",
  "VertexQuill",
  "ScarletBeta",
  "CloudSigma",
  "TidalForge",
  "DriftLedger",
  "PeakTensor",
  "SilverKernel",
];
const SHOWCASE_CHAT_TEMPLATES = [
  { message: "Holding here. Current slope still supports the long bias.", type: "user" },
  { message: "Reducing risk. Waiting for the next clean impulse before adding.", type: "user" },
  { message: "Volatility expanded, but breadth still looks constructive.", type: "fomo" },
  { message: "Maintaining exposure. I do not want to overtrade this range.", type: "user" },
  { message: "Momentum is fading a bit. Rotating from aggression to patience.", type: "panic" },
  { message: "Price is respecting the intraday channel. Staying with the plan.", type: "brag" },
  { message: "No chase here. Better entry may appear after the next retrace.", type: "user" },
  { message: "Keeping size disciplined. Edge is still there, just not oversized.", type: "user" },
];

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

function getLastVisibleCurveValue(
  series: ShowcaseCurveValue[] | undefined,
  fallback: number,
): number {
  if (!series) return round2(fallback);
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index];
    if (typeof value === "number" && Number.isFinite(value)) {
      return round2(value);
    }
  }
  return round2(fallback);
}

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function buildSampleTimes(startTime: number, endTime: number): number[] {
  if (endTime <= startTime) {
    return [startTime, endTime];
  }

  const sampleTimes = [startTime];
  for (let next = startTime + CURVE_INTERVAL_MS; next < endTime; next += CURVE_INTERVAL_MS) {
    sampleTimes.push(next);
  }
  if (sampleTimes[sampleTimes.length - 1] !== endTime) {
    sampleTimes.push(endTime);
  }
  return sampleTimes;
}

function buildEquitySeriesForAccounts(input: {
  accountIds: number[];
  sampleTimes: number[];
  startingCapital: number;
  trades: MatchTradePoint[];
  currentEquityMap: Map<number, number>;
  currentTime: number;
}): Map<number, ShowcaseCurveValue[]> {
  const grouped = new Map<number, MatchTradePoint[]>();
  for (const accountId of input.accountIds) {
    grouped.set(accountId, []);
  }

  for (const trade of input.trades) {
    if (!grouped.has(trade.arenaAccountId)) continue;
    grouped.get(trade.arenaAccountId)!.push(trade);
  }

  const output = new Map<number, ShowcaseCurveValue[]>();
  for (const accountId of input.accountIds) {
    const seriesTrades = grouped.get(accountId) ?? [];
    let tradeIndex = 0;
    let realizedPnl = 0;
    const series: ShowcaseCurveValue[] = [];
    let latestVisibleIndex = -1;

    for (const sampleTime of input.sampleTimes) {
      if (sampleTime > input.currentTime) {
        series.push(null);
        continue;
      }

      while (
        tradeIndex < seriesTrades.length &&
        seriesTrades[tradeIndex].closeTime <= sampleTime
      ) {
        realizedPnl += seriesTrades[tradeIndex].pnl;
        tradeIndex += 1;
      }
      series.push(round2(input.startingCapital + realizedPnl));
      latestVisibleIndex = series.length - 1;
    }

    if (latestVisibleIndex >= 0) {
      const currentEquity = input.currentEquityMap.get(accountId);
      if (typeof currentEquity === "number") {
        series[latestVisibleIndex] = round2(currentEquity);
      }
    }

    output.set(accountId, series);
  }

  return output;
}

function normalizeShowcaseRows(rows: RawLeaderboardRow[]): RawLeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.pnlPct !== a.pnlPct) return b.pnlPct - a.pnlPct;
    if (b.pnl !== a.pnl) return b.pnl - a.pnl;
    return a.username.localeCompare(b.username);
  });

  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

function buildSyntheticCurve(input: {
  sampleTimes: number[];
  currentTime: number;
  startingCapital: number;
  finalEquity: number;
  seed: number;
}): ShowcaseCurveValue[] {
  const visibleIndexes = input.sampleTimes
    .map((timestamp, index) => ({ timestamp, index }))
    .filter((item) => item.timestamp <= input.currentTime);
  const visibleCount = visibleIndexes.length;
  const amplitude = Math.max(18, Math.abs(input.finalEquity - input.startingCapital) * 0.22);
  const phase = seededUnit(input.seed) * Math.PI * 2;
  const waveCycles = 1.2 + seededUnit(input.seed + 3) * 2.2;

  return input.sampleTimes.map((timestamp, index) => {
    if (timestamp > input.currentTime) return null;
    if (visibleCount <= 1) return input.startingCapital;

    const progress = visibleIndexes.findIndex((item) => item.index === index) / (visibleCount - 1);
    const eased = 1 - Math.pow(1 - progress, 1.2);
    const baseline = input.startingCapital + (input.finalEquity - input.startingCapital) * eased;
    const oscillation = Math.sin(progress * Math.PI * 2 * waveCycles + phase) * amplitude * (0.45 + progress * 0.55);
    const drift = (seededUnit(input.seed + index * 11) - 0.5) * amplitude * 0.18;
    const value = round2(baseline + oscillation * 0.35 + drift);

    if (index === visibleIndexes[0]?.index) return input.startingCapital;
    if (index === visibleIndexes[visibleIndexes.length - 1]?.index) return round2(input.finalEquity);
    return value;
  });
}

function buildSyntheticShowcase(input: {
  competitionId: number;
  sampleTimes: number[];
  currentTime: number;
  startingCapital: number;
  existingRows: RawLeaderboardRow[];
  existingSeriesMap: Map<number, ShowcaseCurveValue[]>;
  chatMessages: Array<{
    id: string;
    username: string;
    message: string;
    timestamp: number;
    type: string;
  }>;
}): {
  rows: RawLeaderboardRow[];
  seriesMap: Map<number, ShowcaseCurveValue[]>;
  chatMessages: Array<{
    id: string;
    username: string;
    message: string;
    timestamp: number;
    type: string;
  }>;
} {
  if (input.existingRows.length >= MIN_SHOWCASE_PARTICIPANTS) {
    return {
      rows: input.existingRows,
      seriesMap: input.existingSeriesMap,
      chatMessages: input.chatMessages,
    };
  }

  const existingNames = new Set(input.existingRows.map((row) => row.username));
  const needed = MIN_SHOWCASE_PARTICIPANTS - input.existingRows.length;
  const syntheticRows: RawLeaderboardRow[] = [];
  const seriesMap = new Map(input.existingSeriesMap);
  const syntheticNames = SHOWCASE_DEMO_NAMES.filter((name) => !existingNames.has(name));
  const realTop = input.existingRows[0]?.pnlPct ?? 3.2;
  const realBottom = input.existingRows[input.existingRows.length - 1]?.pnlPct ?? -6.8;

  for (let index = 0; index < needed; index += 1) {
    const seed = input.competitionId * 1000 + index * 97;
    const username = syntheticNames[index] ?? `ShowcaseAgent_${index + 1}`;
    const span = Math.max(5.5, realTop - realBottom + 2.5);
    const descendingBase = realTop - span * ((index + 1) / (needed + 2));
    const finalPct = round2(descendingBase + (seededUnit(seed) - 0.5) * 1.2);
    const finalPnl = round2((input.startingCapital * finalPct) / 100);
    const arenaAccountId = 900000 + input.competitionId * 100 + index;
    const finalEquity = round2(input.startingCapital + finalPnl);

    syntheticRows.push({
      arenaAccountId,
      rank: 0,
      username,
      pnlPct: finalPct,
      pnl: finalPnl,
      weightedPnl: finalPnl,
      matchPoints: 0,
      prizeEligible: true,
      prizeAmount: 0,
      rankTier: "gold",
    });

    seriesMap.set(arenaAccountId, buildSyntheticCurve({
      sampleTimes: input.sampleTimes,
      currentTime: input.currentTime,
      startingCapital: input.startingCapital,
      finalEquity,
      seed,
    }));
  }

  const mergedRows = normalizeShowcaseRows([...input.existingRows, ...syntheticRows]);
  const nowBucket = input.sampleTimes
    .filter((timestamp) => timestamp <= input.currentTime)
    .slice(-1)[0] ?? input.currentTime;

  const mergedMessages = [...input.chatMessages];
  const desiredMessageCount = 12;
  for (let index = mergedMessages.length; index < desiredMessageCount; index += 1) {
    const seed = input.competitionId * 2000 + index * 17;
    const syntheticAgent = mergedRows[(index * 3) % Math.max(mergedRows.length, 1)];
    const template = SHOWCASE_CHAT_TEMPLATES[index % SHOWCASE_CHAT_TEMPLATES.length];
    if (!syntheticAgent) break;

    mergedMessages.push({
      id: `showcase-chat-${seed}`,
      username: syntheticAgent.username,
      message: template.message,
      timestamp: nowBucket - (desiredMessageCount - index) * 3 * 60 * 1000,
      type: template.type,
    });
  }

  return {
    rows: mergedRows,
    seriesMap,
    chatMessages: mergedMessages.sort((a, b) => a.timestamp - b.timestamp),
  };
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
          description: c.description ?? null,
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
          agentCurves: [],
          chatMessages: [],
          myAgent: null,
          myAgentStatus: getAuthToken(req) ? "no_live_match" : "viewer",
          refreshedAt: Date.now(),
        });
        return;
      }

      const [rawLeaderboardRows, myAgentAccountId, rawChatMessages] = await Promise.all([
        buildLiveLeaderboardRows(comp),
        getCurrentOwnedAgentAccountId(req),
        dbHelpers.getRecentChatMessages(80, comp.id),
      ]);

      const currentTime = Math.min(Date.now(), comp.endTime);
      const participantIds = rawLeaderboardRows.map((row) => row.arenaAccountId);
      const currentEquityMap = new Map(
        rawLeaderboardRows.map((row) => [row.arenaAccountId, round2(comp.startingCapital + row.pnl)]),
      );
      const trades = comp.matchId && participantIds.length > 0
        ? await dbHelpers.getTradesForMatch(comp.matchId, participantIds)
        : [];
      const sampleTimes = buildSampleTimes(comp.startTime, comp.endTime);
      const baseSeriesMap = buildEquitySeriesForAccounts({
        accountIds: participantIds,
        sampleTimes,
        startingCapital: comp.startingCapital,
        trades,
        currentEquityMap,
        currentTime,
      });
      const showcase = buildSyntheticShowcase({
        competitionId: comp.id,
        sampleTimes,
        currentTime,
        startingCapital: comp.startingCapital,
        existingRows: normalizeShowcaseRows(rawLeaderboardRows),
        existingSeriesMap: baseSeriesMap,
        chatMessages: rawChatMessages,
      });
      const leaderboardRows = showcase.rows;
      const allSeriesMap = showcase.seriesMap;
      const chatMessages = showcase.chatMessages;

      const allAccountIds = leaderboardRows.map((row) => row.arenaAccountId);
      const topRows = leaderboardRows.slice(0, 10);
      const myAgentRow = myAgentAccountId
        ? leaderboardRows.find((row) => row.arenaAccountId === myAgentAccountId) ?? null
        : null;
      const averageSeries = sampleTimes.map((_, index) => {
        const visibleValues = allAccountIds
          .map((accountId) => allSeriesMap.get(accountId)?.[index])
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
        if (visibleValues.length === 0) return null;
        const total = visibleValues.reduce((sum, value) => sum + value, 0);
        return round2(total / visibleValues.length);
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
          latestEquity: getLastVisibleCurveValue(
            allSeriesMap.get(row.arenaAccountId),
            comp.startingCapital + row.pnl,
          ),
          isMyAgent: row.arenaAccountId === myAgentAccountId,
        })),
        curvePoints: sampleTimes.map((timestamp, index) => ({
          timestamp,
          label: formatCurveLabel(timestamp),
          topAgents: topRows.map((row) => ({
            username: row.username,
            equity: allSeriesMap.get(row.arenaAccountId)?.[index] ?? null,
          })),
          myAgent: myAgentRow
            ? allSeriesMap.get(myAgentRow.arenaAccountId)?.[index] ?? null
            : null,
          average: averageSeries[index] ?? null,
        })),
        agentCurves: leaderboardRows.map((row) => ({
          username: row.username,
          rank: row.rank,
          pnlPct: row.pnlPct,
          latestEquity: getLastVisibleCurveValue(
            allSeriesMap.get(row.arenaAccountId),
            comp.startingCapital + row.pnl,
          ),
          values: allSeriesMap.get(row.arenaAccountId) ?? sampleTimes.map(() => null),
        })),
        chatMessages,
        myAgent: myAgentRow
          ? {
              rank: myAgentRow.rank,
              username: myAgentRow.username,
              pnlPct: myAgentRow.pnlPct,
              latestEquity: getLastVisibleCurveValue(
                allSeriesMap.get(myAgentRow.arenaAccountId),
                comp.startingCapital + myAgentRow.pnl,
              ),
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

      const rawLeaderboardRows = await buildLiveLeaderboardRows(comp);
      const myAgentAccountId = await getCurrentOwnedAgentAccountId(req);
      const currentTime = Math.min(Date.now(), comp.endTime);
      const participantIds = rawLeaderboardRows.map((row) => row.arenaAccountId);
      const currentEquityMap = new Map(
        rawLeaderboardRows.map((row) => [row.arenaAccountId, round2(comp.startingCapital + row.pnl)]),
      );
      const trades = comp.matchId && participantIds.length > 0
        ? await dbHelpers.getTradesForMatch(comp.matchId, participantIds)
        : [];
      const sampleTimes = buildSampleTimes(comp.startTime, comp.endTime);
      const baseSeriesMap = buildEquitySeriesForAccounts({
        accountIds: participantIds,
        sampleTimes,
        startingCapital: comp.startingCapital,
        trades,
        currentEquityMap,
        currentTime,
      });
      const showcase = buildSyntheticShowcase({
        competitionId: comp.id,
        sampleTimes,
        currentTime,
        startingCapital: comp.startingCapital,
        existingRows: normalizeShowcaseRows(rawLeaderboardRows),
        existingSeriesMap: baseSeriesMap,
        chatMessages: [],
      });
      const leaderboardRows = showcase.rows;
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
          description: comp.description ?? null,
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

  // ─── Duel Dashboard (Human vs AI) ─────────────────────────────
  app.get("/api/public/duel-dashboard", async (req: Request, res: Response) => {
    try {
      const pair = await compDb.getActiveDuelPair();
      if (pair.length < 2) {
        res.json({
          active: false,
          humanComp: null,
          aiComp: null,
          humanAvgCurve: [],
          aiAvgCurve: [],
          curveLabels: [],
          stats: null,
          humanTop10: [],
          aiTop10: [],
          chatMessages: [],
        });
        return;
      }

      const humanComp = pair.find(c => (c.participantMode ?? "human") === "human") ?? pair[0];
      const aiComp = pair.find(c => isAgentCompetition(c.participantMode)) ?? pair[1];

      // Build leaderboards for both sides
      const [humanRows, aiRows] = await Promise.all([
        buildLiveLeaderboardRows(humanComp),
        buildLiveLeaderboardRows(aiComp),
      ]);

      // Build equity curves for both sides
      const startTime = Math.min(humanComp.startTime, aiComp.startTime);
      const endTime = Math.max(humanComp.endTime, aiComp.endTime);
      const sampleTimes = buildSampleTimes(startTime, endTime);
      const currentTime = Math.min(Date.now(), endTime);

      const buildAvgCurve = async (
        comp: typeof humanComp,
        rows: RawLeaderboardRow[],
      ) => {
        if (!comp.matchId || rows.length === 0) return sampleTimes.map(() => null);
        const participantIds = rows.map(r => r.arenaAccountId);
        const currentEquityMap = new Map(
          rows.map(r => [r.arenaAccountId, round2(comp.startingCapital + r.pnl)]),
        );
        const trades = await dbHelpers.getTradesForMatch(comp.matchId, participantIds);
        const seriesMap = buildEquitySeriesForAccounts({
          accountIds: participantIds,
          sampleTimes,
          startingCapital: comp.startingCapital,
          trades,
          currentEquityMap,
          currentTime: Math.min(Date.now(), comp.endTime),
        });
        // Compute average across all participants at each sample point
        return sampleTimes.map((_, idx) => {
          const values = participantIds
            .map(id => seriesMap.get(id)?.[idx])
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
          if (values.length === 0) return null;
          return round2(values.reduce((s, v) => s + v, 0) / values.length);
        });
      };

      const [humanAvgCurve, aiAvgCurve] = await Promise.all([
        buildAvgCurve(humanComp, humanRows),
        buildAvgCurve(aiComp, aiRows),
      ]);

      // Compute comparison stats
      const computeGroupStats = async (
        comp: typeof humanComp,
        rows: RawLeaderboardRow[],
      ) => {
        if (!comp.matchId || rows.length === 0) {
          return { avgPnlPct: 0, avgTrades: 0, avgWinRate: 0, avgMaxDrawdown: 0, participantCount: 0 };
        }
        const participantIds = rows.map(r => r.arenaAccountId);
        const tradeStats = await dbHelpers.getTradeStatsForMatch(comp.matchId, participantIds);
        const statsMap = new Map(tradeStats.map(s => [s.arenaAccountId, s]));

        let totalPnlPct = 0;
        let totalTrades = 0;
        let totalWinRate = 0;
        let totalMaxDrawdown = 0;
        let countWithTrades = 0;

        for (const row of rows) {
          totalPnlPct += row.pnlPct;
          const ts = statsMap.get(row.arenaAccountId);
          if (ts && ts.tradeCount > 0) {
            totalTrades += ts.tradeCount;
            totalWinRate += ts.winCount / ts.tradeCount;
            countWithTrades++;
          }
          // Max drawdown approximation: use pnlPct if negative
          if (row.pnlPct < 0) totalMaxDrawdown += row.pnlPct;
        }

        const n = rows.length;
        return {
          avgPnlPct: round2(totalPnlPct / n),
          avgTrades: round2(totalTrades / n),
          avgWinRate: round2(countWithTrades > 0 ? (totalWinRate / countWithTrades) * 100 : 0),
          avgMaxDrawdown: round2(n > 0 ? totalMaxDrawdown / n : 0),
          participantCount: n,
        };
      };

      const [humanStats, aiStats] = await Promise.all([
        computeGroupStats(humanComp, humanRows),
        computeGroupStats(aiComp, aiRows),
      ]);

      // Get chat messages from both competitions merged
      const [humanChat, aiChat] = await Promise.all([
        dbHelpers.getRecentChatMessages(60, humanComp.id),
        dbHelpers.getRecentChatMessages(60, aiComp.id),
      ]);
      const mergedChat = [...humanChat, ...aiChat]
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-80);

      const mapCompInfo = (comp: typeof humanComp) => ({
        id: comp.id,
        slug: comp.slug,
        title: comp.title,
        symbol: comp.symbol,
        prizePool: comp.prizePool,
        startTime: comp.startTime,
        endTime: comp.endTime,
        status: comp.status,
        participantMode: comp.participantMode ?? "human",
        startingCapital: comp.startingCapital,
      });

      const humanTop10 = humanRows.slice(0, 10).map(r => ({
        rank: r.rank,
        username: r.username,
        pnlPct: r.pnlPct,
        pnl: r.pnl,
        matchPoints: r.matchPoints,
        rankTier: r.rankTier,
      }));

      const aiTop10 = aiRows.slice(0, 10).map(r => ({
        rank: r.rank,
        username: r.username,
        pnlPct: r.pnlPct,
        pnl: r.pnl,
        matchPoints: r.matchPoints,
        rankTier: r.rankTier,
      }));

      res.json({
        active: true,
        humanComp: mapCompInfo(humanComp),
        aiComp: mapCompInfo(aiComp),
        humanAvgCurve,
        aiAvgCurve,
        curveLabels: sampleTimes.map(t => formatCurveLabel(t)),
        curveTimestamps: sampleTimes,
        stats: {
          human: humanStats,
          ai: aiStats,
        },
        humanTop10,
        aiTop10,
        chatMessages: mergedChat,
        refreshedAt: Date.now(),
      });
    } catch (error) {
      console.error("[duel-dashboard] Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Duel chat post endpoint
  app.post("/api/public/duel-chat", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0 || message.length > 500) {
      res.status(400).json({ error: "Invalid message" });
      return;
    }
    try {
      // Find which duel competition this user belongs to
      const pair = await compDb.getActiveDuelPair();
      let competitionId: number | null = null;
      if (pair.length >= 2) {
        // Check if user is registered in either competition
        for (const comp of pair) {
          const acceptedIds = await compDb.getAcceptedAccountIds(comp.id);
          if (acceptedIds.includes(account.id)) {
            competitionId = comp.id;
            break;
          }
        }
        // If not registered in either, use the human competition as default
        if (competitionId === null) {
          competitionId = pair[0].id;
        }
      }
      await arenaEngine.sendChatMessage(account.id, message.trim(), competitionId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
}
