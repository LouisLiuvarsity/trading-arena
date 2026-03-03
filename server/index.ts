import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createDatabase } from "./db.js";
import { ArenaEngine } from "./engine.js";
import { MarketService } from "./market.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loginSchema = z.object({
  username: z.string().trim().min(2).max(20),
});

const openSchema = z.object({
  direction: z.enum(["long", "short"]),
  size: z.number().positive(),
  tp: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
});

const tpslSchema = z.object({
  tp: z.number().positive().nullable(),
  sl: z.number().positive().nullable(),
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(280),
});

const eventSchema = z.object({
  type: z.string().trim().min(1).max(64),
  payload: z.unknown().optional(),
  source: z.string().trim().max(32).optional(),
});

function getAuthToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "1mb" }));

  const db = createDatabase();
  const market = new MarketService();
  await market.start();
  const engine = new ArenaEngine(db, market);

  setInterval(() => {
    try {
      engine.tick();
    } catch (error) {
      // Keep scheduler alive; errors are visible in logs.
      console.error("[engine.tick]", error);
    }
  }, 1000);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.post("/api/auth/login", (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid username" });
      return;
    }
    try {
      const result = engine.login(parsed.data.username);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/public/summary", (_req, res) => {
    res.json(engine.getPublicSummary());
  });

  app.get("/api/public/leaderboard", (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    res.json(engine.getPublicLeaderboard(Number.isFinite(limit) ? limit : 50));
  });

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth/") || req.path.startsWith("/public/") || req.path === "/health") {
      next();
      return;
    }
    const token = getAuthToken(req);
    const user = engine.getUserByToken(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as express.Request & { userId: number }).userId = user.id;
    (req as express.Request & { username: string }).username = user.username;
    next();
  });

  app.get("/api/state", (req, res) => {
    try {
      const userId = (req as express.Request & { userId: number }).userId;
      res.json(engine.getStateForUser(userId));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/trade/open", (req, res) => {
    const parsed = openSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid open payload" });
      return;
    }
    try {
      const userId = (req as express.Request & { userId: number }).userId;
      engine.openPosition(userId, parsed.data);
      engine.recordBehaviorEvent(userId, "order_open", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/trade/close", (req, res) => {
    try {
      const userId = (req as express.Request & { userId: number }).userId;
      const tradeId = engine.closePosition(userId);
      engine.recordBehaviorEvent(userId, "order_close", { tradeId });
      res.json({ ok: true, tradeId });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/trade/tpsl", (req, res) => {
    const parsed = tpslSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid TP/SL payload" });
      return;
    }
    try {
      const userId = (req as express.Request & { userId: number }).userId;
      engine.setTpSl(userId, parsed.data);
      engine.recordBehaviorEvent(userId, "set_tpsl", parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/chat", (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid message" });
      return;
    }
    try {
      const userId = (req as express.Request & { userId: number }).userId;
      engine.sendChatMessage(userId, parsed.data.message);
      engine.recordBehaviorEvent(userId, "chat_send", { length: parsed.data.message.length });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/events", (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid event payload" });
      return;
    }
    try {
      const userId = (req as express.Request & { userId: number }).userId;
      engine.recordBehaviorEvent(userId, parsed.data.type, parsed.data.payload, parsed.data.source ?? "client");
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
