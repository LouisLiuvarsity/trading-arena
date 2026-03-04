/**
 * server/db.ts — Database helpers
 *
 * All helpers accept an optional last parameter `dbOrTx` to support
 * running inside a MySQL transaction. Defaults to the module-level `db`.
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users,
  arenaAccounts,
  arenaSessions,
  matches,
  positions,
  trades,
  chatMessages,
  behaviorEvents,
  predictions,
  type User,
} from "../drizzle/schema";
import { MATCH_DURATION_MS, STARTING_CAPITAL } from "./constants";

// ─── Drizzle DB Connection ───────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = mysql.createPool({
  uri: connectionString,
  waitForConnections: true,
  connectionLimit: 15,
  ssl: { rejectUnauthorized: true },
});

export const db = drizzle(pool);

/** Type alias: either the root db or a transaction handle.
 *  Drizzle transaction objects have the same query API as db, so we use `any`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbOrTx = any;

// ─── Auth Helpers (required by _core/sdk.ts and _core/oauth.ts) ──────────────

export async function getUserByOpenId(openId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertUser(input: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}): Promise<void> {
  const existing = await getUserByOpenId(input.openId);
  if (existing) {
    await db
      .update(users)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.loginMethod !== undefined ? { loginMethod: input.loginMethod } : {}),
        ...(input.lastSignedIn !== undefined ? { lastSignedIn: input.lastSignedIn } : {}),
      })
      .where(eq(users.openId, input.openId));
  } else {
    await db.insert(users).values({
      openId: input.openId,
      name: input.name ?? null,
      email: input.email ?? null,
      loginMethod: input.loginMethod ?? null,
      lastSignedIn: input.lastSignedIn ?? new Date(),
    });
  }
}

// ─── Arena Helpers ───────────────────────────────────────────────────────────

export async function getOrCreateArenaAccount(
  userId: number,
  username: string,
): Promise<{ id: number; username: string; capital: number; seasonPoints: number }> {
  const existing = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.userId, userId))
    .limit(1);
  if (existing[0]) {
    return {
      id: existing[0].id,
      username: existing[0].username,
      capital: existing[0].capital,
      seasonPoints: existing[0].seasonPoints,
    };
  }
  const now = Date.now();
  const result = await db.insert(arenaAccounts).values({
    userId,
    username,
    inviteCode: username, // legacy fallback
    capital: STARTING_CAPITAL,
    seasonPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  const insertId = Number(result[0].insertId);
  return { id: insertId, username, capital: STARTING_CAPITAL, seasonPoints: 0 };
}

/** Lookup or create arena account by invite code (first-time registration) */
export async function getOrCreateArenaAccountByCode(
  inviteCode: string,
  username: string,
): Promise<{ id: number; username: string; capital: number; seasonPoints: number }> {
  // Check if account exists with this invite code
  const existing = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.inviteCode, inviteCode))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      username: existing[0].username,
      capital: existing[0].capital,
      seasonPoints: existing[0].seasonPoints,
    };
  }

  // Check username uniqueness
  const usernameCheck = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.username, username))
    .limit(1);
  if (usernameCheck[0]) {
    throw new Error("Username already taken");
  }

  const now = Date.now();
  const result = await db.insert(arenaAccounts).values({
    userId: 0,
    username,
    inviteCode,
    capital: STARTING_CAPITAL,
    seasonPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  const insertId = Number(result[0].insertId);
  return { id: insertId, username, capital: STARTING_CAPITAL, seasonPoints: 0 };
}

/** Login existing account by username (returning users) */
export async function getArenaAccountByUsernameForLogin(
  username: string,
): Promise<{ id: number; username: string; capital: number; seasonPoints: number } | null> {
  const rows = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.username, username))
    .limit(1);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    username: rows[0].username,
    capital: rows[0].capital,
    seasonPoints: rows[0].seasonPoints,
  };
}

