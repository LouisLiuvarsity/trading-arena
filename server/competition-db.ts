/**
 * server/competition-db.ts — Competition system database helpers
 *
 * All helpers accept an optional last parameter `dbOrTx` to support
 * running inside a MySQL transaction. Defaults to the module-level `db`.
 */

import { eq, and, desc, sql, lt, inArray } from "drizzle-orm";
import {
  arenaAccounts,
  agentProfiles,
  seasons,
  competitions,
  competitionRegistrations,
  matchResults,
  notifications,
  userAchievements,
  institutions,
  userProfiles,
} from "../drizzle/schema";
import { db, type DbOrTx } from "./db";

// ─── Season Helpers ──────────────────────────────────────────────────────────

export async function createSeason(
  input: {
    name: string;
    slug: string;
    status?: string;
    startDate: number;
    endDate: number;
    pointsDecayFactor?: number;
  },
  dbOrTx: DbOrTx = db,
): Promise<number> {
  const now = Date.now();
  const result = await dbOrTx.insert(seasons).values({
    name: input.name,
    slug: input.slug,
    status: input.status ?? "active",
    startDate: input.startDate,
    endDate: input.endDate,
    pointsDecayFactor: input.pointsDecayFactor ?? 0.8,
    createdAt: now,
  });
  return Number(result[0].insertId);
}

