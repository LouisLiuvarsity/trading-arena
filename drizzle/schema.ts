import { bigint, double, int, index, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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

/** Arena player accounts — login via unique inviteCode */
export const arenaAccounts = mysqlTable("arena_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  /** Unique invite code / ID used for login */
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(),
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
}, (table) => [
  index("idx_sessions_account").on(table.arenaAccountId),
]);

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
  fee: double("fee").notNull().default(0),
  weightedPnl: double("weightedPnl").notNull(),
  holdDuration: double("holdDuration").notNull(),
  holdWeight: double("holdWeight").notNull(),
  closeReason: varchar("closeReason", { length: 16 }).notNull(),
  openTime: bigint("openTime", { mode: "number" }).notNull(),
  closeTime: bigint("closeTime", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_trades_account_match").on(table.arenaAccountId, table.matchId),
  index("idx_trades_close_time").on(table.closeTime),
]);

/** Chat messages */
export const chatMessages = mysqlTable("chat_messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 16 }).notNull().default("user"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_chat_timestamp").on(table.timestamp),
]);

/** Behavior events for analytics */
export const behaviorEvents = mysqlTable("behavior_events", {
  id: int("id").autoincrement().primaryKey(),
  arenaAccountId: int("arenaAccountId"),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  payload: text("payload"),
  source: varchar("source", { length: 32 }),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_behavior_account").on(table.arenaAccountId),
  index("idx_behavior_timestamp").on(table.timestamp),
]);

/** Hourly price predictions */
export const predictions = mysqlTable("predictions", {
  id: int("id").autoincrement().primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull(),
  matchId: int("matchId").notNull(),
  /** Hourly round identifier, e.g. "2026-03-03T14:00" */
  roundKey: varchar("roundKey", { length: 32 }).notNull(),
  /** "up" or "down" */
  direction: varchar("direction", { length: 8 }).notNull(),
  /** 1-5 confidence scale */
  confidence: int("confidence").notNull().default(3),
  /** Price when prediction was submitted */
  priceAtPrediction: double("priceAtPrediction").notNull(),
  /** Price at resolution time (5 min after the hour) */
  priceAtResolution: double("priceAtResolution"),
  /** null = unresolved, 0 = wrong, 1 = correct */
  correct: int("correct"),
  /** User's actual position direction at prediction time, if any */
  actualPositionDirection: varchar("actualPositionDirection", { length: 8 }),
  submittedAt: bigint("submittedAt", { mode: "number" }).notNull(),
  resolvedAt: bigint("resolvedAt", { mode: "number" }),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
}, (table) => [
  index("idx_predictions_account_match").on(table.arenaAccountId, table.matchId),
  index("idx_predictions_round").on(table.roundKey),
  index("idx_predictions_status").on(table.status),
]);
