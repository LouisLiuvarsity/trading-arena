/**
 * server/stats-routes.ts — Public geographic and institutional statistics
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { userProfiles, institutions, matchResults, arenaAccounts } from "../drizzle/schema";
import { eq, sql, desc } from "drizzle-orm";

export function registerStatsRoutes(app: Express) {
  /**
   * GET /api/stats/overview
   * Platform-wide statistics
   */
  app.get("/api/stats/overview", async (_req: Request, res: Response) => {
    try {
      // Total players
      const playerRows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(arenaAccounts);
      const totalPlayers = playerRows[0]?.count ?? 0;

      // Total trades (from match_results)
      const tradeRows = await db
        .select({ total: sql<number>`COALESCE(SUM(${matchResults.tradesCount}), 0)` })
        .from(matchResults);
      const totalTrades = tradeRows[0]?.total ?? 0;

      // Total competitions completed
      const compRows = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${matchResults.competitionId})` })
        .from(matchResults);
      const totalCompetitions = compRows[0]?.count ?? 0;

      // Total prize distributed
      const prizeRows = await db
        .select({ total: sql<number>`COALESCE(SUM(${matchResults.prizeWon}), 0)` })
        .from(matchResults);
      const totalPrize = prizeRows[0]?.total ?? 0;

      // Countries represented
      const countryRows = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${userProfiles.country})` })
        .from(userProfiles);
      const totalCountries = countryRows[0]?.count ?? 0;

      // Institutions
      const instRows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(institutions);
      const totalInstitutions = instRows[0]?.count ?? 0;

      res.json({
        totalPlayers,
        totalTrades,
        totalCompetitions,
        totalPrize: Math.round(totalPrize * 100) / 100,
        totalCountries,
        totalInstitutions,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/stats/countries
   * Leaderboard by country
   */
  app.get("/api/stats/countries", async (_req: Request, res: Response) => {
    try {
      const rows = await db
        .select({
          country: userProfiles.country,
          participantCount: sql<number>`COUNT(DISTINCT ${userProfiles.arenaAccountId})`,
          totalPrize: sql<number>`COALESCE(SUM(${matchResults.prizeWon}), 0)`,
          avgPnlPct: sql<number>`COALESCE(AVG(${matchResults.totalPnlPct}), 0)`,
          competitionCount: sql<number>`COUNT(${matchResults.id})`,
        })
        .from(userProfiles)
        .leftJoin(matchResults, eq(userProfiles.arenaAccountId, matchResults.arenaAccountId))
        .groupBy(userProfiles.country)
        .orderBy(desc(sql`participantCount`))
        .limit(50);

      res.json(
        rows
          .filter((r) => r.country)
          .map((r) => ({
            country: r.country,
            participantCount: r.participantCount,
            totalPrize: Math.round((r.totalPrize ?? 0) * 100) / 100,
            avgPnlPct: Math.round((r.avgPnlPct ?? 0) * 10) / 10,
            competitionCount: r.competitionCount,
          })),
      );
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/stats/institutions?type=university&country=CN&limit=50
   * Leaderboard by institution
   */
  app.get("/api/stats/institutions", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 100);

      const rows = await db
        .select({
          institutionId: userProfiles.institutionId,
          institutionName: userProfiles.institutionName,
          country: userProfiles.country,
          memberCount: sql<number>`COUNT(DISTINCT ${userProfiles.arenaAccountId})`,
          totalPrize: sql<number>`COALESCE(SUM(${matchResults.prizeWon}), 0)`,
          avgPnlPct: sql<number>`COALESCE(AVG(${matchResults.totalPnlPct}), 0)`,
          competitionCount: sql<number>`COUNT(${matchResults.id})`,
          bestRank: sql<number>`COALESCE(MIN(${matchResults.finalRank}), 999)`,
        })
        .from(userProfiles)
        .leftJoin(matchResults, eq(userProfiles.arenaAccountId, matchResults.arenaAccountId))
        .where(sql`${userProfiles.institutionName} IS NOT NULL AND ${userProfiles.institutionName} != ''`)
        .groupBy(userProfiles.institutionId, userProfiles.institutionName, userProfiles.country)
        .orderBy(desc(sql`memberCount`))
        .limit(limit);

      res.json(
        rows.map((r) => ({
          institutionId: r.institutionId,
          name: r.institutionName,
          country: r.country,
          memberCount: r.memberCount,
          totalPrize: Math.round((r.totalPrize ?? 0) * 100) / 100,
          avgPnlPct: Math.round((r.avgPnlPct ?? 0) * 10) / 10,
          competitionCount: r.competitionCount,
          bestRank: r.bestRank,
        })),
      );
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
}
