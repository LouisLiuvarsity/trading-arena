import { bigint, double, int, index, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  /** bcrypt-style password hash (scrypt) */
  passwordHash: varchar("passwordHash", { length: 256 }),
  /** Whether the invite code has been consumed (used for registration) */
  inviteConsumed: int("inviteConsumed").notNull().default(0),
  /** 'user' | 'admin' — controls access to admin endpoints */
  role: varchar("role", { length: 16 }).notNull().default("user"),
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
  /** Session expiration timestamp (ms) */
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
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
  /** Links to competitions.id when managed by CompetitionEngine */
  competitionId: int("competitionId"),
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
  /** Links to competitions.id when managed by CompetitionEngine */
  competitionId: int("competitionId"),
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

// ─── Competition System Tables (v2) ─────────────────────────────────────────

/** Monthly competition seasons */
export const seasons = mysqlTable("seasons", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  startDate: bigint("startDate", { mode: "number" }).notNull(),
  endDate: bigint("endDate", { mode: "number" }).notNull(),
  pointsDecayFactor: double("pointsDecayFactor").notNull().default(0.8),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

/** Scheduled competitions — replaces auto-rotating matches */
export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  competitionNumber: int("competitionNumber").notNull(),
  competitionType: varchar("competitionType", { length: 16 }).notNull().default("regular"),
  /** draft | announced | registration_open | registration_closed | live | settling | completed | cancelled */
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  /** Bridge to existing matches table — set when competition goes live */
  matchId: int("matchId"),
  // Capacity
  maxParticipants: int("maxParticipants").notNull().default(50),
  minParticipants: int("minParticipants").notNull().default(5),
  // Time schedule
  registrationOpenAt: bigint("registrationOpenAt", { mode: "number" }),
  registrationCloseAt: bigint("registrationCloseAt", { mode: "number" }),
  startTime: bigint("startTime", { mode: "number" }).notNull(),
  endTime: bigint("endTime", { mode: "number" }).notNull(),
  // Rules (per-competition overrides)
  symbol: varchar("symbol", { length: 16 }).notNull().default("SOLUSDT"),
  startingCapital: double("startingCapital").notNull().default(5000),
  maxTradesPerMatch: int("maxTradesPerMatch").notNull().default(40),
  closeOnlySeconds: int("closeOnlySeconds").notNull().default(1800),
  feeRate: double("feeRate").notNull().default(0.0005),
  prizePool: double("prizePool").notNull().default(500),
  prizeTableJson: text("prizeTableJson"),
  pointsTableJson: text("pointsTableJson"),
  // Eligibility restrictions
  requireMinSeasonPoints: int("requireMinSeasonPoints").notNull().default(0),
  requireMinTier: varchar("requireMinTier", { length: 16 }),
  inviteOnly: int("inviteOnly").notNull().default(0),
  // Admin
  createdBy: int("createdBy"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_comp_season").on(table.seasonId),
  index("idx_comp_status").on(table.status),
  index("idx_comp_start").on(table.startTime),
]);

/** Competition registrations (waitlist / selection) */
export const competitionRegistrations = mysqlTable("competition_registrations", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  arenaAccountId: int("arenaAccountId").notNull(),
  /** pending | accepted | rejected | waitlisted | withdrawn */
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  appliedAt: bigint("appliedAt", { mode: "number" }).notNull(),
  reviewedAt: bigint("reviewedAt", { mode: "number" }),
  reviewedBy: int("reviewedBy"),
  adminNote: text("adminNote"),
  priority: int("priority").notNull().default(0),
}, (table) => [
  uniqueIndex("idx_reg_unique").on(table.competitionId, table.arenaAccountId),
  index("idx_reg_comp_status").on(table.competitionId, table.status),
  index("idx_reg_account").on(table.arenaAccountId),
]);

