/**
 * server/competition-engine.ts — Competition lifecycle state machine
 *
 * Manages the competition lifecycle:
 *   draft → announced → registration_open → registration_closed → live → settling → completed
 *
 * When a competition transitions to "live", it creates a matches row to bridge
 * with ArenaEngine. ArenaEngine handles all trade execution, TP/SL, leaderboard
 * building, etc. This engine handles everything else.
 */

import type { ArenaEngine } from "./engine";
import type { MarketService } from "./market";
import * as compDb from "./competition-db";
import * as db from "./db";
import { db as dbInstance } from "./db";
import { getRankTier } from "./constants";
import { TRADING_PAIR } from "../shared/tradingPair";

type CompetitionRow = Awaited<ReturnType<typeof compDb.getCompetitionById>>;

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["announced", "cancelled"],
  announced: ["registration_open", "cancelled"],
  registration_open: ["registration_closed", "cancelled"],
  registration_closed: ["live", "cancelled"],
  live: ["settling"],
  settling: ["completed"],
};

export class CompetitionEngine {
  private settlingLock = new Set<number>();
  private lastDecayMonth: string | null = null;

  constructor(
    private readonly arena: ArenaEngine,
    private readonly market: MarketService,
  ) {}

  // ─── Tick (called every second) ─────────────────────────────

  async tick(): Promise<void> {
    const now = Date.now();
    await this.autoTransitions(now);
    await this.tickLiveCompetitions(now);
    await this.checkMonthlyDecay(now);
  }

  /** Time-driven automatic status transitions */
  private async autoTransitions(now: number): Promise<void> {
    // announced → registration_open
    const toOpen = await compDb.getCompetitionsByStatus("announced");
    for (const comp of toOpen) {
      if (comp.registrationOpenAt && now >= comp.registrationOpenAt) {
        try {
          await this.transitionStatus(comp.id, "registration_open");
        } catch (error) {
          console.error(`[competition:auto-open:${comp.id}]`, error);
        }
      }
    }

    // registration_open → registration_closed
    const toClose = await compDb.getCompetitionsByStatus("registration_open");
    for (const comp of toClose) {
      if (comp.registrationCloseAt && now >= comp.registrationCloseAt) {
        try {
          await this.transitionStatus(comp.id, "registration_closed");
        } catch (error) {
          console.error(`[competition:auto-close:${comp.id}]`, error);
        }
      }
    }

    // registration_closed → live (when startTime reached)
    const toStart = await compDb.getCompetitionsByStatus("registration_closed");
    for (const comp of toStart) {
      if (now >= comp.startTime) {
        try {
          await this.startCompetition(comp);
        } catch (error) {
          console.error(`[competition:auto-start:${comp.id}]`, error);
        }
      }
    }
  }

  /** Check live competitions for expiration */
  private async tickLiveCompetitions(now: number): Promise<void> {
    const live = await compDb.getLiveCompetitions();
    for (const comp of live) {
      if (now >= comp.endTime) {
        try {
          await this.settleCompetition(comp);
        } catch (error) {
          console.error(`[competition:settle:${comp.id}]`, error);
        }
      }
    }
  }

  // ─── Monthly Season Points Decay ───────────────────────────

  /**
   * At the start of each new month, apply season points decay (×0.8).
   * Runs once per month, triggered by the tick loop.
   */
  private async checkMonthlyDecay(now: number): Promise<void> {
    const d = new Date(now);
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (this.lastDecayMonth === monthKey) return;

    // On first boot, just record the current month without decaying
    if (this.lastDecayMonth === null) {
      this.lastDecayMonth = monthKey;
      return;
    }

    // New month detected — apply decay
    const season = await compDb.getActiveSeason();
    const factor = season?.pointsDecayFactor ?? 0.8;
    try {
      await db.applySeasonPointsDecay(factor);
      console.log(`[decay] Applied season points decay ×${factor} for month ${monthKey}`);
      this.lastDecayMonth = monthKey;
    } catch (error) {
      console.error("[decay] Failed to apply season points decay:", error);
    }
  }

