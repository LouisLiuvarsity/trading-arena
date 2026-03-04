/**
 * server/analytics-routes.ts — Trading analytics API
 *
 * Aggregates trades data for personal analytics dashboards.
 */

import type { Express, Request, Response } from "express";
import type { ArenaEngine } from "./engine";
import { db } from "./db";
import { trades } from "../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

export function registerAnalyticsRoutes(app: Express, arenaEngine: ArenaEngine) {
  /**
   * GET /api/me/analytics
   *
   * Returns comprehensive trading analytics for the authenticated user.
   * Optional query: ?competitionId=X to filter by competition.
   */
  app.get("/api/me/analytics", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const accountId = account.id;

      // Fetch all trades for this user (or filtered by competition)
      const allTrades = await db
        .select()
        .from(trades)
        .where(eq(trades.arenaAccountId, accountId))
        .orderBy(desc(trades.closeTime))
        .limit(2000);

      if (allTrades.length === 0) {
        res.json({
          summary: { totalTrades: 0, winRate: 0, avgPnlPerTrade: 0, avgHoldDuration: 0, avgHoldWeight: 0, profitFactor: 0 },
          pnlDistribution: [],
          byDirection: { long: { count: 0, wins: 0, losses: 0, totalPnl: 0, avgPnl: 0, avgHoldDuration: 0 }, short: { count: 0, wins: 0, losses: 0, totalPnl: 0, avgPnl: 0, avgHoldDuration: 0 } },
          byCloseReason: {},
          holdDurationVsPnl: [],
          equityCurve: [],
          streaks: { currentStreak: 0, longestWinStreak: 0, longestLossStreak: 0 },
          byHour: [],
        });
        return;
      }

      // Summary stats
      const wins = allTrades.filter((t) => t.pnl > 0);
      const losses = allTrades.filter((t) => t.pnl <= 0);
      const totalPnl = allTrades.reduce((s, t) => s + t.pnl, 0);
      const totalProfit = wins.reduce((s, t) => s + t.pnl, 0);
      const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

      const summary = {
        totalTrades: allTrades.length,
        winRate: Math.round((wins.length / allTrades.length) * 1000) / 10,
        avgPnlPerTrade: Math.round((totalPnl / allTrades.length) * 100) / 100,
        avgHoldDuration: Math.round(allTrades.reduce((s, t) => s + t.holdDuration, 0) / allTrades.length),
        avgHoldWeight: Math.round((allTrades.reduce((s, t) => s + t.holdWeight, 0) / allTrades.length) * 100) / 100,
        profitFactor: totalLoss > 0 ? Math.round((totalProfit / totalLoss) * 100) / 100 : totalProfit > 0 ? Infinity : 0,
      };

      // PnL distribution (buckets)
      const buckets = [
        { min: -Infinity, max: -5, label: "<-5%" },
        { min: -5, max: -3, label: "-5%~-3%" },
        { min: -3, max: -1, label: "-3%~-1%" },
        { min: -1, max: 0, label: "-1%~0%" },
        { min: 0, max: 1, label: "0%~1%" },
        { min: 1, max: 3, label: "1%~3%" },
        { min: 3, max: 5, label: "3%~5%" },
        { min: 5, max: Infinity, label: ">5%" },
      ];
      const pnlDistribution = buckets.map((b) => {
        const inBucket = allTrades.filter((t) => t.pnlPct > b.min && t.pnlPct <= b.max);
        return {
          bucket: b.label,
          count: inBucket.length,
          avgPnl: inBucket.length ? Math.round((inBucket.reduce((s, t) => s + t.pnl, 0) / inBucket.length) * 100) / 100 : 0,
        };
      });

      // By direction
      const longTrades = allTrades.filter((t) => t.direction === "long");
      const shortTrades = allTrades.filter((t) => t.direction === "short");
      const dirStats = (arr: typeof allTrades) => ({
        count: arr.length,
        wins: arr.filter((t) => t.pnl > 0).length,
        losses: arr.filter((t) => t.pnl <= 0).length,
        totalPnl: Math.round(arr.reduce((s, t) => s + t.pnl, 0) * 100) / 100,
        avgPnl: arr.length ? Math.round((arr.reduce((s, t) => s + t.pnl, 0) / arr.length) * 100) / 100 : 0,
        avgHoldDuration: arr.length ? Math.round(arr.reduce((s, t) => s + t.holdDuration, 0) / arr.length) : 0,
      });
      const byDirection = { long: dirStats(longTrades), short: dirStats(shortTrades) };

      // By close reason
      const byCloseReason: Record<string, { count: number; avgPnl: number }> = {};
      for (const reason of ["manual", "tp", "sl", "match_end", "time_limit"]) {
        const subset = allTrades.filter((t) => t.closeReason === reason);
        if (subset.length > 0) {
          byCloseReason[reason] = {
            count: subset.length,
            avgPnl: Math.round((subset.reduce((s, t) => s + t.pnl, 0) / subset.length) * 100) / 100,
          };
        }
      }

      // Hold duration vs PnL (scatter data)
      const holdDurationVsPnl = allTrades.slice(0, 500).map((t) => ({
        holdSeconds: Math.round(t.holdDuration),
        pnlPct: Math.round(t.pnlPct * 100) / 100,
        holdWeight: t.holdWeight,
        direction: t.direction,
      }));

      // Equity curve (cumulative)
      const sorted = [...allTrades].sort((a, b) => a.closeTime - b.closeTime);
      let equity = 5000;
      const equityCurve = sorted.map((t, i) => {
        equity += t.pnl;
        return { tradeIndex: i + 1, equity: Math.round(equity * 100) / 100, timestamp: t.closeTime };
      });

      // Streaks
      let currentStreak = 0;
      let longestWinStreak = 0;
      let longestLossStreak = 0;
      let tempWin = 0;
      let tempLoss = 0;
      for (const t of sorted) {
        if (t.pnl > 0) {
          tempWin++;
          tempLoss = 0;
          longestWinStreak = Math.max(longestWinStreak, tempWin);
        } else {
          tempLoss++;
          tempWin = 0;
          longestLossStreak = Math.max(longestLossStreak, tempLoss);
        }
      }
      const lastTrade = sorted[sorted.length - 1];
      if (lastTrade) {
        currentStreak = lastTrade.pnl > 0 ? tempWin : -tempLoss;
      }

      // By UTC hour
      const hourMap = new Map<number, { count: number; totalPnl: number; wins: number }>();
      for (const t of allTrades) {
        const hour = new Date(t.openTime).getUTCHours();
        const entry = hourMap.get(hour) ?? { count: 0, totalPnl: 0, wins: 0 };
        entry.count++;
        entry.totalPnl += t.pnl;
        if (t.pnl > 0) entry.wins++;
        hourMap.set(hour, entry);
      }
      const byHour = Array.from({ length: 24 }, (_, hour) => {
        const entry = hourMap.get(hour);
        return {
          hour,
          count: entry?.count ?? 0,
          avgPnl: entry && entry.count > 0 ? Math.round((entry.totalPnl / entry.count) * 100) / 100 : 0,
          winRate: entry && entry.count > 0 ? Math.round((entry.wins / entry.count) * 1000) / 10 : 0,
        };
      });

      res.json({
        summary,
        pnlDistribution,
        byDirection,
        byCloseReason,
        holdDurationVsPnl,
        equityCurve,
        streaks: { currentStreak, longestWinStreak, longestLossStreak },
        byHour,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
}
