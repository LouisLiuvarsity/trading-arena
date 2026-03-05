/**
 * server/competition-routes.ts — REST API routes for the competition system
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { CompetitionEngine } from "./competition-engine";
import type { ArenaEngine } from "./engine";
import * as compDb from "./competition-db";

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
  maxParticipants: z.number().int().positive().default(50),
  minParticipants: z.number().int().positive().default(5),
  registrationOpenAt: z.number().positive().optional(),
  registrationCloseAt: z.number().positive().optional(),
  startTime: z.number().positive(),
  endTime: z.number().positive(),
  symbol: z.string().regex(/^[A-Z]{2,10}USDT$/).default("SOLUSDT"),
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
  status: z.enum(["announced", "registration_open", "registration_closed", "live", "cancelled"]),
});

const reviewSchema = z.object({
  decision: z.enum(["accepted", "rejected", "waitlisted"]),
});

const batchReviewSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
  ids: z.array(z.number().positive()),
});

// ─── Route Registration ─────────────────────────────────────

export function registerCompetitionRoutes(
  app: Express,
  engine: CompetitionEngine,
  arenaEngine: ArenaEngine,
) {
  // ─── Public Endpoints ───────────────────────────────────────

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
          myRegistrationStatus: myStatus,
        });
      }
      res.json({ items, total: items.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Get competition detail */
  app.get("/api/competitions/:slug", async (req: Request, res: Response) => {
    try {
      const comp = await compDb.getCompetitionBySlug(req.params.slug);
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
        inviteOnly: !!comp.inviteOnly,
        myRegistration: myReg,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** Competition leaderboard */
  app.get("/api/competitions/:slug/leaderboard", async (req: Request, res: Response) => {
    try {
      const comp = await compDb.getCompetitionBySlug(req.params.slug);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }

      if (comp.status === "completed") {
        // Return persisted results
        const results = await compDb.getMatchResultsForCompetition(comp.id);
        res.json(results.map((r) => ({
          rank: r.finalRank,
          username: "", // TODO: join
          pnl: r.totalPnl,
          pnlPct: r.totalPnlPct,
          weightedPnl: r.totalWeightedPnl,
          pointsEarned: r.pointsEarned,
          prizeWon: r.prizeWon,
        })));
      } else if (comp.status === "live" && comp.matchId) {
        // Return real-time leaderboard for this competition's match
        const lb = (await arenaEngine.buildLeaderboard(comp.matchId)).slice(0, 100).map((row) => ({
          rank: row.rank,
          username: row.username,
          pnlPct: row.pnlPct,
          pnl: row.pnl,
          weightedPnl: row.weightedPnl,
          matchPoints: row.matchPoints,
          prizeEligible: row.prizeEligible,
          prizeAmount: row.prizeAmount,
          rankTier: row.rankTier,
          isBot: false,
        }));
        res.json(lb);
      } else {
        res.json([]);
      }
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
