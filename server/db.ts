/**
 * server/db.ts — Database helpers
 *
 * All helpers accept an optional last parameter `dbOrTx` to support
 * running inside a MySQL transaction. Defaults to the module-level `db`.
 */

import crypto from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and, desc, sql, lt, inArray } from "drizzle-orm";
import {
  users,
  arenaAccounts,
  arenaSessions,
  agentProfiles,
  agentApiKeys,
  matches,
  positions,
  trades,
  chatMessages,
  behaviorEvents,
  predictions,
  competitions,
  type User,
} from "../drizzle/schema";
import { MATCH_DURATION_MS, SESSION_TTL_MS, STARTING_CAPITAL } from "./constants";

// ─── Password Hashing ────────────────────────────────────────────────────────

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
}

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
    accountType: "human",
    ownerArenaAccountId: null,
    inviteCode: username, // legacy fallback
    capital: STARTING_CAPITAL,
    seasonPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  const insertId = Number(result[0].insertId);
  return { id: insertId, username, capital: STARTING_CAPITAL, seasonPoints: 0 };
}

/** Register a new arena account with email + username + password */
export async function registerArenaAccount(
  email: string,
  username: string,
  password: string,
): Promise<{ id: number; username: string; capital: number; seasonPoints: number }> {
  // Check username uniqueness
  const usernameCheck = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.username, username))
    .limit(1);
  if (usernameCheck[0]) {
    throw new Error("Username already taken");
  }

  // Check email uniqueness
  const emailCheck = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.email, email))
    .limit(1);
  if (emailCheck[0]) {
    throw new Error("Email already registered");
  }

  // Auto-generate a unique inviteCode for DB compatibility
  const autoCode = `email_${crypto.randomBytes(12).toString("hex")}`;

  const now = Date.now();
  const hashed = await hashPassword(password);
  const result = await db.insert(arenaAccounts).values({
    userId: 0,
    username,
    email,
    accountType: "human",
    ownerArenaAccountId: null,
    inviteCode: autoCode,
    passwordHash: hashed,
    inviteConsumed: 1,
    capital: STARTING_CAPITAL,
    seasonPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  const insertId = Number(result[0].insertId);
  return { id: insertId, username, capital: STARTING_CAPITAL, seasonPoints: 0 };
}

/** Check if a username is available */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const rows = await db
    .select({ id: arenaAccounts.id })
    .from(arenaAccounts)
    .where(eq(arenaAccounts.username, username))
    .limit(1);
  return rows.length === 0;
}

/** Login existing account by username (returning users) — returns passwordHash for verification */
export async function getArenaAccountByUsernameForLogin(
  username: string,
): Promise<{
  id: number;
  username: string;
  capital: number;
  seasonPoints: number;
  passwordHash: string | null;
  role: string;
  accountType: string;
  ownerArenaAccountId: number | null;
} | null> {
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
    passwordHash: rows[0].passwordHash,
    role: rows[0].role,
    accountType: rows[0].accountType ?? "human",
    ownerArenaAccountId: rows[0].ownerArenaAccountId ?? null,
  };
}