export async function getActiveSeason(
  dbOrTx: DbOrTx = db,
): Promise<typeof seasons.$inferSelect | null> {
  const rows = await dbOrTx
    .select()
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSeasonBySlug(
  slug: string,
): Promise<typeof seasons.$inferSelect | null> {
  const rows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSeasons(): Promise<Array<typeof seasons.$inferSelect>> {
  return db.select().from(seasons).where(eq(seasons.archived, 0)).orderBy(desc(seasons.startDate));
}

// ─── Competition Helpers ─────────────────────────────────────────────────────

export async function createCompetition(
  input: {
    seasonId: number;
    title: string;
    slug: string;
    description?: string;
    competitionNumber: number;
    competitionType?: string;
    participantMode?: string;
    status?: string;
    maxParticipants?: number;
    minParticipants?: number;
    registrationOpenAt?: number;
    registrationCloseAt?: number;
    startTime: number;
    endTime: number;
    symbol?: string;
    startingCapital?: number;
    maxTradesPerMatch?: number;
    closeOnlySeconds?: number;
    feeRate?: number;
    prizePool?: number;
    prizeTableJson?: string;
    pointsTableJson?: string;
    requireMinSeasonPoints?: number;
    requireMinTier?: string;
    inviteOnly?: number;
    createdBy?: number;
  },
  dbOrTx: DbOrTx = db,
): Promise<number> {
  const now = Date.now();
  const result = await dbOrTx.insert(competitions).values({
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  return Number(result[0].insertId);
}

export async function updateCompetition(
  id: number,
  updates: Partial<typeof competitions.$inferInsert>,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(competitions)
    .set({ ...updates, updatedAt: Date.now() })
    .where(eq(competitions.id, id));
}

export async function getCompetitionById(
  id: number,
  dbOrTx: DbOrTx = db,
): Promise<typeof competitions.$inferSelect | null> {
  const rows = await dbOrTx
    .select()
    .from(competitions)
    .where(eq(competitions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCompetitionBySlug(
  slug: string,
): Promise<typeof competitions.$inferSelect | null> {
  const rows = await db
    .select()
    .from(competitions)
    .where(eq(competitions.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateCompetitionStatus(
  id: number,
  status: string,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(competitions)
    .set({ status, updatedAt: Date.now() })
    .where(eq(competitions.id, id));
}

export async function setCompetitionMatchId(
  competitionId: number,
  matchId: number,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(competitions)
    .set({ matchId, updatedAt: Date.now() })
    .where(eq(competitions.id, competitionId));
}

export async function listCompetitions(
  filters?: { seasonId?: number; status?: string },
): Promise<Array<typeof competitions.$inferSelect>> {
  const conditions = [eq(competitions.archived, 0)];
  if (filters?.seasonId) {
    conditions.push(eq(competitions.seasonId, filters.seasonId));
  }
  if (filters?.status) {
    conditions.push(eq(competitions.status, filters.status));
  }
  return db.select().from(competitions).where(and(...conditions)).orderBy(desc(competitions.startTime));
}

export async function getCompetitionsByStatus(
  status: string,
): Promise<Array<typeof competitions.$inferSelect>> {
  return listCompetitions({ status });
}

export async function getLiveCompetitions(): Promise<Array<typeof competitions.$inferSelect>> {
  return listCompetitions({ status: "live" });
}

// ─── Registration Helpers ────────────────────────────────────────────────────

export async function createRegistration(
  competitionId: number,
  arenaAccountId: number,
): Promise<number> {
  const now = Date.now();
  const result = await db.insert(competitionRegistrations).values({
    competitionId,
    arenaAccountId,
    status: "pending",
    appliedAt: now,
  });
  return Number(result[0].insertId);
}

export async function getRegistration(
  competitionId: number,
  arenaAccountId: number,
): Promise<typeof competitionRegistrations.$inferSelect | null> {
  const rows = await db
    .select()
    .from(competitionRegistrations)
    .where(
      and(
        eq(competitionRegistrations.competitionId, competitionId),
        eq(competitionRegistrations.arenaAccountId, arenaAccountId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getRegistrationById(
  id: number,
): Promise<typeof competitionRegistrations.$inferSelect | null> {
  const rows = await db
    .select()
    .from(competitionRegistrations)
    .where(eq(competitionRegistrations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateRegistrationStatus(
  id: number,
  status: string,
  reviewedBy?: number,
  dbOrTx: DbOrTx = db,
): Promise<void> {
  await dbOrTx
    .update(competitionRegistrations)
    .set({
      status,
      reviewedAt: Date.now(),
      ...(reviewedBy !== undefined ? { reviewedBy } : {}),
    })
    .where(eq(competitionRegistrations.id, id));
}

export async function withdrawRegistration(
  competitionId: number,
  arenaAccountId: number,
): Promise<void> {
  await db
    .update(competitionRegistrations)
    .set({ status: "withdrawn", reviewedAt: Date.now() })
    .where(
      and(
        eq(competitionRegistrations.competitionId, competitionId),
        eq(competitionRegistrations.arenaAccountId, arenaAccountId),
      ),
    );
}

export async function listRegistrations(
  competitionId: number,
  statusFilter?: string,
): Promise<Array<{
  id: number;
  competitionId: number;
  arenaAccountId: number;
  status: string;
  appliedAt: number;
  reviewedAt: number | null;
  reviewedBy: number | null;
  adminNote: string | null;
  priority: number;
  username: string;
  seasonPoints: number;
  institutionName: string | null;
  country: string | null;
  accountType: string;
  ownerArenaAccountId: number | null;
  ownerUsername: string | null;
  agentName: string | null;
}>> {
  const conditions = [eq(competitionRegistrations.competitionId, competitionId)];
  if (statusFilter) {
    conditions.push(eq(competitionRegistrations.status, statusFilter));
  }
  const rows = await db
    .select({
      id: competitionRegistrations.id,
      competitionId: competitionRegistrations.competitionId,
      arenaAccountId: competitionRegistrations.arenaAccountId,
      status: competitionRegistrations.status,
      appliedAt: competitionRegistrations.appliedAt,
      reviewedAt: competitionRegistrations.reviewedAt,
      reviewedBy: competitionRegistrations.reviewedBy,
      adminNote: competitionRegistrations.adminNote,
      priority: competitionRegistrations.priority,
      username: arenaAccounts.username,
      seasonPoints: arenaAccounts.seasonPoints,
      accountType: arenaAccounts.accountType,
      ownerArenaAccountId: arenaAccounts.ownerArenaAccountId,
      institutionName: userProfiles.institutionName,
      country: userProfiles.country,
      agentName: agentProfiles.name,
    })
    .from(competitionRegistrations)
    .innerJoin(arenaAccounts, eq(arenaAccounts.id, competitionRegistrations.arenaAccountId))
    .leftJoin(userProfiles, eq(userProfiles.arenaAccountId, competitionRegistrations.arenaAccountId))
    .leftJoin(agentProfiles, eq(agentProfiles.arenaAccountId, competitionRegistrations.arenaAccountId))
    .where(and(...conditions))
    .orderBy(desc(competitionRegistrations.appliedAt));

  const ownerIds = Array.from(new Set(
    rows
      .map((row) => row.ownerArenaAccountId)
      .filter((id): id is number => typeof id === "number"),
  ));

  const ownerMap = new Map<number, string>();
  if (ownerIds.length > 0) {
    const owners = await db
      .select({ id: arenaAccounts.id, username: arenaAccounts.username })
      .from(arenaAccounts)
      .where(inArray(arenaAccounts.id, ownerIds));
    owners.forEach((owner) => ownerMap.set(owner.id, owner.username));
  }

  return rows.map((row) => ({
    id: row.id,
    competitionId: row.competitionId,
    arenaAccountId: row.arenaAccountId,
    status: row.status,
    appliedAt: row.appliedAt,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
    adminNote: row.adminNote,
    priority: row.priority,
    username: row.username,
    seasonPoints: row.seasonPoints,
    institutionName: row.institutionName ?? null,
    country: row.country ?? null,
    accountType: row.accountType ?? "human",
    ownerArenaAccountId: row.ownerArenaAccountId ?? null,
    ownerUsername: row.ownerArenaAccountId
      ? ownerMap.get(row.ownerArenaAccountId) ?? null
      : null,
    agentName: row.agentName ?? null,
  }));
}

export async function countRegistrations(
  competitionId: number,
  status?: string,
): Promise<number> {
  const conditions = [eq(competitionRegistrations.competitionId, competitionId)];
  if (status) {
    conditions.push(eq(competitionRegistrations.status, status));
  }
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(competitionRegistrations)
    .where(and(...conditions));
  return rows[0]?.count ?? 0;
}

export async function getAcceptedAccountIds(
  competitionId: number,
): Promise<number[]> {
  const rows = await db
    .select({ arenaAccountId: competitionRegistrations.arenaAccountId })
    .from(competitionRegistrations)
    .where(
      and(
        eq(competitionRegistrations.competitionId, competitionId),
        eq(competitionRegistrations.status, "accepted"),
      ),
    );
  return rows.map((r) => r.arenaAccountId);
}

/** Get all registrations for a specific user account (across all competitions) */
export async function getRegistrationsForAccount(
  arenaAccountId: number,
): Promise<Array<{
  competitionId: number;
  competitionTitle: string;
  participantMode: string;
  status: string;
  startTime: number;
  appliedAt: number;
}>> {
  const rows = await db
    .select({
      competitionId: competitionRegistrations.competitionId,
      competitionTitle: competitions.title,
      participantMode: competitions.participantMode,
      status: competitionRegistrations.status,
      startTime: competitions.startTime,
      appliedAt: competitionRegistrations.appliedAt,
    })
    .from(competitionRegistrations)
    .innerJoin(competitions, eq(competitions.id, competitionRegistrations.competitionId))
    .where(eq(competitionRegistrations.arenaAccountId, arenaAccountId))
    .orderBy(desc(competitionRegistrations.appliedAt));
  return rows;
}

// ─── Match Results Helpers ───────────────────────────────────────────────────

export async function insertMatchResult(
  input: {
    competitionId: number;
    arenaAccountId: number;
    finalRank: number;
    totalPnl?: number;
    totalPnlPct?: number;
    totalWeightedPnl?: number;
    tradesCount?: number;
    winCount?: number;
    lossCount?: number;
    bestTradePnl?: number;
    worstTradePnl?: number;
    avgHoldDuration?: number;
    avgHoldWeight?: number;
    pointsEarned?: number;
    prizeWon?: number;
    prizeEligible?: number;
    rankTierAtTime?: string;
    finalEquity?: number;
    closeReasonStats?: string;
  },
  dbOrTx: DbOrTx = db,
): Promise<number> {
  const now = Date.now();
  const result = await dbOrTx.insert(matchResults).values({
    ...input,
    createdAt: now,
  });
  return Number(result[0].insertId);
}

export async function getMatchResultsForCompetition(
  competitionId: number,
): Promise<Array<typeof matchResults.$inferSelect & { username: string | null; participantCount: number }>> {
  const rows = await db
    .select({
      id: matchResults.id,
      competitionId: matchResults.competitionId,
      arenaAccountId: matchResults.arenaAccountId,
      finalRank: matchResults.finalRank,
      totalPnl: matchResults.totalPnl,
      totalPnlPct: matchResults.totalPnlPct,
      totalWeightedPnl: matchResults.totalWeightedPnl,
      tradesCount: matchResults.tradesCount,
      winCount: matchResults.winCount,
      lossCount: matchResults.lossCount,
      bestTradePnl: matchResults.bestTradePnl,
      worstTradePnl: matchResults.worstTradePnl,
      avgHoldDuration: matchResults.avgHoldDuration,
      avgHoldWeight: matchResults.avgHoldWeight,
      pointsEarned: matchResults.pointsEarned,
      prizeWon: matchResults.prizeWon,
      prizeEligible: matchResults.prizeEligible,
      rankTierAtTime: matchResults.rankTierAtTime,
      finalEquity: matchResults.finalEquity,
      closeReasonStats: matchResults.closeReasonStats,
      createdAt: matchResults.createdAt,
      username: arenaAccounts.username,
    })
    .from(matchResults)
    .leftJoin(arenaAccounts, eq(matchResults.arenaAccountId, arenaAccounts.id))
    .where(eq(matchResults.competitionId, competitionId))
    .orderBy(matchResults.finalRank);

  const participantCount = rows.length;
  return rows.map((row) => ({ ...row, participantCount }));
}

export async function getMatchResultsForUser(
  arenaAccountId: number,
  limit: number = 50,
): Promise<Array<typeof matchResults.$inferSelect & {
  competitionTitle: string;
  competitionNumber: number;
  participantCount: number;
}>> {
  const rows = await db
    .select({
      id: matchResults.id,
      competitionId: matchResults.competitionId,
      arenaAccountId: matchResults.arenaAccountId,
      finalRank: matchResults.finalRank,
      totalPnl: matchResults.totalPnl,
      totalPnlPct: matchResults.totalPnlPct,
      totalWeightedPnl: matchResults.totalWeightedPnl,
      tradesCount: matchResults.tradesCount,
      winCount: matchResults.winCount,
      lossCount: matchResults.lossCount,
      bestTradePnl: matchResults.bestTradePnl,
      worstTradePnl: matchResults.worstTradePnl,
      avgHoldDuration: matchResults.avgHoldDuration,
      avgHoldWeight: matchResults.avgHoldWeight,
      pointsEarned: matchResults.pointsEarned,
      prizeWon: matchResults.prizeWon,
      prizeEligible: matchResults.prizeEligible,
      rankTierAtTime: matchResults.rankTierAtTime,
      finalEquity: matchResults.finalEquity,
      closeReasonStats: matchResults.closeReasonStats,
      createdAt: matchResults.createdAt,
      competitionTitle: competitions.title,
      competitionNumber: competitions.competitionNumber,
    })
    .from(matchResults)
    .leftJoin(competitions, eq(matchResults.competitionId, competitions.id))
    .where(eq(matchResults.arenaAccountId, arenaAccountId))
    .orderBy(desc(matchResults.createdAt))
    .limit(limit);

  const competitionIds = Array.from(new Set(rows.map((row) => row.competitionId)));
  const participantCounts = competitionIds.length > 0
    ? await db
        .select({
          competitionId: matchResults.competitionId,
          count: sql<number>`COUNT(*)`,
        })
        .from(matchResults)
        .where(inArray(matchResults.competitionId, competitionIds))
        .groupBy(matchResults.competitionId)
    : [];
  const participantCountMap = new Map(participantCounts.map((row) => [row.competitionId, row.count]));

  return rows.map((row) => ({
    ...row,
    competitionTitle: row.competitionTitle ?? `Competition #${row.competitionId}`,
    competitionNumber: row.competitionNumber ?? 0,
    participantCount: participantCountMap.get(row.competitionId) ?? 0,
  }));
}

export async function getMatchResult(
  competitionId: number,
  arenaAccountId: number,
): Promise<typeof matchResults.$inferSelect | null> {
  const rows = await db
    .select()
    .from(matchResults)
    .where(
      and(
        eq(matchResults.competitionId, competitionId),
        eq(matchResults.arenaAccountId, arenaAccountId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// ─── Notification Helpers ────────────────────────────────────────────────────

export async function insertNotification(
  input: {
    arenaAccountId: number;
    type: string;
    title: string;
    message?: string;
    competitionId?: number;
    actionUrl?: string;
  },
): Promise<number> {
  const now = Date.now();
  const result = await db.insert(notifications).values({
    ...input,
    isRead: 0,
    createdAt: now,
  });
  return Number(result[0].insertId);
}

export async function getNotificationsForUser(
  arenaAccountId: number,
  limit: number = 50,
): Promise<Array<typeof notifications.$inferSelect>> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.arenaAccountId, arenaAccountId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(
  arenaAccountId: number,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.arenaAccountId, arenaAccountId),
        eq(notifications.isRead, 0),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function markNotificationRead(
  id: number,
  arenaAccountId: number,
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: 1 })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.arenaAccountId, arenaAccountId),
      ),
    );
}

export async function markAllNotificationsRead(
  arenaAccountId: number,
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: 1 })
    .where(
      and(
        eq(notifications.arenaAccountId, arenaAccountId),
        eq(notifications.isRead, 0),
      ),
    );
}

// ─── Profile Helpers ─────────────────────────────────────────────────────────

export async function getOrCreateProfile(
  arenaAccountId: number,
): Promise<typeof userProfiles.$inferSelect> {
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.arenaAccountId, arenaAccountId))
    .limit(1);
  if (existing[0]) {
    return existing[0];
  }
  const now = Date.now();
  await db.insert(userProfiles).values({
    arenaAccountId,
    participantType: "independent",
    isProfilePublic: 1,
    updatedAt: now,
  });
  // Re-fetch the newly created row to return all defaulted columns
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.arenaAccountId, arenaAccountId))
    .limit(1);
  return rows[0]!;
}

export async function updateProfile(
  arenaAccountId: number,
  updates: Partial<typeof userProfiles.$inferInsert>,
): Promise<void> {
  await db
    .update(userProfiles)
    .set({ ...updates, updatedAt: Date.now() })
    .where(eq(userProfiles.arenaAccountId, arenaAccountId));
}

export async function getProfileByAccountId(
  arenaAccountId: number,
): Promise<typeof userProfiles.$inferSelect | null> {
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.arenaAccountId, arenaAccountId))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Institution Helpers ─────────────────────────────────────────────────────

export async function searchInstitutions(
  query: string,
  limit: number = 20,
): Promise<Array<typeof institutions.$inferSelect>> {
  return db
    .select()
    .from(institutions)
    .where(sql`${institutions.name} LIKE ${`%${query.replace(/[%_\\]/g, '\\$&')}%`}`)
    .limit(limit);
}

export async function getInstitutionById(
  id: number,
): Promise<typeof institutions.$inferSelect | null> {
  const rows = await db
    .select()
    .from(institutions)
    .where(eq(institutions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createInstitution(
  input: {
    name: string;
    nameEn?: string;
    shortName?: string;
    type?: string;
    country: string;
    region?: string;
    city?: string;
    logoUrl?: string;
    verified?: number;
  },
): Promise<number> {
  const now = Date.now();
  const result = await db.insert(institutions).values({
    ...input,
    memberCount: 0,
    createdAt: now,
  });
  return Number(result[0].insertId);
}

// ─── Duel Pair Helpers ────────────────────────────────────────────────────
/**
 * Find the active duel pair (two competitions sharing the same duelPairId).
 * Returns the pair sorted by participantMode: human first, agent second.
 * Picks the most recently created duelPairId that has at least one live competition.
 */
export async function getActiveDuelPair(): Promise<Array<typeof competitions.$inferSelect>> {
  const candidates = await db
    .select()
    .from(competitions)
    .where(
      and(
        sql`${competitions.duelPairId} IS NOT NULL`,
        eq(competitions.archived, 0),
      ),
    )
    .orderBy(desc(competitions.startTime));

  const groups = new Map<number, Array<typeof competitions.$inferSelect>>();
  for (const comp of candidates) {
    if (!comp.duelPairId) continue;
    if (!groups.has(comp.duelPairId)) groups.set(comp.duelPairId, []);
    groups.get(comp.duelPairId)!.push(comp);
  }

  const sortHumanFirst = (pair: Array<typeof competitions.$inferSelect>) =>
    pair.sort((a, b) => {
      if ((a.participantMode ?? "human") === "human") return -1;
      if ((b.participantMode ?? "human") === "human") return 1;
      return 0;
    });

  // Prefer a group with at least one live competition
  for (const [, pair] of Array.from(groups)) {
    if (pair.some((c) => c.status === "live") && pair.length >= 2) {
      return sortHumanFirst(pair);
    }
  }

  // Fallback: return the most recent pair
  for (const [, pair] of Array.from(groups)) {
    if (pair.length >= 2) return sortHumanFirst(pair);
  }

  return [];
}
