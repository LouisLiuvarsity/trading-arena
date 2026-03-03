import { bigint, double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Arena Tables ────────────────────────────────────────────────────────────

/** Arena player accounts (linked to auth users via openId) */
export const arenaAccounts = mysqlTable("arena_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  capital: double("capital").notNull().default(5000),
  seasonPoints: double("seasonPoints").notNull().default(0),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

/** Arena sessions (simple token auth for the trading engine) */
export const arenaSessions = mysqlTable("arena_sessions", {
  token: varchar("token", { length: 128 }).primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  lastSeen: bigint("lastSeen", { mode: "number" }).notNull(),
});

/** Trading matches (24h competition rounds) */
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  matchNumber: int("matchNumber").notNull(),
  matchType: varchar("matchType", { length: 16 }).notNull().default("regular"),
  startTime: bigint("startTime", { mode: "number" }).notNull(),
  endTime: bigint("endTime", { mode: "number" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
});

/** Open positions (one per user at a time) */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull().unique(),
  direction: varchar("direction", { length: 8 }).notNull(),
  size: double("size").notNull(),
  entryPrice: double("entryPrice").notNull(),
  openTime: bigint("openTime", { mode: "number" }).notNull(),
  takeProfit: double("takeProfit"),
  stopLoss: double("stopLoss"),
  tradeNumber: int("tradeNumber").notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

/** Completed trades */
export const trades = mysqlTable("trades", {
  id: varchar("id", { length: 64 }).primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull(),
  matchId: int("matchId").notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  size: double("size").notNull(),
  entryPrice: double("entryPrice").notNull(),
  exitPrice: double("exitPrice").notNull(),
  pnl: double("pnl").notNull(),
  pnlPct: double("pnlPct").notNull(),
  weightedPnl: double("weightedPnl").notNull(),
  holdDuration: double("holdDuration").notNull(),
  holdWeight: double("holdWeight").notNull(),
  closeReason: varchar("closeReason", { length: 16 }).notNull(),
  openTime: bigint("openTime", { mode: "number" }).notNull(),
  closeTime: bigint("closeTime", { mode: "number" }).notNull(),
});

/** Chat messages */
export const chatMessages = mysqlTable("chat_messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 16 }).notNull().default("user"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

/** Behavior events for analytics */
export const behaviorEvents = mysqlTable("behavior_events", {
  id: int("id").autoincrement().primaryKey(),
  arenaAccountId: int("arenaAccountId"),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  payload: text("payload"),
  source: varchar("source", { length: 32 }),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});