/** Per-user per-competition results — persisted on settlement */
export const matchResults = mysqlTable("match_results", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  arenaAccountId: int("arenaAccountId").notNull(),
  finalRank: int("finalRank").notNull(),
  totalPnl: double("totalPnl").notNull().default(0),
  totalPnlPct: double("totalPnlPct").notNull().default(0),
  totalWeightedPnl: double("totalWeightedPnl").notNull().default(0),
  tradesCount: int("tradesCount").notNull().default(0),
  winCount: int("winCount").notNull().default(0),
  lossCount: int("lossCount").notNull().default(0),
  bestTradePnl: double("bestTradePnl"),
  worstTradePnl: double("worstTradePnl"),
  avgHoldDuration: double("avgHoldDuration"),
  avgHoldWeight: double("avgHoldWeight"),
  pointsEarned: int("pointsEarned").notNull().default(0),
  prizeWon: double("prizeWon").notNull().default(0),
  prizeEligible: int("prizeEligible").notNull().default(0),
  rankTierAtTime: varchar("rankTierAtTime", { length: 16 }),
  finalEquity: double("finalEquity").notNull().default(5000),
  closeReasonStats: text("closeReasonStats"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (table) => [
  uniqueIndex("idx_mr_unique").on(table.competitionId, table.arenaAccountId),
  index("idx_mr_account").on(table.arenaAccountId),
  index("idx_mr_rank").on(table.competitionId, table.finalRank),
]);

/** In-app notifications */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message"),
  competitionId: int("competitionId"),
  actionUrl: varchar("actionUrl", { length: 256 }),
  isRead: int("isRead").notNull().default(0),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_notif_account_read").on(table.arenaAccountId, table.isRead, table.createdAt),
]);

/** User achievements (persistent) */
export const userAchievements = mysqlTable("user_achievements", {
  id: int("id").autoincrement().primaryKey(),
  arenaAccountId: int("arenaAccountId").notNull(),
  achievementKey: varchar("achievementKey", { length: 64 }).notNull(),
  unlockedAt: bigint("unlockedAt", { mode: "number" }).notNull(),
  competitionId: int("competitionId"),
  metadata: text("metadata"),
}, (table) => [
  uniqueIndex("idx_ach_unique").on(table.arenaAccountId, table.achievementKey),
  index("idx_ach_account").on(table.arenaAccountId),
]);

/** Institutions — universities, schools, organizations */
export const institutions = mysqlTable("institutions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  nameEn: varchar("nameEn", { length: 256 }),
  shortName: varchar("shortName", { length: 64 }),
  type: varchar("type", { length: 32 }).notNull().default("university"),
  country: varchar("country", { length: 2 }).notNull(),
  region: varchar("region", { length: 64 }),
  city: varchar("city", { length: 64 }),
  logoUrl: varchar("logoUrl", { length: 512 }),
  verified: int("verified").notNull().default(0),
  memberCount: int("memberCount").notNull().default(0),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_inst_country").on(table.country),
  index("idx_inst_type").on(table.type),
]);

/** Extended user profiles — country, institution, bio */
export const userProfiles = mysqlTable("user_profiles", {
  arenaAccountId: int("arenaAccountId").primaryKey(),
  displayName: varchar("displayName", { length: 64 }),
  avatarUrl: varchar("avatarUrl", { length: 512 }),
  bio: varchar("bio", { length: 280 }),
  country: varchar("country", { length: 2 }),
  region: varchar("region", { length: 64 }),
  city: varchar("city", { length: 64 }),
  institutionId: int("institutionId"),
  institutionName: varchar("institutionName", { length: 128 }),
  department: varchar("department", { length: 128 }),
  graduationYear: int("graduationYear"),
  participantType: varchar("participantType", { length: 16 }).notNull().default("independent"),
  socialLinks: text("socialLinks"),
  isProfilePublic: int("isProfilePublic").notNull().default(1),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_profile_country").on(table.country),
  index("idx_profile_institution").on(table.institutionId),
]);
