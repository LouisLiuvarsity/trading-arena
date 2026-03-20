import type { Express, Request, Response } from "express";

/**
 * Spectator social features:
 * 1. Viewer count tracking (heartbeat-based, in-memory)
 * 2. Emoji reactions (in-memory ring buffer)
 *
 * All endpoints are public (under /api/public/) — no auth required.
 */

// ─── In-memory viewer tracking ──────────────────────────────────────────────

/** Map<competitionId, Map<viewerId, lastHeartbeatTimestamp>> */
const viewerHeartbeats = new Map<number, Map<string, number>>();

/** How long before a viewer is considered "gone" (ms) */
const VIEWER_TIMEOUT_MS = 45_000; // 45 seconds

function getOrCreateViewerMap(competitionId: number): Map<string, number> {
  let map = viewerHeartbeats.get(competitionId);
  if (!map) {
    map = new Map();
    viewerHeartbeats.set(competitionId, map);
  }
  return map;
}

function pruneStaleViewers(map: Map<string, number>): void {
  const cutoff = Date.now() - VIEWER_TIMEOUT_MS;
  for (const [id, ts] of Array.from(map.entries())) {
    if (ts < cutoff) map.delete(id);
  }
}

function getViewerCount(competitionId: number): number {
  const map = viewerHeartbeats.get(competitionId);
  if (!map) return 0;
  pruneStaleViewers(map);
  return map.size;
}

// ─── In-memory emoji reactions ──────────────────────────────────────────────

interface EmojiReaction {
  emoji: string;
  viewerId: string;
  timestamp: number;
}

/** Map<competitionId, EmojiReaction[]> — ring buffer, max 200 per competition */
const reactionBuffers = new Map<number, EmojiReaction[]>();
const MAX_REACTIONS = 200;

/** Allowed emojis — prevents abuse */
const ALLOWED_EMOJIS = new Set([
  "🔥", "🚀", "📉", "💀", "😱", "🎯", "💰", "📈", "🤖", "⚡", "👀", "🏆",
]);

function getOrCreateReactionBuffer(competitionId: number): EmojiReaction[] {
  let buf = reactionBuffers.get(competitionId);
  if (!buf) {
    buf = [];
    reactionBuffers.set(competitionId, buf);
  }
  return buf;
}

// ─── Periodic cleanup of old competition data ───────────────────────────────

setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h
  for (const [compId, buf] of Array.from(reactionBuffers.entries())) {
    if (buf.length > 0 && buf[buf.length - 1].timestamp < cutoff) {
      reactionBuffers.delete(compId);
    }
  }
  for (const [compId, map] of Array.from(viewerHeartbeats.entries())) {
    pruneStaleViewers(map);
    if (map.size === 0) viewerHeartbeats.delete(compId);
  }
}, 5 * 60 * 1000); // every 5 min

// ─── Route registration ─────────────────────────────────────────────────────

export function registerSpectatorRoutes(app: Express): void {
  /**
   * POST /api/public/spectator/heartbeat
   * Body: { competitionId: number, viewerId: string }
   * Response: { viewerCount: number }
   *
   * Frontend calls this every 20s to keep the viewer "alive".
   * viewerId is a random UUID generated client-side and stored in sessionStorage.
   */
  app.post("/api/public/spectator/heartbeat", (req: Request, res: Response) => {
    const { competitionId, viewerId } = req.body ?? {};
    if (!competitionId || !viewerId) {
      res.status(400).json({ error: "competitionId and viewerId required" });
      return;
    }
    const map = getOrCreateViewerMap(Number(competitionId));
    map.set(String(viewerId), Date.now());
    pruneStaleViewers(map);
    res.json({ viewerCount: map.size });
  });

  /**
   * GET /api/public/spectator/viewers?competitionId=123
   * Response: { viewerCount: number }
   */
  app.get("/api/public/spectator/viewers", (req: Request, res: Response) => {
    const competitionId = Number(req.query.competitionId);
    if (!competitionId) {
      res.status(400).json({ error: "competitionId required" });
      return;
    }
    res.json({ viewerCount: getViewerCount(competitionId) });
  });

  /**
   * POST /api/public/spectator/react
   * Body: { competitionId: number, viewerId: string, emoji: string }
   * Response: { ok: true }
   *
   * Rate-limited: max 1 reaction per viewerId per 2 seconds (enforced server-side).
   */
  const lastReactionTime = new Map<string, number>();

  app.post("/api/public/spectator/react", (req: Request, res: Response) => {
    const { competitionId, viewerId, emoji } = req.body ?? {};
    if (!competitionId || !viewerId || !emoji) {
      res.status(400).json({ error: "competitionId, viewerId, and emoji required" });
      return;
    }
    if (!ALLOWED_EMOJIS.has(emoji)) {
      res.status(400).json({ error: "Invalid emoji" });
      return;
    }

    // Rate limit: 1 per 2s per viewer
    const rateKey = `${competitionId}:${viewerId}`;
    const now = Date.now();
    const lastTime = lastReactionTime.get(rateKey) ?? 0;
    if (now - lastTime < 2000) {
      res.status(429).json({ error: "Too fast, wait a moment" });
      return;
    }
    lastReactionTime.set(rateKey, now);

    // Clean old rate-limit entries periodically
    if (lastReactionTime.size > 10000) {
      const cutoff = now - 10000;
      for (const [key, ts] of Array.from(lastReactionTime.entries())) {
        if (ts < cutoff) lastReactionTime.delete(key);
      }
    }

    const buf = getOrCreateReactionBuffer(Number(competitionId));
    buf.push({ emoji, viewerId: String(viewerId), timestamp: now });
    // Keep ring buffer bounded
    if (buf.length > MAX_REACTIONS) {
      buf.splice(0, buf.length - MAX_REACTIONS);
    }

    res.json({ ok: true });
  });

  /**
   * GET /api/public/spectator/reactions?competitionId=123&since=1711234567890
   * Response: { reactions: Array<{ emoji, timestamp }> }
   *
   * Returns reactions since the given timestamp (or last 50 if no `since`).
   */
  app.get("/api/public/spectator/reactions", (req: Request, res: Response) => {
    const competitionId = Number(req.query.competitionId);
    if (!competitionId) {
      res.status(400).json({ error: "competitionId required" });
      return;
    }
    const since = Number(req.query.since) || 0;
    const buf = reactionBuffers.get(competitionId) ?? [];

    let results: Array<{ emoji: string; timestamp: number }>;
    if (since > 0) {
      results = buf
        .filter((r) => r.timestamp > since)
        .map((r) => ({ emoji: r.emoji, timestamp: r.timestamp }));
    } else {
      results = buf
        .slice(-50)
        .map((r) => ({ emoji: r.emoji, timestamp: r.timestamp }));
    }

    res.json({ reactions: results });
  });
}