export async function getArenaAccountById(
  arenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<{
  id: number;
  userId: number;
  username: string;
  email: string | null;
  capital: number;
  seasonPoints: number;
  role: string;
  accountType: string;
  ownerArenaAccountId: number | null;
} | null> {
  const rows = await dbOrTx
    .select({
      id: arenaAccounts.id,
      userId: arenaAccounts.userId,
      username: arenaAccounts.username,
      email: arenaAccounts.email,
      capital: arenaAccounts.capital,
      seasonPoints: arenaAccounts.seasonPoints,
      role: arenaAccounts.role,
      accountType: arenaAccounts.accountType,
      ownerArenaAccountId: arenaAccounts.ownerArenaAccountId,
    })
    .from(arenaAccounts)
    .where(eq(arenaAccounts.id, arenaAccountId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getArenaAccountByUsername(
  username: string,
): Promise<{
  id: number;
  userId: number;
  username: string;
  capital: number;
  seasonPoints: number;
  accountType: string;
  ownerArenaAccountId: number | null;
} | null> {
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
    expiresAt: now + SESSION_TTL_MS,
  });
}

// Throttle lastSeen updates to at most once per 5 minutes per token
const lastSeenCache = new Map<string, number>();
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export async function getArenaAccountByToken(
  token: string,
): Promise<{
  id: number;
  userId: number;
  username: string;
  capital: number;
  seasonPoints: number;
  role: string;
  accountType: string;
  ownerArenaAccountId: number | null;
} | null> {
  const now = Date.now();
  const rows = await db
    .select({
      id: arenaAccounts.id,
      userId: arenaAccounts.userId,
      username: arenaAccounts.username,
      capital: arenaAccounts.capital,
      seasonPoints: arenaAccounts.seasonPoints,
      role: arenaAccounts.role,
      accountType: arenaAccounts.accountType,
      ownerArenaAccountId: arenaAccounts.ownerArenaAccountId,
      expiresAt: arenaSessions.expiresAt,
    })
    .from(arenaSessions)
    .innerJoin(arenaAccounts, eq(arenaSessions.arenaAccountId, arenaAccounts.id))
    .where(eq(arenaSessions.token, token))
    .limit(1);

  if (!rows[0]) return null;

  // Check session expiration
  if (rows[0].expiresAt > 0 && now > rows[0].expiresAt) {
    // Clean up expired session
    await db.delete(arenaSessions).where(eq(arenaSessions.token, token));
    lastSeenCache.delete(token);
    return null;
  }

  // Throttle lastSeen updates
  const lastUpdate = lastSeenCache.get(token) ?? 0;
  if (now - lastUpdate > LAST_SEEN_THROTTLE_MS) {
    lastSeenCache.set(token, now);
    await db
      .update(arenaSessions)
      .set({ lastSeen: now })
      .where(eq(arenaSessions.token, token));
  }

  return {
    id: rows[0].id,
    userId: rows[0].userId,
    username: rows[0].username,
    capital: rows[0].capital,
    seasonPoints: rows[0].seasonPoints,
    role: rows[0].role,
    accountType: rows[0].accountType ?? "human",
    ownerArenaAccountId: rows[0].ownerArenaAccountId ?? null,
  };
}

function hashAgentApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function countAgentsForOwner(
  ownerArenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<number> {
  const rows = await dbOrTx
    .select({ count: sql<number>`COUNT(*)` })
    .from(arenaAccounts)
    .where(
      and(
        eq(arenaAccounts.ownerArenaAccountId, ownerArenaAccountId),
        eq(arenaAccounts.accountType, "agent"),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function getAgentProfileByAccountId(
  arenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<{
  arenaAccountId: number;
  ownerArenaAccountId: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
} | null> {
  const rows = await dbOrTx
    .select({
      arenaAccountId: agentProfiles.arenaAccountId,
      ownerArenaAccountId: agentProfiles.ownerArenaAccountId,
      name: agentProfiles.name,
      description: agentProfiles.description,
      status: agentProfiles.status,
      createdAt: agentProfiles.createdAt,
      updatedAt: agentProfiles.updatedAt,
    })
    .from(agentProfiles)
    .where(eq(agentProfiles.arenaAccountId, arenaAccountId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOwnedAgentById(
  ownerArenaAccountId: number,
  arenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<{
  arenaAccountId: number;
  ownerArenaAccountId: number;
  username: string;
  name: string;
  description: string | null;
  status: string;
  capital: number;
  seasonPoints: number;
  createdAt: number;
  updatedAt: number;
} | null> {
  const rows = await dbOrTx
    .select({
      arenaAccountId: arenaAccounts.id,
      ownerArenaAccountId: arenaAccounts.ownerArenaAccountId,
      username: arenaAccounts.username,
      name: agentProfiles.name,
      description: agentProfiles.description,
      status: agentProfiles.status,
      capital: arenaAccounts.capital,
      seasonPoints: arenaAccounts.seasonPoints,
      createdAt: agentProfiles.createdAt,
      updatedAt: agentProfiles.updatedAt,
    })
    .from(arenaAccounts)
    .innerJoin(agentProfiles, eq(agentProfiles.arenaAccountId, arenaAccounts.id))
    .where(
      and(
        eq(arenaAccounts.id, arenaAccountId),
        eq(arenaAccounts.accountType, "agent"),
        eq(arenaAccounts.ownerArenaAccountId, ownerArenaAccountId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listAgentsForOwner(
  ownerArenaAccountId: number,
): Promise<
  Array<{
    arenaAccountId: number;
    username: string;
    name: string;
    description: string | null;
    status: string;
    capital: number;
    seasonPoints: number;
    createdAt: number;
    updatedAt: number;
  }>
> {
  return db
    .select({
      arenaAccountId: arenaAccounts.id,
      username: arenaAccounts.username,
      name: agentProfiles.name,
      description: agentProfiles.description,
      status: agentProfiles.status,
      capital: arenaAccounts.capital,
      seasonPoints: arenaAccounts.seasonPoints,
      createdAt: agentProfiles.createdAt,
      updatedAt: agentProfiles.updatedAt,
    })
    .from(arenaAccounts)
    .innerJoin(agentProfiles, eq(agentProfiles.arenaAccountId, arenaAccounts.id))
    .where(
      and(
        eq(arenaAccounts.ownerArenaAccountId, ownerArenaAccountId),
        eq(arenaAccounts.accountType, "agent"),
      ),
    )
    .orderBy(desc(agentProfiles.createdAt));
}

export async function createAgentForOwner(
  ownerArenaAccountId: number,
  input: { username: string; name: string; description?: string | null },
): Promise<{
  id: number;
  username: string;
  name: string;
  description: string | null;
  capital: number;
  seasonPoints: number;
}> {
  const owner = await getArenaAccountById(ownerArenaAccountId);
  if (!owner) throw new Error("Owner account not found");
  if ((owner.accountType ?? "human") !== "human") {
    throw new Error("Only human accounts can own agents");
  }

  const usernameCheck = await db
    .select({ id: arenaAccounts.id })
    .from(arenaAccounts)
    .where(eq(arenaAccounts.username, input.username))
    .limit(1);
  if (usernameCheck[0]) {
    throw new Error("Agent username already taken");
  }

  const now = Date.now();
  const inviteCode = `agent_${crypto.randomBytes(12).toString("hex")}`;
  return db.transaction(async (tx) => {
    const result = await tx.insert(arenaAccounts).values({
      userId: owner.userId,
      username: input.username,
      email: null,
      accountType: "agent",
      ownerArenaAccountId,
      inviteCode,
      passwordHash: null,
      inviteConsumed: 1,
      role: "user",
      capital: STARTING_CAPITAL,
      seasonPoints: 0,
      createdAt: now,
      updatedAt: now,
    });
    const id = Number(result[0].insertId);
    await tx.insert(agentProfiles).values({
      arenaAccountId: id,
      ownerArenaAccountId,
      name: input.name,
      description: input.description ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return {
      id,
      username: input.username,
      name: input.name,
      description: input.description ?? null,
      capital: STARTING_CAPITAL,
      seasonPoints: 0,
    };
  });
}

export async function updateOwnedAgentProfile(
  ownerArenaAccountId: number,
  arenaAccountId: number,
  updates: { name?: string; description?: string | null; status?: string },
  dbOrTx: DbOrTx = db,
): Promise<void> {
  const agent = await getOwnedAgentById(ownerArenaAccountId, arenaAccountId, dbOrTx);
  if (!agent) throw new Error("Agent not found");

  await dbOrTx
    .update(agentProfiles)
    .set({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      updatedAt: Date.now(),
    })
    .where(eq(agentProfiles.arenaAccountId, arenaAccountId));
}

export async function getActiveAgentApiKeyForOwner(
  ownerArenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<{
  id: number;
  ownerArenaAccountId: number;
  keyPrefix: string;
  status: string;
  createdAt: number;
  lastUsedAt: number | null;
} | null> {
  const rows = await dbOrTx
    .select({
      id: agentApiKeys.id,
      ownerArenaAccountId: agentApiKeys.ownerArenaAccountId,
      keyPrefix: agentApiKeys.keyPrefix,
      status: agentApiKeys.status,
      createdAt: agentApiKeys.createdAt,
      lastUsedAt: agentApiKeys.lastUsedAt,
    })
    .from(agentApiKeys)
    .where(
      and(
        eq(agentApiKeys.ownerArenaAccountId, ownerArenaAccountId),
        eq(agentApiKeys.status, "active"),
      ),
    )
    .orderBy(desc(agentApiKeys.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeAgentApiKeysForOwner(
  ownerArenaAccountId: number,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(agentApiKeys)
    .set({
      status: "revoked",
      revokedAt: Date.now(),
    })
    .where(
      and(
        eq(agentApiKeys.ownerArenaAccountId, ownerArenaAccountId),
        eq(agentApiKeys.status, "active"),
      ),
    );
}

export async function rotateAgentApiKeyForOwner(
  ownerArenaAccountId: number,
  rawKey: string,
): Promise<{ id: number; keyPrefix: string; createdAt: number }> {
  const now = Date.now();
  const keyPrefix = rawKey.slice(0, 8);
  const keyHash = hashAgentApiKey(rawKey);
  return db.transaction(async (tx) => {
    await revokeAgentApiKeysForOwner(ownerArenaAccountId, tx);
    const result = await tx.insert(agentApiKeys).values({
      ownerArenaAccountId,
      keyPrefix,
      keyHash,
      status: "active",
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    });
    return {
      id: Number(result[0].insertId),
      keyPrefix,
      createdAt: now,
    };
  });
}

export async function getOwnerByAgentApiKey(
  rawKey: string,
): Promise<{
  apiKeyId: number;
  ownerArenaAccountId: number;
  ownerUsername: string;
} | null> {
  const keyPrefix = rawKey.slice(0, 8);
  const keyHash = hashAgentApiKey(rawKey);
  const rows = await db
    .select({
      apiKeyId: agentApiKeys.id,
      ownerArenaAccountId: agentApiKeys.ownerArenaAccountId,
      ownerUsername: arenaAccounts.username,
    })
    .from(agentApiKeys)
    .innerJoin(arenaAccounts, eq(arenaAccounts.id, agentApiKeys.ownerArenaAccountId))
    .where(
      and(
        eq(agentApiKeys.keyPrefix, keyPrefix),
        eq(agentApiKeys.keyHash, keyHash),
        eq(agentApiKeys.status, "active"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function touchAgentApiKeyLastUsed(
  id: number,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(agentApiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(agentApiKeys.id, id));
}

// ─── Cleanup Jobs ─────────────────────────────────────────────────────────────

/** Delete expired sessions */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now();
  await db.delete(arenaSessions).where(and(lt(arenaSessions.expiresAt, now), sql`${arenaSessions.expiresAt} > 0`));
  // Purge stale entries from lastSeenCache to prevent unbounded growth
  lastSeenCache.forEach((lastUpdate, token) => {
    if (now - lastUpdate > SESSION_TTL_MS) lastSeenCache.delete(token);
  });
}

/** Delete old behavior events (older than 30 days) */
export async function cleanupOldBehaviorEvents(): Promise<void> {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await db.delete(behaviorEvents).where(lt(behaviorEvents.timestamp, cutoff));
}

/** Delete old chat messages (older than 7 days) */
export async function cleanupOldChatMessages(): Promise<void> {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await db.delete(chatMessages).where(lt(chatMessages.timestamp, cutoff));
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

export async function getMatchById(
  matchId: number,
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
    .where(eq(matches.id, matchId))
    .limit(1);
  return rows[0]
    ? { id: rows[0].id, matchNumber: rows[0].matchNumber, startTime: rows[0].startTime, endTime: rows[0].endTime }
    : null;
}

export async function createMatch(
  matchNumber: number,
  startTime: number,
  endTime: number,
  matchType: string = "regular",
  dbOrTx: DbOrTx = db,
): Promise<number> {
  const result = await dbOrTx.insert(matches).values({
    matchNumber,
    matchType,
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
  competitionId: number | null;
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
    competitionId: number | null;
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
    competitionId?: number | null;
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
    competitionId: input.competitionId ?? null,
    updatedAt: Date.now(),
  });
}

export async function updatePositionTpSl(
  arenaAccountId: number,
  tp: number | null,
  sl: number | null,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
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

/**
 * Build the season leaderboard sorted by seasonRankScore = seasonPoints × avgHoldWeight.
 * Used for grand final qualification (top N qualify).
 */
export async function getSeasonLeaderboard(
  seasonId?: number,
  limit: number = 500,
): Promise<Array<{
  arenaAccountId: number;
  username: string;
  seasonPoints: number;
  avgHoldWeight: number;
  seasonRankScore: number;
  rank: number;
}>> {
  // Get all accounts with season points > 0
  const accounts = await db
    .select({
      id: arenaAccounts.id,
      username: arenaAccounts.username,
      seasonPoints: arenaAccounts.seasonPoints,
    })
    .from(arenaAccounts)
    .where(sql`${arenaAccounts.seasonPoints} > 0`);

  // Compute average hold weight per account (optionally scoped to season)
  let avgWeightQuery;
  if (seasonId) {
    avgWeightQuery = await db
      .select({
        arenaAccountId: trades.arenaAccountId,
        avg: sql<number>`COALESCE(AVG(${trades.holdWeight}), 0)`,
      })
      .from(trades)
      .innerJoin(competitions, eq(trades.matchId, competitions.matchId))
      .where(eq(competitions.seasonId, seasonId))
      .groupBy(trades.arenaAccountId);
  } else {
    avgWeightQuery = await db
      .select({
        arenaAccountId: trades.arenaAccountId,
        avg: sql<number>`COALESCE(AVG(${trades.holdWeight}), 0)`,
      })
      .from(trades)
      .groupBy(trades.arenaAccountId);
  }

  const weightMap = new Map<number, number>();
  for (const row of avgWeightQuery) {
    weightMap.set(row.arenaAccountId, row.avg);
  }

  // Compute rank scores and sort
  const rows = accounts.map((a) => {
    const avgHoldWeight = weightMap.get(a.id) ?? 0;
    return {
      arenaAccountId: a.id,
      username: a.username,
      seasonPoints: a.seasonPoints,
      avgHoldWeight: Math.round(avgHoldWeight * 100) / 100,
      seasonRankScore: Math.round(a.seasonPoints * avgHoldWeight * 100) / 100,
      rank: 0,
    };
  });

  rows.sort((a, b) => {
    if (b.seasonRankScore !== a.seasonRankScore) return b.seasonRankScore - a.seasonRankScore;
    if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
    return a.arenaAccountId - b.arenaAccountId;
  });

  rows.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  return rows.slice(0, limit);
}

/** Get the grand final qualification line (the seasonRankScore of the Nth-ranked player) */
export async function getGrandFinalLine(
  qualifyCount: number = 500,
  seasonId?: number,
): Promise<number> {
  const leaderboard = await getSeasonLeaderboard(seasonId, qualifyCount);
  if (leaderboard.length < qualifyCount) return 0;
  return leaderboard[qualifyCount - 1].seasonRankScore;
}

/** Apply monthly season points decay: multiply all season points by the given factor (e.g. 0.8) */
export async function applySeasonPointsDecay(
  factor: number,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(arenaAccounts)
    .set({
      seasonPoints: sql`ROUND(${arenaAccounts.seasonPoints} * ${factor}, 2)`,
      updatedAt: Date.now(),
    })
    .where(sql`${arenaAccounts.seasonPoints} > 0`);
}

export async function insertChatMessage(input: {
  id: string;
  arenaAccountId: number;
  competitionId?: number | null;
  username: string;
  message: string;
  type: string;
  timestamp: number;
}): Promise<void> {
  await db.insert(chatMessages).values({
    ...input,
    competitionId: input.competitionId ?? null,
  });
}

export async function getRecentChatMessages(
  limit: number = 120,
  competitionId?: number | null,
): Promise<
  Array<{
    id: string;
    username: string;
    message: string;
    timestamp: number;
    type: string;
  }>
> {
  const whereClause =
    competitionId === undefined
      ? undefined
      : competitionId === null
        ? sql`${chatMessages.competitionId} IS NULL`
        : eq(chatMessages.competitionId, competitionId);
  const rows = await db
    .select({
      id: chatMessages.id,
      username: chatMessages.username,
      message: chatMessages.message,
      timestamp: chatMessages.timestamp,
      type: chatMessages.type,
    })
    .from(chatMessages)
    .where(whereClause)
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

export async function getPositionCountByDirection(
  participantIds?: Set<number>,
): Promise<{ long: number; short: number }> {
  const conditions = [];
  if (participantIds && participantIds.size > 0) {
    const ids = Array.from(participantIds);
    conditions.push(inArray(positions.arenaAccountId, ids));
  }
  const rows = await db
    .select({
      direction: positions.direction,
      count: sql<number>`COUNT(*)`,
    })
    .from(positions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
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

/** Batch direction consistency for all accounts in a match. Returns Map<accountId, consistency 0..1> */
export async function getDirectionConsistencyBatch(matchId: number): Promise<Map<number, number>> {
  const rows = await db
    .select({
      arenaAccountId: trades.arenaAccountId,
      direction: trades.direction,
      cnt: sql<number>`COUNT(*)`,
    })
    .from(trades)
    .where(eq(trades.matchId, matchId))
    .groupBy(trades.arenaAccountId, trades.direction);

  // Aggregate: for each account, find total trades and max(longCount, shortCount)
  const totals = new Map<number, { total: number; max: number }>();
  for (const row of rows) {
    const existing = totals.get(row.arenaAccountId) ?? { total: 0, max: 0 };
    existing.total += row.cnt;
    existing.max = Math.max(existing.max, row.cnt);
    totals.set(row.arenaAccountId, existing);
  }

  const result = new Map<number, number>();
  totals.forEach(({ total, max }, accountId) => {
    result.set(accountId, Math.round((max / total) * 100) / 100);
  });
  return result;
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

export async function getAvgHoldWeightForUser(arenaAccountId: number, seasonId?: number): Promise<number> {
  if (seasonId) {
    // Filter trades to only those from competitions in the given season
    const rows = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${trades.holdWeight}), 0)`,
      })
      .from(trades)
      .innerJoin(competitions, eq(trades.matchId, competitions.matchId))
      .where(and(eq(trades.arenaAccountId, arenaAccountId), eq(competitions.seasonId, seasonId)));
    return rows[0]?.avg ?? 0;
  }
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
  // Use raw SQL to avoid Drizzle's column reference mismatch with MySQL only_full_group_by
  const rows = await db.execute(
    sql`SELECT JSON_UNQUOTE(JSON_EXTRACT(payload, '$.direction')) AS direction, COUNT(*) AS cnt
        FROM behavior_events
        WHERE eventType = 'poll_vote' AND timestamp >= ${cutoff}
        GROUP BY direction`,
  );

  let long = 0, short = 0, neutral = 0;
  const resultRows = (rows as any)[0] ?? rows;
  if (Array.isArray(resultRows)) {
    for (const row of resultRows) {
      const dir = (row as any).direction;
      const count = Number((row as any).cnt ?? 0);
      if (dir === "long") long = count;
      else if (dir === "short") short = count;
      else if (dir === "neutral") neutral = count;
    }
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
  matchId: number,
  roundKey: string,
): Promise<{ id: number; direction: string } | null> {
  const rows = await db
    .select({ id: predictions.id, direction: predictions.direction })
    .from(predictions)
    .where(
      and(
        eq(predictions.arenaAccountId, arenaAccountId),
        eq(predictions.matchId, matchId),
        eq(predictions.roundKey, roundKey),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getPendingPredictionsForRound(
  roundKey: string,
  matchId: number,
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
    .where(and(eq(predictions.roundKey, roundKey), eq(predictions.matchId, matchId), eq(predictions.status, "pending")));
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