export async function getArenaAccountById(
  arenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<{ id: number; userId: number; username: string; capital: number; seasonPoints: number } | null> {
  const rows = await dbOrTx
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.id, arenaAccountId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getArenaAccountByUsername(
  username: string,
): Promise<{ id: number; userId: number; username: string; capital: number; seasonPoints: number } | null> {
  const rows = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function createArenaSession(arenaAccountId: number, token: string): Promise<void> {
  const now = Date.now();
  await db.insert(arenaSessions).values({
    token,
    arenaAccountId,
    createdAt: now,
    lastSeen: now,
  });
}

export async function getArenaAccountByToken(
  token: string,
): Promise<{ id: number; userId: number; username: string; capital: number; seasonPoints: number } | null> {
  const rows = await db
    .select({
      id: arenaAccounts.id,
      userId: arenaAccounts.userId,
      username: arenaAccounts.username,
      capital: arenaAccounts.capital,
      seasonPoints: arenaAccounts.seasonPoints,
    })
    .from(arenaSessions)
    .innerJoin(arenaAccounts, eq(arenaSessions.arenaAccountId, arenaAccounts.id))
    .where(eq(arenaSessions.token, token))
    .limit(1);
  if (rows[0]) {
    await db
      .update(arenaSessions)
      .set({ lastSeen: Date.now() })
      .where(eq(arenaSessions.token, token));
  }
  return rows[0] ?? null;
}

export async function getActiveMatch(
  dbOrTx: DbOrTx = db,
): Promise<{
  id: number;
  matchNumber: number;
  startTime: number;
  endTime: number;
} | null> {
  const rows = await dbOrTx
    .select()
    .from(matches)
    .where(eq(matches.status, "active"))
    .orderBy(desc(matches.id))
    .limit(1);
  return rows[0]
    ? { id: rows[0].id, matchNumber: rows[0].matchNumber, startTime: rows[0].startTime, endTime: rows[0].endTime }
    : null;
}

export async function createMatch(
  matchNumber: number,
  startTime: number,
  endTime: number,
  dbOrTx: DbOrTx = db,
): Promise<number> {
  const result = await dbOrTx.insert(matches).values({
    matchNumber,
    matchType: "regular",
    startTime,
    endTime,
    status: "active",
  });
  return Number(result[0].insertId);
}

export async function completeMatch(matchId: number, dbOrTx: DbOrTx = db): Promise<void> {
  await dbOrTx.update(matches).set({ status: "completed" }).where(eq(matches.id, matchId));
}

export async function getPosition(
  arenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<{
  id: number;
  arenaAccountId: number;
  direction: string;
  size: number;
  entryPrice: number;
  openTime: number;
  takeProfit: number | null;
  stopLoss: number | null;
  tradeNumber: number;
} | null> {
  const rows = await dbOrTx
    .select()
    .from(positions)
    .where(eq(positions.arenaAccountId, arenaAccountId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllPositions(
  dbOrTx: DbOrTx = db,
): Promise<
  Array<{
    id: number;
    arenaAccountId: number;
    direction: string;
    size: number;
    entryPrice: number;
    openTime: number;
    takeProfit: number | null;
    stopLoss: number | null;
    tradeNumber: number;
  }>
> {
  return dbOrTx.select().from(positions);
}

export async function insertPosition(
  input: {
    arenaAccountId: number;
    direction: string;
    size: number;
    entryPrice: number;
    openTime: number;
    takeProfit: number | null;
    stopLoss: number | null;
    tradeNumber: number;
  },
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx.insert(positions).values({
    ...input,
    updatedAt: Date.now(),
  });
}

export async function updatePositionTpSl(
  arenaAccountId: number,
  tp: number | null,
  sl: number | null,
): Promise<void> {
  await db
    .update(positions)
    .set({ takeProfit: tp, stopLoss: sl, updatedAt: Date.now() })
    .where(eq(positions.arenaAccountId, arenaAccountId));
}

export async function deletePosition(arenaAccountId: number, dbOrTx: DbOrTx = db): Promise<void> {
  await dbOrTx.delete(positions).where(eq(positions.arenaAccountId, arenaAccountId));
}

export async function insertTrade(
  input: {
    id: string;
    arenaAccountId: number;
    matchId: number;
    direction: string;
    size: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPct: number;
    fee: number;
    weightedPnl: number;
    holdDuration: number;
    holdWeight: number;
    closeReason: string;
    openTime: number;
    closeTime: number;
  },
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx.insert(trades).values(input);
}

export async function getTradesForUserMatch(
  arenaAccountId: number,
  matchId: number,
): Promise<
  Array<{
    id: string;
    direction: string;
    size: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPct: number;
    fee: number;
    weightedPnl: number;
    holdDuration: number;
    holdWeight: number;
    closeReason: string;
    openTime: number;
    closeTime: number;
  }>
> {
  return db
    .select({
      id: trades.id,
      direction: trades.direction,
      size: trades.size,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      pnl: trades.pnl,
      pnlPct: trades.pnlPct,
      fee: trades.fee,
      weightedPnl: trades.weightedPnl,
      holdDuration: trades.holdDuration,
      holdWeight: trades.holdWeight,
      closeReason: trades.closeReason,
      openTime: trades.openTime,
      closeTime: trades.closeTime,
    })
    .from(trades)
    .where(and(eq(trades.arenaAccountId, arenaAccountId), eq(trades.matchId, matchId)))
    .orderBy(desc(trades.closeTime))
    .limit(200);
}

export async function getTradeCountForUserMatch(
  arenaAccountId: number,
  matchId: number,
  dbOrTx: DbOrTx = db,
): Promise<number> {
  const rows = await dbOrTx
    .select({ count: sql<number>`COUNT(*)` })
    .from(trades)
    .where(and(eq(trades.arenaAccountId, arenaAccountId), eq(trades.matchId, matchId)));
  return rows[0]?.count ?? 0;
}

export async function getTradeAggregatesForMatch(
  matchId: number,
): Promise<
  Array<{
    arenaAccountId: number;
    pnl: number;
    weighted: number;
    trades: number;
  }>
> {
  const rows = await db
    .select({
      arenaAccountId: trades.arenaAccountId,
      pnl: sql<number>`COALESCE(SUM(${trades.pnl}), 0)`,
      weighted: sql<number>`COALESCE(SUM(${trades.weightedPnl}), 0)`,
      trades: sql<number>`COUNT(*)`,
    })
    .from(trades)
    .where(eq(trades.matchId, matchId))
    .groupBy(trades.arenaAccountId);
  return rows;
}

export async function getRealizedPnlForUserMatch(
  arenaAccountId: number,
  matchId: number,
): Promise<{ pnl: number; weighted: number }> {
  const rows = await db
    .select({
      pnl: sql<number>`COALESCE(SUM(${trades.pnl}), 0)`,
      weighted: sql<number>`COALESCE(SUM(${trades.weightedPnl}), 0)`,
    })
    .from(trades)
    .where(and(eq(trades.arenaAccountId, arenaAccountId), eq(trades.matchId, matchId)));
  return rows[0] ?? { pnl: 0, weighted: 0 };
}

export async function getAllArenaAccountsWithCapital(): Promise<
  Array<{ id: number; userId: number; username: string; capital: number; seasonPoints: number }>
> {
  return db.select().from(arenaAccounts);
}



export async function updateSeasonPoints(
  arenaAccountId: number,
  additionalPoints: number,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(arenaAccounts)
    .set({
      seasonPoints: sql`${arenaAccounts.seasonPoints} + ${additionalPoints}`,
      updatedAt: Date.now(),
    })
    .where(eq(arenaAccounts.id, arenaAccountId));
}

export async function insertChatMessage(input: {
  id: string;
  arenaAccountId: number;
  username: string;
  message: string;
  type: string;
  timestamp: number;
}): Promise<void> {
  await db.insert(chatMessages).values(input);
}

export async function getRecentChatMessages(
  limit: number = 120,
): Promise<
  Array<{
    id: string;
    username: string;
    message: string;
    timestamp: number;
    type: string;
  }>
> {
  const rows = await db
    .select({
      id: chatMessages.id,
      username: chatMessages.username,
      message: chatMessages.message,
      timestamp: chatMessages.timestamp,
      type: chatMessages.type,
    })
    .from(chatMessages)
    .orderBy(desc(chatMessages.timestamp))
    .limit(limit);
  return rows.reverse();
}

export async function insertBehaviorEvent(input: {
  arenaAccountId: number | null;
  eventType: string;
  payload: string;
  source: string;
  timestamp: number;
}): Promise<void> {
  await db.insert(behaviorEvents).values(input);
}

export async function getPositionCountByDirection(): Promise<{ long: number; short: number }> {
  const rows = await db
    .select({
      direction: positions.direction,
      count: sql<number>`COUNT(*)`,
    })
    .from(positions)
    .groupBy(positions.direction);
  let long = 0;
  let short = 0;
  for (const row of rows) {
    if (row.direction === "long") long = row.count;
    if (row.direction === "short") short = row.count;
  }
  return { long, short };
}

export async function getRecentTradeVolume(matchId: number, lookbackMs: number): Promise<number> {
  const cutoff = Date.now() - lookbackMs;
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(trades)
    .where(and(eq(trades.matchId, matchId), sql`${trades.closeTime} >= ${cutoff}`));
  return rows[0]?.count ?? 0;
}

export async function getDirectionConsistency(arenaAccountId: number, matchId: number): Promise<number> {
  const rows = await db
    .select({ direction: trades.direction })
    .from(trades)
    .where(and(eq(trades.arenaAccountId, arenaAccountId), eq(trades.matchId, matchId)))
    .orderBy(desc(trades.closeTime))
    .limit(30);
  if (rows.length === 0) return 0;
  const longCount = rows.filter((r: { direction: string }) => r.direction === "long").length;
  const shortCount = rows.length - longCount;
  return Math.round((Math.max(longCount, shortCount) / rows.length) * 100) / 100;
}

export async function getAvgHoldWeightForUser(arenaAccountId: number): Promise<number> {
  const rows = await db
    .select({
      avg: sql<number>`COALESCE(AVG(${trades.holdWeight}), 0)`,
    })
    .from(trades)
    .where(eq(trades.arenaAccountId, arenaAccountId));
  return rows[0]?.avg ?? 0;
}

export async function getPollVoteAggregation(
  lookbackMs: number = 60 * 60 * 1000,
): Promise<{ long: number; short: number; neutral: number }> {
  const cutoff = Date.now() - lookbackMs;
  const rows = await db
    .select({
      direction: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${behaviorEvents.payload}, '$.direction'))`,
      count: sql<number>`COUNT(*)`,
    })
    .from(behaviorEvents)
    .where(
      and(
        eq(behaviorEvents.eventType, "poll_vote"),
        sql`${behaviorEvents.timestamp} >= ${cutoff}`,
      ),
    )
    .groupBy(sql`1`);

  let long = 0, short = 0, neutral = 0;
  for (const row of rows) {
    if (row.direction === "long") long = row.count;
    else if (row.direction === "short") short = row.count;
    else if (row.direction === "neutral") neutral = row.count;
  }
  return { long, short, neutral };
}

export async function getUserLatestPollVote(
  arenaAccountId: number,
  lookbackMs: number = 60 * 60 * 1000,
): Promise<"long" | "short" | "neutral" | null> {
  const cutoff = Date.now() - lookbackMs;
  const rows = await db
    .select({
      direction: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${behaviorEvents.payload}, '$.direction'))`,
    })
    .from(behaviorEvents)
    .where(
      and(
        eq(behaviorEvents.arenaAccountId, arenaAccountId),
        eq(behaviorEvents.eventType, "poll_vote"),
        sql`${behaviorEvents.timestamp} >= ${cutoff}`,
      ),
    )
    .orderBy(desc(behaviorEvents.timestamp))
    .limit(1);

  const dir = rows[0]?.direction;
  if (dir === "long" || dir === "short" || dir === "neutral") return dir;
  return null;
}

export async function ensureActiveMatch(): Promise<void> {
  const active = await getActiveMatch();
  if (!active) {
    const now = Date.now();
    await createMatch(1, now, now + MATCH_DURATION_MS);
  }
}

// ─── Prediction Helpers ──────────────────────────────────────────────────────

export async function insertPrediction(input: {
  arenaAccountId: number;
  matchId: number;
  roundKey: string;
  direction: string;
  confidence: number;
  priceAtPrediction: number;
  actualPositionDirection: string | null;
  submittedAt: number;
}): Promise<void> {
  await db.insert(predictions).values({
    ...input,
    status: "pending",
  });
}

export async function getPredictionForRound(
  arenaAccountId: number,
  roundKey: string,
): Promise<{ id: number; direction: string } | null> {
  const rows = await db
    .select({ id: predictions.id, direction: predictions.direction })
    .from(predictions)
    .where(and(eq(predictions.arenaAccountId, arenaAccountId), eq(predictions.roundKey, roundKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPendingPredictionsForRound(
  roundKey: string,
): Promise<Array<{ id: number; arenaAccountId: number; direction: string; confidence: number; priceAtPrediction: number }>> {
  return db
    .select({
      id: predictions.id,
      arenaAccountId: predictions.arenaAccountId,
      direction: predictions.direction,
      confidence: predictions.confidence,
      priceAtPrediction: predictions.priceAtPrediction,
    })
    .from(predictions)
    .where(and(eq(predictions.roundKey, roundKey), eq(predictions.status, "pending")));
}

export async function resolvePrediction(
  predictionId: number,
  priceAtResolution: number,
  correct: boolean,
): Promise<void> {
  await db
    .update(predictions)
    .set({
      priceAtResolution,
      correct: correct ? 1 : 0,
      resolvedAt: Date.now(),
      status: "resolved",
    })
    .where(eq(predictions.id, predictionId));
}

export async function getPredictionStats(
  arenaAccountId: number,
  matchId: number,
): Promise<{ total: number; correct: number; pending: number }> {
  const rows = await db
    .select({
      status: predictions.status,
      correct: predictions.correct,
      count: sql<number>`COUNT(*)`,
    })
    .from(predictions)
    .where(and(eq(predictions.arenaAccountId, arenaAccountId), eq(predictions.matchId, matchId)))
    .groupBy(predictions.status, predictions.correct);

  let total = 0,
    correctCount = 0,
    pending = 0;
  for (const row of rows) {
    total += row.count;
    if (row.status === "pending") pending += row.count;
    if (row.correct === 1) correctCount += row.count;
  }
  return { total, correct: correctCount, pending };
}