  // ─── Status Transitions ────────────────────────────────────

  /** Admin or auto: transition competition to new status */
  async transitionStatus(competitionId: number, targetStatus: string, adminId?: number): Promise<void> {
    const comp = await compDb.getCompetitionById(competitionId);
    if (!comp) throw new Error("Competition not found");

    const allowed = VALID_TRANSITIONS[comp.status];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new Error(`Cannot transition from "${comp.status}" to "${targetStatus}"`);
    }

    if (targetStatus === "live") {
      await this.startCompetition(comp);
      return;
    }

    await compDb.updateCompetitionStatus(competitionId, targetStatus);

    // Send notifications on key transitions
    if (targetStatus === "registration_open") {
      await this.notifyRegistrationOpen(comp);
    }
  }

  // ─── Competition Start ─────────────────────────────────────

  private async startCompetition(comp: NonNullable<CompetitionRow>): Promise<void> {
    if (Date.now() >= comp.endTime) {
      await compDb.updateCompetitionStatus(comp.id, "cancelled");
      throw new Error(`Competition "${comp.title}" already passed its end time`);
    }

    const blockingLive = (await compDb.getLiveCompetitions()).find((live) => live.id !== comp.id);
    if (blockingLive) {
      throw new Error(`Cannot start "${comp.title}" while "${blockingLive.title}" is still live`);
    }

    // Verify minimum participants
    const acceptedCount = await compDb.countRegistrations(comp.id, "accepted");
    if (acceptedCount < comp.minParticipants) {
      await compDb.updateCompetitionStatus(comp.id, "cancelled");
      // Notify all registered users
      const registrations = await compDb.listRegistrations(comp.id);
      for (const reg of registrations) {
        await compDb.insertNotification({
          arenaAccountId: reg.arenaAccountId,
          type: "competition_cancelled",
          title: `${comp.title} 已取消`,
          message: `参赛人数不足（需要${comp.minParticipants}人，仅${acceptedCount}人报名）`,
          competitionId: comp.id,
          actionUrl: "/competitions",
        });
      }
      return;
    }

    // Switch market data feed to this competition's symbol
    this.market.setSymbol(comp.symbol);

    // Create a matches row for ArenaEngine compatibility
    const matchId = await db.createMatch(
      comp.competitionNumber,
      comp.startTime,
      comp.endTime,
    );

    // Bridge: link competition to match
    await compDb.setCompetitionMatchId(comp.id, matchId);
    await compDb.updateCompetitionStatus(comp.id, "live");

    // Notify accepted participants
    const accepted = await compDb.getAcceptedAccountIds(comp.id);
    for (const accountId of accepted) {
      await compDb.insertNotification({
        arenaAccountId: accountId,
        type: "competition_started",
        title: `${comp.title} 已开始！`,
        message: "比赛已开始，点击进入交易",
        competitionId: comp.id,
        actionUrl: `/arena/${comp.id}`,
      });
    }
  }

  // ─── Competition Settlement ─────────────────────────────────

  private async settleCompetition(comp: NonNullable<CompetitionRow>): Promise<void> {
    if (this.settlingLock.has(comp.id)) return;
    this.settlingLock.add(comp.id);

    try {
      await compDb.updateCompetitionStatus(comp.id, "settling");

      if (!comp.matchId) {
        console.error(`[settle] Competition ${comp.id} has no matchId bridge`);
        await compDb.updateCompetitionStatus(comp.id, "completed");
        return;
      }

      // 1. Close open positions for competition participants only
      const acceptedIds = new Set(await compDb.getAcceptedAccountIds(comp.id));
      const allPositions = await db.getAllPositions();
      const openPositions = allPositions.filter(p => acceptedIds.has(p.arenaAccountId));
      for (const pos of openPositions) {
        try {
          // Use ArenaEngine's internal close (which handles PnL + fee + trade record)
          await this.arena.closePositionInternal(
            {
              arenaAccountId: pos.arenaAccountId,
              competitionId: pos.competitionId,
              direction: pos.direction,
              size: pos.size,
              entryPrice: pos.entryPrice,
              openTime: pos.openTime,
              takeProfit: pos.takeProfit,
              stopLoss: pos.stopLoss,
              tradeNumber: pos.tradeNumber,
            },
            "match_end",
          );
        } catch (err) {
          if ((err as Error).message !== "Position already closed") {
            console.error("[settle] close position error:", err);
          }
        }
      }

      // 2. Build final leaderboard scoped to competition participants only
      const leaderboard = await this.arena.buildLeaderboard(comp.matchId!, acceptedIds, comp.id);
      const participantLeaderboard = leaderboard;

      // 3-5. Write match_results, award season points, complete match — all in one transaction
      // Prepare trade data outside transaction to minimize lock time
      const tradeDataByAccount = new Map<number, Awaited<ReturnType<typeof db.getTradesForUserMatch>>>();
      for (const row of participantLeaderboard) {
        tradeDataByAccount.set(row.arenaAccountId, await db.getTradesForUserMatch(row.arenaAccountId, comp.matchId!));
      }

      await dbInstance.transaction(async (tx) => {
        // 3. Write match_results for every participant
        for (const row of participantLeaderboard) {
          const trades = tradeDataByAccount.get(row.arenaAccountId) ?? [];
          const wins = trades.filter((t: any) => t.pnl > 0);
          const losses = trades.filter((t: any) => t.pnl < 0);
          const closeReasons: Record<string, number> = {};
          for (const t of trades) {
            closeReasons[t.closeReason] = (closeReasons[t.closeReason] || 0) + 1;
          }

          const account = await db.getArenaAccountById(row.arenaAccountId, tx);
          const tier = getRankTier(account?.seasonPoints ?? 0);

          await compDb.insertMatchResult({
            competitionId: comp.id,
            arenaAccountId: row.arenaAccountId,
            finalRank: row.rank,
            totalPnl: row.pnl,
            totalPnlPct: row.pnlPct,
            totalWeightedPnl: row.weightedPnl,
            tradesCount: trades.length,
            winCount: wins.length,
            lossCount: losses.length,
            bestTradePnl: trades.length ? Math.max(...trades.map((t: any) => t.pnl)) : undefined,
            worstTradePnl: trades.length ? Math.min(...trades.map((t: any) => t.pnl)) : undefined,
            avgHoldDuration: trades.length
              ? trades.reduce((s: number, t: any) => s + t.holdDuration, 0) / trades.length
              : undefined,
            avgHoldWeight: trades.length
              ? trades.reduce((s: number, t: any) => s + t.holdWeight, 0) / trades.length
              : undefined,
            pointsEarned: row.matchPoints,
            prizeWon: row.prizeAmount,
            prizeEligible: row.prizeEligible ? 1 : 0,
            rankTierAtTime: tier.tier,
            finalEquity: comp.startingCapital + row.pnl,
            closeReasonStats: JSON.stringify(closeReasons),
          }, tx);
        }

        // 4. Award season points
        for (const row of leaderboard) {
          if (row.matchPoints > 0) {
            await db.updateSeasonPoints(row.arenaAccountId, row.matchPoints, tx);
          }
        }

        // 5. Complete the match in the legacy system
        await db.completeMatch(comp.matchId!, tx);
      });

      // 6. Notify participants
      for (const row of leaderboard) {
        const prizeText = row.prizeAmount > 0 ? ` · 奖金 ${row.prizeAmount}U` : "";
        await compDb.insertNotification({
          arenaAccountId: row.arenaAccountId,
          type: "competition_ended",
          title: `${comp.title} 已结束`,
          message: `第${row.rank}名 · PnL ${row.pnlPct > 0 ? "+" : ""}${row.pnlPct.toFixed(1)}% · +${row.matchPoints}pts${prizeText}`,
          competitionId: comp.id,
          actionUrl: `/results/${comp.id}`,
        });
      }

      // 7. Mark completed
      await compDb.updateCompetitionStatus(comp.id, "completed");

      // 8. Reset market feed to default symbol
      const remainingLive = (await compDb.getLiveCompetitions()).filter((live) => live.id !== comp.id);
      this.market.setSymbol(remainingLive[0]?.symbol ?? TRADING_PAIR.symbol);
    } finally {
      this.settlingLock.delete(comp.id);
    }
  }

  // ─── Registration ──────────────────────────────────────────

  async register(competitionId: number, arenaAccountId: number): Promise<void> {
    const comp = await compDb.getCompetitionById(competitionId);
    if (!comp) throw new Error("Competition not found");
    if (comp.status !== "registration_open") throw new Error("Registration is not open");

    // Check eligibility
    const account = await db.getArenaAccountById(arenaAccountId);
    if (!account) throw new Error("Account not found");

    if (comp.requireMinSeasonPoints > 0 && account.seasonPoints < comp.requireMinSeasonPoints) {
      throw new Error(`Minimum ${comp.requireMinSeasonPoints} season points required`);
    }

    if (comp.requireMinTier) {
      const tier = getRankTier(account.seasonPoints);
      const tierOrder = ["iron", "bronze", "silver", "gold", "platinum", "diamond"];
      if (tierOrder.indexOf(tier.tier) < tierOrder.indexOf(comp.requireMinTier)) {
        throw new Error(`Minimum ${comp.requireMinTier} tier required`);
      }
    }

    // Check not already registered
    const existing = await compDb.getRegistration(competitionId, arenaAccountId);
    if (existing && existing.status !== "withdrawn") {
      throw new Error("Already registered");
    }

    // Check capacity (only count active registrations, not withdrawn/rejected)
    const acceptedCount = await compDb.countRegistrations(competitionId, "accepted");
    const pendingCount = await compDb.countRegistrations(competitionId, "pending");
    const currentCount = acceptedCount + pendingCount;
    if (currentCount >= comp.maxParticipants) {
      throw new Error("Competition is full");
    }

    await compDb.createRegistration(competitionId, arenaAccountId);
  }

  async withdraw(competitionId: number, arenaAccountId: number): Promise<void> {
    const reg = await compDb.getRegistration(competitionId, arenaAccountId);
    if (!reg) throw new Error("Not registered");
    if (reg.status === "withdrawn") throw new Error("Already withdrawn");

    const comp = await compDb.getCompetitionById(competitionId);
    if (comp && (comp.status === "live" || comp.status === "settling" || comp.status === "completed")) {
      throw new Error("Cannot withdraw from an active or completed competition");
    }

    await compDb.withdrawRegistration(competitionId, arenaAccountId);
  }

  async reviewRegistration(
    registrationId: number,
    decision: "accepted" | "rejected" | "waitlisted",
    adminId: number,
  ): Promise<void> {
    const reg = await compDb.getRegistrationById(registrationId);
    if (!reg) throw new Error("Registration not found");
    if (reg.status !== "pending" && reg.status !== "waitlisted") {
      throw new Error(`Cannot review registration with status "${reg.status}"`);
    }

    await compDb.updateRegistrationStatus(registrationId, decision, adminId);

    // Notify user
    const comp = await compDb.getCompetitionById(reg.competitionId);
    const title = comp?.title ?? `Competition #${reg.competitionId}`;

    if (decision === "accepted") {
      await compDb.insertNotification({
        arenaAccountId: reg.arenaAccountId,
        type: "registration_accepted",
        title: "入选通知",
        message: `你已入选 ${title}！`,
        competitionId: reg.competitionId,
        actionUrl: `/competitions/${comp?.slug ?? reg.competitionId}`,
      });
    } else if (decision === "rejected") {
      await compDb.insertNotification({
        arenaAccountId: reg.arenaAccountId,
        type: "registration_rejected",
        title: "未入选通知",
        message: `很遗憾，${title} 名额已满`,
        competitionId: reg.competitionId,
        actionUrl: "/competitions",
      });
    }
  }

  async batchReview(
    competitionId: number,
    registrationIds: number[],
    decision: "accepted" | "rejected",
    adminId: number,
  ): Promise<number> {
    let count = 0;
    for (const id of registrationIds) {
      try {
        await this.reviewRegistration(id, decision, adminId);
        count++;
      } catch {
        // skip invalid registrations
      }
    }
    return count;
  }

  // ─── Hub Data ──────────────────────────────────────────────

  async getHubData(arenaAccountId: number): Promise<any> {
    const account = await db.getArenaAccountById(arenaAccountId);
    if (!account) throw new Error("Account not found");

    // Active competition (user is participating in a live competition)
    let activeCompetition: any = null;
    const liveComps = await compDb.getLiveCompetitions();
    for (const comp of liveComps) {
      const reg = await compDb.getRegistration(comp.id, arenaAccountId);
      if (reg && reg.status === "accepted" && comp.matchId) {
        const acceptedIds = new Set(await compDb.getAcceptedAccountIds(comp.id));
        const leaderboard = await this.arena.buildLeaderboard(comp.matchId!, acceptedIds, comp.id);
        const me = leaderboard.find((r: any) => r.arenaAccountId === arenaAccountId);
        activeCompetition = {
          id: comp.id,
          slug: comp.slug,
          title: comp.title,
          competitionType: comp.competitionType,
          startTime: comp.startTime,
          endTime: comp.endTime,
          remainingSeconds: Math.max(0, Math.floor((comp.endTime - Date.now()) / 1000)),
          myRank: me?.rank ?? 0,
          myPnlPct: me?.pnlPct ?? 0,
          participantCount: leaderboard.length,
          prizePool: comp.prizePool,
        };
        break;
      }
    }

    // My registrations — query all registrations for this user
    const rawRegs = await compDb.getRegistrationsForAccount(arenaAccountId);
    const myRegistrations = [];
    for (const reg of rawRegs) {
      const comp = await compDb.getCompetitionById(reg.competitionId);
      if (!comp) continue;
      myRegistrations.push({
        competitionId: comp.id,
        competitionTitle: comp.title,
        competitionType: comp.competitionType,
        status: reg.status,
        startTime: comp.startTime,
        appliedAt: reg.appliedAt,
      });
    }

    // Upcoming competitions
    const upcoming = await compDb.getCompetitionsByStatus("registration_open");
    const announced = await compDb.getCompetitionsByStatus("announced");
    const closed = await compDb.getCompetitionsByStatus("registration_closed");
    const allUpcoming = [...announced, ...upcoming, ...closed]
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 5);

    // Build summaries with registration counts
    const upcomingCompetitions = [];
    for (const comp of allUpcoming) {
      const registered = await compDb.countRegistrations(comp.id);
      const accepted = await compDb.countRegistrations(comp.id, "accepted");
      const myReg = await compDb.getRegistration(comp.id, arenaAccountId);
      upcomingCompetitions.push({
        id: comp.id,
        slug: comp.slug,
        title: comp.title,
        competitionNumber: comp.competitionNumber,
        competitionType: comp.competitionType,
        status: comp.status,
        maxParticipants: comp.maxParticipants,
        registeredCount: registered,
        acceptedCount: accepted,
        prizePool: comp.prizePool,
        symbol: comp.symbol,
        startTime: comp.startTime,
        endTime: comp.endTime,
        registrationOpenAt: comp.registrationOpenAt,
        registrationCloseAt: comp.registrationCloseAt,
        coverImageUrl: comp.coverImageUrl ?? null,
        myRegistrationStatus: myReg?.status ?? null,
      });
    }

    // Season
    const season = await compDb.getActiveSeason();

    // Recent results
    const recentResults = await compDb.getMatchResultsForUser(arenaAccountId, 5);

    // Quick stats
    const allResults = await compDb.getMatchResultsForUser(arenaAccountId, 1000);
    const totalWins = allResults.reduce((s, r) => s + (r.winCount ?? 0), 0);
    const totalTrades = allResults.reduce((s, r) => s + (r.tradesCount ?? 0), 0);

    const quickStats = {
      totalCompetitions: allResults.length,
      winRate: totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0,
      totalPrizeWon: allResults.reduce((s, r) => s + (r.prizeWon ?? 0), 0),
      bestRank: allResults.length ? Math.min(...allResults.map((r) => r.finalRank)) : 0,
      avgPnlPct: allResults.length
        ? Math.round(
            (allResults.reduce((s, r) => s + (r.totalPnlPct ?? 0), 0) / allResults.length) * 10,
          ) / 10
        : 0,
    };

    // Unread notifications
    const unreadNotificationCount = await compDb.getUnreadCount(arenaAccountId);

    const tier = getRankTier(account.seasonPoints);
    const tierOrder = ["iron", "bronze", "silver", "gold", "platinum", "diamond"];
    const tierIdx = tierOrder.indexOf(tier.tier);
    const tiers = [
      { tier: "iron", min: 0 },
      { tier: "bronze", min: 100 },
      { tier: "silver", min: 300 },
      { tier: "gold", min: 600 },
      { tier: "platinum", min: 1000 },
      { tier: "diamond", min: 1500 },
    ];
    const nextTierMin = tierIdx < 5 ? tiers[tierIdx + 1].min : Infinity;

    // Compute grand final qualification using season rank score (top 500)
    const GRAND_FINAL_QUALIFY_COUNT = 500;
    let grandFinalQualified = false;
    let grandFinalLine = 0;
    if (season) {
      const avgHoldWeight = await db.getAvgHoldWeightForUser(arenaAccountId, season.id);
      const mySeasonRankScore = Math.round(account.seasonPoints * avgHoldWeight * 100) / 100;
      grandFinalLine = await db.getGrandFinalLine(GRAND_FINAL_QUALIFY_COUNT, season.id);
      grandFinalQualified = mySeasonRankScore >= grandFinalLine && mySeasonRankScore > 0;
    }

    return {
      activeCompetition,
      myRegistrations: myRegistrations.filter((r: any) => r.status !== "withdrawn"),
      upcomingCompetitions,
      season: season
        ? {
            id: season.id,
            name: season.name,
            slug: season.slug,
            matchesTotal: 15,
            matchesCompleted: allResults.length,
            mySeasonPoints: account.seasonPoints,
            myRankTier: tier.tier,
            pointsToNextTier: Math.max(0, nextTierMin - account.seasonPoints),
            grandFinalQualified,
            grandFinalLine,
            pointsCurve: [],
          }
        : null,
      recentResults: await Promise.all(recentResults.map(async (r) => {
        const comp = await compDb.getCompetitionById(r.competitionId);
        const participantCount = comp ? await compDb.countRegistrations(comp.id, "accepted") : 0;
        return {
          competitionId: r.competitionId,
          competitionTitle: comp?.title ?? "",
          competitionNumber: comp?.competitionNumber ?? 0,
          finalRank: r.finalRank,
          totalPnl: r.totalPnl,
          totalPnlPct: r.totalPnlPct,
          totalWeightedPnl: r.totalWeightedPnl,
          tradesCount: r.tradesCount,
          winCount: r.winCount,
          lossCount: r.lossCount,
          pointsEarned: r.pointsEarned,
          prizeWon: r.prizeWon,
          prizeEligible: !!r.prizeEligible,
          participantCount,
          createdAt: r.createdAt,
        };
      })),
      quickStats,
      unreadNotificationCount,
    };
  }

  // ─── Notifications ──────────────────────────────────────────

  private async notifyRegistrationOpen(comp: NonNullable<CompetitionRow>): Promise<void> {
    // For now, no mass notification — users discover via the competitions page.
    // Future: notify users who have opted into competition alerts.
  }
}
