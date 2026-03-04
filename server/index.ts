/**
 * server/index.ts — Arena REST API routes
 */

import type { Express, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { ArenaEngine } from "./engine";
import { MarketService } from "./market";
import * as dbHelpers from "./db";

const loginSchema = z.object({
  inviteCode: z.string().trim().min(4).max(32),
  username: z.string().trim().min(2).max(20),
  password: z.string().min(4).max(128),
});

const quickLoginSchema = z.object({
  username: z.string().trim().min(2).max(20),
  password: z.string().min(1).max(128),
});

const openSchema = z.object({
  direction: z.enum(["long", "short"]),
  size: z.number().positive(),
  tp: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
});

const tpslSchema = z.object({
  tp: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(280),
});

const eventSchema = z.object({
  type: z.string().trim().min(1).max(64),
  payload: z.unknown().optional(),
  source: z.string().trim().max(32).optional(),
});

const predictionSchema = z.object({
  direction: z.enum(["up", "down"]),
  confidence: z.number().int().min(1).max(5).default(3),
});

function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

// Singleton engine instance
let engineInstance: ArenaEngine | null = null;

export async function registerArenaRoutes(app: Express) {
  const market = new MarketService();
  await market.start();
  const engine = new ArenaEngine(market);
  await engine.init();
  engineInstance = engine;

  // Tick every second for TP/SL, match rotation, and prediction resolution
  const tickTimer = setInterval(async () => {
    try {
      await engine.tick();
    } catch (error) {
      console.error("[engine.tick]", error);
    }
  }, 1000);

  // Cleanup job: run every hour
  const cleanupTimer = setInterval(async () => {
    try {
      await dbHelpers.cleanupExpiredSessions();
      await dbHelpers.cleanupOldBehaviorEvents();
      await dbHelpers.cleanupOldChatMessages();
    } catch (error) {
      console.error("[cleanup]", error);
    }
  }, 60 * 60 * 1000);

  // Graceful shutdown
  const shutdown = () => {
    console.log("[server] Shutting down gracefully...");
    clearInterval(tickTimer);
    clearInterval(cleanupTimer);
    market.stop();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Trust proxy (behind reverse proxy in production)
  app.set('trust proxy', 1);

  // Rate limiters
  const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Too many login attempts, try again later" } });
  const tradeLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: "Too many trade requests, slow down" } });
  const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: "Too many messages, slow down" } });
  const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, message: { error: "Too many requests" } });

  app.use("/api/auth/", authLimiter);
  app.use("/api/arena/trade/", tradeLimiter);
  app.use("/api/trade/", tradeLimiter);
  app.use("/api/arena/chat", chatLimiter);
  app.use("/api/chat", chatLimiter);
  app.use("/api/", generalLimiter);

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // Arena login — ID-based with invite code + username
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid invite code or username" });
      return;
    }
    try {
      const result = await engine.login(parsed.data.inviteCode, parsed.data.username, parsed.data.password);
      res.json({ token: result.token, user: { id: result.account.id, username: result.account.username } });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Quick login — returning user by username only
  app.post("/api/auth/quick-login", async (req: Request, res: Response) => {
    const parsed = quickLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid username" });
      return;
    }
    try {
      const result = await engine.loginByUsername(parsed.data.username, parsed.data.password);
      res.json({ token: result.token, user: { id: result.account.id, username: result.account.username } });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Public endpoints (no auth required)
  app.get("/api/public/summary", async (_req: Request, res: Response) => {
    try {
      res.json(await engine.getPublicSummary());
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/public/leaderboard", async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit ?? 50);
      res.json(await engine.getPublicLeaderboard(Number.isFinite(limit) ? limit : 50));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Arena auth middleware — checks Bearer token for arena-specific endpoints
  const arenaAuth = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/auth/") || req.path.startsWith("/api/public/") || req.path === "/api/health") {
      next();
      return;
    }
    if (!req.path.startsWith("/api/arena/")) {
      next();
      return;
    }
    const token = getAuthToken(req);
    try {
      const account = await engine.getAccountByToken(token);
      if (!account) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      (req as any).arenaAccountId = account.id;
      (req as any).arenaUsername = account.username;
      next();
    } catch (error) {
      console.error("[arenaAuth] DB error:", (error as Error).message);
      res.status(503).json({ error: "Service temporarily unavailable" });
    }
  };

  app.use(arenaAuth);

  // ─── Arena endpoints (require arena token) ─────────────────────────────────

  app.get("/api/arena/state", async (req: Request, res: Response) => {
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      res.json(await engine.getStateForUser(arenaAccountId));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/arena/trade/open", async (req: Request, res: Response) => {
    const parsed = openSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid open payload" });
      return;
    }
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      await engine.openPosition(arenaAccountId, parsed.data);
      await engine.recordBehaviorEvent(arenaAccountId, "order_open", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/arena/trade/close", async (req: Request, res: Response) => {
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      const tradeId = await engine.closePosition(arenaAccountId);
      await engine.recordBehaviorEvent(arenaAccountId, "order_close", { tradeId });
      res.json({ ok: true, tradeId });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/arena/trade/tpsl", async (req: Request, res: Response) => {
    const parsed = tpslSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid TP/SL payload" });
      return;
    }
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      await engine.setTpSl(arenaAccountId, parsed.data);
      await engine.recordBehaviorEvent(arenaAccountId, "set_tpsl", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/arena/chat", async (req: Request, res: Response) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid message" });
      return;
    }
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      await engine.sendChatMessage(arenaAccountId, parsed.data.message);
      await engine.recordBehaviorEvent(arenaAccountId, "chat_send", { length: parsed.data.message.length });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/arena/events", async (req: Request, res: Response) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid event payload" });
      return;
    }
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      await engine.recordBehaviorEvent(
        arenaAccountId,
        parsed.data.type,
        parsed.data.payload,
        parsed.data.source ?? "client",
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/arena/prediction", async (req: Request, res: Response) => {
    const parsed = predictionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid prediction payload" });
      return;
    }
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      await engine.submitPrediction(arenaAccountId, parsed.data.direction, parsed.data.confidence);
      await engine.recordBehaviorEvent(arenaAccountId, "prediction_submit", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  const pollSchema = z.object({
    direction: z.enum(["long", "short", "neutral"]),
  });

  app.post("/api/arena/poll", async (req: Request, res: Response) => {
    const parsed = pollSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid poll payload" });
      return;
    }
    try {
      const arenaAccountId = (req as any).arenaAccountId as number;
      await engine.submitPollVote(arenaAccountId, parsed.data.direction);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // ─── Legacy API compatibility ──────────────────────────────────────────────

  app.get("/api/state", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    try {
      const account = await engine.getAccountByToken(token);
      if (!account) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      res.json(await engine.getStateForUser(account.id));
    } catch (error) {
      console.error("[/api/state]", (error as Error).message);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/trade/open", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    let account;
    try {
      account = await engine.getAccountByToken(token);
    } catch (error) {
      console.error("[/api/trade/open] auth error:", (error as Error).message);
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = openSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid open payload" });
      return;
    }
    try {
      await engine.openPosition(account.id, parsed.data);
      await engine.recordBehaviorEvent(account.id, "order_open", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/trade/close", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    let account;
    try {
      account = await engine.getAccountByToken(token);
    } catch (error) {
      console.error("[/api/trade/close] auth error:", (error as Error).message);
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const tradeId = await engine.closePosition(account.id);
      await engine.recordBehaviorEvent(account.id, "order_close", { tradeId });
      res.json({ ok: true, tradeId });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/trade/tpsl", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    let account;
    try {
      account = await engine.getAccountByToken(token);
    } catch (error) {
      console.error("[/api/trade/tpsl] auth error:", (error as Error).message);
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = tpslSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid TP/SL payload" });
      return;
    }
    try {
      await engine.setTpSl(account.id, parsed.data);
      await engine.recordBehaviorEvent(account.id, "set_tpsl", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    let account;
    try {
      account = await engine.getAccountByToken(token);
    } catch (error) {
      console.error("[/api/chat] auth error:", (error as Error).message);
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid message" });
      return;
    }
    try {
      await engine.sendChatMessage(account.id, parsed.data.message);
      await engine.recordBehaviorEvent(account.id, "chat_send", { length: parsed.data.message.length });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/events", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    let account;
    try {
      account = await engine.getAccountByToken(token);
    } catch (error) {
      console.error("[/api/events] auth error:", (error as Error).message);
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid event payload" });
      return;
    }
    try {
      await engine.recordBehaviorEvent(
        account.id,
        parsed.data.type,
        parsed.data.payload,
        parsed.data.source ?? "client",
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/prediction", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    let account;
    try {
      account = await engine.getAccountByToken(token);
    } catch (error) {
      console.error("[/api/prediction] auth error:", (error as Error).message);
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = predictionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid prediction payload" });
      return;
    }
    try {
      await engine.submitPrediction(account.id, parsed.data.direction, parsed.data.confidence);
      await engine.recordBehaviorEvent(account.id, "prediction_submit", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
}
