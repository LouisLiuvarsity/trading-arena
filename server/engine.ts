import crypto from "node:crypto";
import { nanoid } from "nanoid";
import * as dbHelpers from "./db";
import { db } from "./db";
import * as compDb from "./competition-db";
import {
  CLOSE_ONLY_SECONDS,
  FEE_RATE,
  MATCH_POINTS_TABLE,
  MATCH_DURATION_MS,
  MAX_TRADES_PER_MATCH,
  MIN_TRADES_FOR_PRIZE,
  REGULAR_PRIZE_TABLE,
  STARTING_CAPITAL,
  getHoldWeight,
  getPointsForRank,
  getPrizeForRank,
  getRankTier,
} from "./constants";
import type { MarketService } from "./market";
import { getSymbolConfig } from "../shared/tradingPair";
import { getBinanceSymbolConfig } from "./binance-symbols";

type ArenaAccount = {
  id: number;
  username: string;
  capital: number;
  seasonPoints: number;
};

type MatchRow = {
  id: number;
  matchNumber: number;
  startTime: number;
  endTime: number;
};

type PositionRow = {
  arenaAccountId: number;
  competitionId?: number | null;
  direction: string;
  size: number;
  entryPrice: number;
  openTime: number;
  takeProfit: number | null;
  stopLoss: number | null;
  tradeNumber: number;
};

type CompetitionRecord = NonNullable<Awaited<ReturnType<typeof compDb.getCompetitionById>>>;

type LeaderboardRow = {
  arenaAccountId: number;
  username: string;
  pnl: number;
  weightedPnl: number;
  pnlPct: number;
  tradesUsed: number;
  rankTier: "iron" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
  rank: number;
  matchPoints: number;
  prizeEligible: boolean;
  prizeAmount: number;
};

type CompetitionContext = {
  competitionId: number;
  matchId: number;
  participantIds: Set<number>;
};

type PrizeRule = { rankMin: number; rankMax: number; prize: number };
type PointsRule = { rankMin: number; rankMax: number; points: number };

type MatchRules = {
  matchId: number;
  competitionId: number | null;
  symbol: string;
  startingCapital: number;
  maxTradesPerMatch: number;
  closeOnlySeconds: number;
  feeRate: number;
  prizePool: number;
  participantIds?: Set<number>;
  prizeTable: PrizeRule[];
  pointsTable: PointsRule[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const DEFAULT_PRIZE_POOL = REGULAR_PRIZE_TABLE.reduce(
  (sum, row) => sum + (row.rankMax - row.rankMin + 1) * row.prize,
  0,
);

function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function monthLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelCn(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function isTerminalCompetitionStatus(status: string): boolean {
  return status === "completed" || status === "ended_early";
}

function compareCompetitionOrder(a: CompetitionRecord, b: CompetitionRecord): number {
  if (a.startTime !== b.startTime) return a.startTime - b.startTime;
  if (a.competitionNumber !== b.competitionNumber) return a.competitionNumber - b.competitionNumber;
  return a.id - b.id;
}

function competitionTypeLabel(type: string): string {
  switch (type) {
    case "grand_final":
      return "总决赛";
    case "practice":
      return "练习赛";
    case "special":
      return "特别赛";
    default:
      return "常规赛";
  }
}

export class ArenaEngine {
  private rankSnapshot = new Map<number, number>();
  private nearPromotionCountSnapshot = 0;
  private nearPromotionDelta = 0;
  private lastRankSnapshotAt = 0;
  private initialized = false;
  private rotationLock = false;
  private lastResolvedRound = "";

  // Leaderboard cache (TTL-based to avoid recomputing per request)
  private leaderboardCache: { matchId: number; rows: LeaderboardRow[]; at: number } | null = null;
  private static LEADERBOARD_CACHE_TTL_MS = 3000; // 3 seconds
  // Promise-based deduplication to prevent concurrent rebuilds
  private leaderboardBuilding: Promise<LeaderboardRow[]> | null = null;

  private readonly legacyAutoRotate: boolean;

  constructor(
    private readonly market: MarketService,
    options?: { legacyAutoRotate?: boolean },
  ) {
    this.legacyAutoRotate = options?.legacyAutoRotate ?? true;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.legacyAutoRotate) {
      await dbHelpers.ensureActiveMatch();
    }
    this.initialized = true;
  }

  async register(email: string, usernameInput: string, password: string): Promise<{ token: string; account: ArenaAccount }> {
    const username = usernameInput.trim();
    if (!username || username.length < 2 || username.length > 20) {
      throw new Error("Username length must be between 2 and 20");
    }
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      throw new Error("Email is required");
    }
    if (!password || password.length < 4) {
      throw new Error("Password must be at least 4 characters");
    }

    const account = await dbHelpers.registerArenaAccount(emailTrimmed, username, password);
    const token = crypto.randomBytes(24).toString("hex");
    await dbHelpers.createArenaSession(account.id, token);

    return { token, account };
  }

  async loginByUsername(usernameInput: string, password: string): Promise<{ token: string; account: ArenaAccount }> {
    const username = usernameInput.trim();
    if (!username || username.length < 2 || username.length > 20) {
      throw new Error("Invalid username");
    }
    if (!password) {
      throw new Error("Password is required");
    }
    const account = await dbHelpers.getArenaAccountByUsernameForLogin(username);
    if (!account) {
      throw new Error("Account not found. Please register first.");
    }
    // Verify password
    if (!account.passwordHash) {
      throw new Error("Account has no password set. Please re-register to set a password.");
    }
    if (!(await dbHelpers.verifyPassword(password, account.passwordHash))) {
      throw new Error("Incorrect password");
    }
    const token = crypto.randomBytes(24).toString("hex");
    await dbHelpers.createArenaSession(account.id, token);
    return { token, account: { id: account.id, username: account.username, capital: account.capital, seasonPoints: account.seasonPoints } };
  }

  async getAccountByToken(token: string | null | undefined): Promise<ArenaAccount | null> {
    if (!token) return null;
    const account = await dbHelpers.getArenaAccountByToken(token);
    if (!account) return null;
    return {
      id: account.id,
      username: account.username,
      capital: account.capital,
      seasonPoints: account.seasonPoints,
    };
  }

  private parsePrizeTable(prizeTableJson: string | null, prizePool: number): PrizeRule[] {
    if (prizeTableJson) {
      try {
        const parsed = JSON.parse(prizeTableJson);
        if (Array.isArray(parsed)) {
          const rows = parsed
            .map((row) => ({
              rankMin: Number((row as any).rankMin),
              rankMax: Number((row as any).rankMax),
              prize: Number((row as any).prize),
            }))
            .filter((row) => Number.isFinite(row.rankMin) && Number.isFinite(row.rankMax) && Number.isFinite(row.prize));
          if (rows.length > 0) return rows;
        }
      } catch {
        // Fall back to the default table when the stored JSON is malformed.
      }
    }

    const scale = DEFAULT_PRIZE_POOL > 0 ? prizePool / DEFAULT_PRIZE_POOL : 1;
    return REGULAR_PRIZE_TABLE.map((row) => ({
      rankMin: row.rankMin,
      rankMax: row.rankMax,
      prize: round2(row.prize * scale),
    }));
  }

  private parsePointsTable(pointsTableJson: string | null): PointsRule[] {
    if (pointsTableJson) {
      try {
        const parsed = JSON.parse(pointsTableJson);
        if (Array.isArray(parsed)) {
          const rows = parsed
            .map((row) => ({
              rankMin: Number((row as any).rankMin),
              rankMax: Number((row as any).rankMax),
              points: Number((row as any).points),
            }))
            .filter((row) => Number.isFinite(row.rankMin) && Number.isFinite(row.rankMax) && Number.isFinite(row.points));
          if (rows.length > 0) return rows;
        }
      } catch {
        // Fall back to the default table when the stored JSON is malformed.
      }
    }

    return MATCH_POINTS_TABLE.map((row) => ({
      rankMin: row.rankMin,
      rankMax: row.rankMax,
      points: row.points,
    }));
  }

  private getPrizeForRankFromRules(rank: number, rules?: MatchRules): number {
    if (!rules) return getPrizeForRank(rank);
    for (const row of rules.prizeTable) {
      if (rank >= row.rankMin && rank <= row.rankMax) return row.prize;
    }
    return 0;
  }

  private getPointsForRankFromRules(rank: number, rules?: MatchRules): number {
    if (!rules) return getPointsForRank(rank);
    for (const row of rules.pointsTable) {
      if (rank >= row.rankMin && rank <= row.rankMax) return row.points;
    }
    return 0;
  }

  private async getLegacyActiveMatch(): Promise<MatchRow | null> {
    const row = await dbHelpers.getActiveMatch();
    if (row) return row;
    if (!this.legacyAutoRotate) return null;
    const now = Date.now();
    const id = await dbHelpers.createMatch(1, now, now + MATCH_DURATION_MS);
    return { id, matchNumber: 1, startTime: now, endTime: now + MATCH_DURATION_MS };
  }

  private async getLegacyMatchRules(): Promise<MatchRules> {
    const active = await this.getLegacyActiveMatch();
    if (!active) {
      throw new Error("No active match");
    }

    return {
      matchId: active.id,
      competitionId: null,
      symbol: this.market.getSymbol(),
      startingCapital: STARTING_CAPITAL,
      maxTradesPerMatch: MAX_TRADES_PER_MATCH,
      closeOnlySeconds: CLOSE_ONLY_SECONDS,
      feeRate: FEE_RATE,
      prizePool: DEFAULT_PRIZE_POOL,
      prizeTable: this.parsePrizeTable(null, DEFAULT_PRIZE_POOL),
      pointsTable: this.parsePointsTable(null),
    };
  }

  private async getCompetitionMatchRules(
    competitionId: number,
    context?: CompetitionContext | null,
  ): Promise<MatchRules> {
    const competition = await compDb.getCompetitionById(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }
    if (!competition.matchId) {
      throw new Error("Competition is not live yet");
    }

    return {
      matchId: context?.matchId ?? competition.matchId,
      competitionId: competition.id,
      symbol: competition.symbol,
      startingCapital: competition.startingCapital,
      maxTradesPerMatch: competition.maxTradesPerMatch,
      closeOnlySeconds: competition.closeOnlySeconds,
      feeRate: competition.feeRate,
      prizePool: competition.prizePool,
      participantIds: context?.participantIds,
      prizeTable: this.parsePrizeTable(competition.prizeTableJson ?? null, competition.prizePool),
      pointsTable: this.parsePointsTable(competition.pointsTableJson ?? null),
    };
  }

  private async getMatchRules(input?: {
    competitionId?: number | null;
    competitionContext?: CompetitionContext | null;
  }): Promise<MatchRules> {
    if (input?.competitionContext) {
      return this.getCompetitionMatchRules(input.competitionContext.competitionId, input.competitionContext);
    }
    if (input?.competitionId) {
      return this.getCompetitionMatchRules(input.competitionId);
    }
    return this.getLegacyMatchRules();
  }

  private async getPositionMatchRules(pos: Pick<PositionRow, "competitionId">): Promise<MatchRules> {
    return this.getMatchRules({ competitionId: pos.competitionId ?? null });
  }

  private async getPublicMatchRules(): Promise<MatchRules | null> {
    const liveCompetitions = await compDb.getLiveCompetitions();
    const live = liveCompetitions.find((comp) => comp.matchId);
    if (live?.matchId) {
      const participantIds = new Set(await compDb.getAcceptedAccountIds(live.id));
      return this.getCompetitionMatchRules(live.id, {
        competitionId: live.id,
        matchId: live.matchId,
        participantIds,
      });
    }

    const active = await this.getLegacyActiveMatch();
    return active ? this.getLegacyMatchRules() : null;
  }

  private async getCompetitionProgressState(competitionId?: number | null): Promise<{
    competition: CompetitionRecord;
    sameTypeCompetitions: CompetitionRecord[];
    currentIndex: number;
    total: number;
  } | null> {
    if (!competitionId) return null;

    const competition = await compDb.getCompetitionById(competitionId);
    if (!competition) return null;

    const seasonCompetitions = await compDb.listCompetitions({ seasonId: competition.seasonId });
    const sameTypeCompetitions = seasonCompetitions
      .filter((item): item is CompetitionRecord =>
        item.competitionType === competition.competitionType && item.status !== "cancelled",
      )
      .sort(compareCompetitionOrder);

    if (!sameTypeCompetitions.some((item) => item.id === competition.id)) {
      sameTypeCompetitions.push(competition);
      sameTypeCompetitions.sort(compareCompetitionOrder);
    }

    const currentIndex = Math.max(0, sameTypeCompetitions.findIndex((item) => item.id === competition.id)) + 1;

    return {
      competition,
      sameTypeCompetitions,
      currentIndex,
      total: Math.max(sameTypeCompetitions.length, 1),
    };
  }

  async recordBehaviorEvent(arenaAccountId: number, eventType: string, payload: unknown, source = "client") {
    await dbHelpers.insertBehaviorEvent({
      arenaAccountId,
      eventType,
      payload: JSON.stringify(payload ?? {}),
      source,
      timestamp: Date.now(),
    });
  }

  async sendChatMessage(arenaAccountId: number, messageInput: string, competitionId?: number | null) {
    const message = messageInput.trim();
    if (!message) return;
    const account = await dbHelpers.getArenaAccountById(arenaAccountId);
    if (!account) return;
    await dbHelpers.insertChatMessage({
      id: `chat-${nanoid(12)}`,
      arenaAccountId,
      competitionId: competitionId ?? null,
      username: account.username,
      message: sanitizeHtml(message).slice(0, 280),
      type: "user",
      timestamp: Date.now(),
    });
  }

  async openPosition(
    arenaAccountId: number,
    input: { direction: "long" | "short"; size: number; tp?: number | null; sl?: number | null },
    competitionContext?: CompetitionContext | null,
  ) {
    await this.rotateMatchIfNeeded();
    const rules = await this.getMatchRules({ competitionContext });
    const matchRow = await dbHelpers.getMatchById(rules.matchId);
    if (!matchRow) {
      throw new Error("Match not found");
    }
    const remainingSeconds = Math.floor((matchRow.endTime - Date.now()) / 1000);
    if (remainingSeconds <= rules.closeOnlySeconds) {
      throw new Error("Close-only mode in last 30 minutes");
    }

    const size = Number(input.size);
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error("Invalid size");
    }
    if (size < 10) {
      throw new Error("Minimum position size is 10 USDT");
    }

    const price = this.market.getLastPrice();
    if (price <= 0) {
      throw new Error("Price feed unavailable");
    }
    if (this.market.isStale()) {
      throw new Error("Market data is stale, trading temporarily disabled");
    }

    // TP/SL directional validation
    if (input.tp !== null && input.tp !== undefined) {
      if (input.direction === "long" && input.tp <= price) {
        throw new Error("Take profit must be above current price for long positions");
      }
      if (input.direction === "short" && input.tp >= price) {
        throw new Error("Take profit must be below current price for short positions");
      }
    }
    if (input.sl !== null && input.sl !== undefined) {
      if (input.direction === "long" && input.sl >= price) {
        throw new Error("Stop loss must be below current price for long positions");
      }
      if (input.direction === "short" && input.sl <= price) {
        throw new Error("Stop loss must be above current price for short positions");
      }
    }

    // Use transaction to prevent race condition on position creation
    await db.transaction(async (tx) => {
      const existingPosition = await dbHelpers.getPosition(arenaAccountId, tx);
      if (existingPosition) {
        throw new Error("Only one position is allowed");
      }

      const tradesUsed = await dbHelpers.getTradeCountForUserMatch(arenaAccountId, rules.matchId, tx);
      if (tradesUsed >= rules.maxTradesPerMatch) {
        throw new Error("Trade limit reached");
      }

      const leaderboard = await this.buildLeaderboard(
        rules.matchId,
        competitionContext?.participantIds,
        rules.competitionId,
      );
      const me = leaderboard.find((row) => row.arenaAccountId === arenaAccountId);
      const equity = rules.startingCapital + (me?.pnl ?? 0);
      if (size > equity) {
        throw new Error("Insufficient equity");
      }

      // Leverage increases the notional position size (not PnL directly)
      const accountRow = await dbHelpers.getArenaAccountById(arenaAccountId, tx);
      const leverage = getRankTier(accountRow?.seasonPoints ?? 0).leverage;
      const notionalSize = round2(size * leverage);

      await dbHelpers.insertPosition(
        {
          arenaAccountId,
          competitionId: rules.competitionId,
          direction: input.direction,
          size: notionalSize,
          entryPrice: price,
          openTime: Date.now(),
          takeProfit: input.tp ?? null,
          stopLoss: input.sl ?? null,
          tradeNumber: tradesUsed + 1,
        },
        tx,
      );
    });
  }

  async closePosition(arenaAccountId: number) {
    await this.rotateMatchIfNeeded();
    const pos = await dbHelpers.getPosition(arenaAccountId);
    if (!pos) {
      throw new Error("No open position");
    }
    return this.closePositionInternal(
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
      "manual",
    );
  }

  async setTpSl(arenaAccountId: number, input: { tp?: number | null; sl?: number | null }) {
    // Wrap in transaction for atomicity
    await db.transaction(async (tx) => {
      const pos = await dbHelpers.getPosition(arenaAccountId, tx);
      if (!pos) {
        throw new Error("No open position");
      }
      // undefined = keep existing, null = clear, number = set new value
      const newTp = input.tp === undefined ? pos.takeProfit : input.tp;
      const newSl = input.sl === undefined ? pos.stopLoss : input.sl;

      // Directional validation
      if (newTp !== null && newTp !== undefined) {
        if (pos.direction === "long" && newTp <= pos.entryPrice) {
          throw new Error("Take profit must be above entry price for long positions");
        }
        if (pos.direction === "short" && newTp >= pos.entryPrice) {
          throw new Error("Take profit must be below entry price for short positions");
        }
      }
      if (newSl !== null && newSl !== undefined) {
        if (pos.direction === "long" && newSl >= pos.entryPrice) {
          throw new Error("Stop loss must be below entry price for long positions");
        }
        if (pos.direction === "short" && newSl <= pos.entryPrice) {
          throw new Error("Stop loss must be above entry price for short positions");
        }
      }

      await dbHelpers.updatePositionTpSl(arenaAccountId, newTp, newSl, tx);
    });
  }

  async tick() {
    await this.rotateMatchIfNeeded();
    await this.autoCloseByTpSl();
    await this.resolvePredictions();
  }

  async getPublicSummary() {
    const rules = await this.getPublicMatchRules();
    if (!rules) {
      return {
        participants: 0,
        matchNumber: 0,
        prizePool: 0,
        symbol: this.market.getSymbol(),
        leader: null,
      };
    }

    const matchRow = await dbHelpers.getMatchById(rules.matchId);
    if (!matchRow) {
      throw new Error("Match not found");
    }

    const leaderboard = await this.buildLeaderboard(rules.matchId, rules.participantIds, rules.competitionId);
    const top = leaderboard[0];
    const competitionProgress = await this.getCompetitionProgressState(rules.competitionId);
    return {
      participants: leaderboard.length,
      matchNumber: competitionProgress?.currentIndex ?? ((matchRow.matchNumber - 1) % 15) + 1,
      prizePool: rules.prizePool,
      symbol: rules.symbol,
      leader: top
        ? {
            username: top.username,
            weightedPnl: top.weightedPnl,
            pnlPct: top.pnlPct,
          }
        : null,
    };
  }

  async getPublicLeaderboard(limit = 50) {
    const rules = await this.getPublicMatchRules();
    if (!rules) return [];
    return (await this.buildLeaderboard(rules.matchId, rules.participantIds, rules.competitionId)).slice(0, limit).map((row) => ({
      rank: row.rank,
      username: row.username,
      pnlPct: row.pnlPct,
      pnl: row.pnl,
      weightedPnl: row.weightedPnl,
      matchPoints: row.matchPoints,
      prizeEligible: row.prizeEligible,
      prizeAmount: row.prizeAmount,
      rankTier: row.rankTier,
      isBot: false,
    }));
  }

  async getStateForUser(
    arenaAccountId: number,
    competitionContext?: CompetitionContext | null,
  ) {
    await this.rotateMatchIfNeeded();
    const rules = await this.getMatchRules({ competitionContext });
    const active = await dbHelpers.getMatchById(rules.matchId);
    if (!active) {
      throw new Error("Match not found");
    }
    const participantIds = competitionContext?.participantIds ?? rules.participantIds;
    const leaderboard = await this.buildLeaderboard(active.id, participantIds, rules.competitionId);
    const me = leaderboard.find((row) => row.arenaAccountId === arenaAccountId);
    const myRank = me?.rank ?? Math.max(leaderboard.length, 1);

    const accountRow = await dbHelpers.getArenaAccountById(arenaAccountId);
    if (!accountRow) throw new Error("Account not found");

    const position = await dbHelpers.getPosition(arenaAccountId);
    const positionView = position
      ? this.toPositionView(
          {
            arenaAccountId: position.arenaAccountId,
            competitionId: position.competitionId,
            direction: position.direction,
            size: position.size,
            entryPrice: position.entryPrice,
            openTime: position.openTime,
            takeProfit: position.takeProfit,
            stopLoss: position.stopLoss,
            tradeNumber: position.tradeNumber,
          },
          accountRow.seasonPoints,
          rules.feeRate,
        )
      : null;

    const realized = await dbHelpers.getRealizedPnlForUserMatch(arenaAccountId, active.id);

    const unrealized = positionView ? positionView.unrealizedPnl : 0;
    const unrealizedWeighted = positionView ? positionView.unrealizedPnl * positionView.holdDurationWeight : 0;
    const totalPnl = round2(realized.pnl + unrealized);
    const totalWeightedPnl = round2(realized.weighted + unrealizedWeighted);
    const pnlPct = round2((totalPnl / rules.startingCapital) * 100);
    const tradesUsed = position
      ? position.tradeNumber
      : await dbHelpers.getTradeCountForUserMatch(arenaAccountId, active.id);
    const matchPoints = this.getPointsForRankFromRules(myRank, rules);
    const seasonPoints = round2(accountRow.seasonPoints + matchPoints);
    // Leverage is based on pre-match season points only (already realized),
    // NOT including current match points — prevents dynamic fluctuation during match
    const baseTier = getRankTier(accountRow.seasonPoints);
    const displayTier = getRankTier(seasonPoints);
    const prizeEligible = tradesUsed >= MIN_TRADES_FOR_PRIZE;
    const prizeAmount = prizeEligible ? this.getPrizeForRankFromRules(myRank, rules) : 0;

    const previousRank = this.rankSnapshot.get(arenaAccountId) ?? myRank;
    const tradersOvertakenYou = Math.max(0, myRank - previousRank);
    const youOvertook = Math.max(0, previousRank - myRank);

    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((active.endTime - now) / 1000));
    const elapsed = Math.max(0, Math.min(1, (now - active.startTime) / (active.endTime - active.startTime)));
    const competitionProgress = await this.getCompetitionProgressState(rules.competitionId);
    const currentCompetition = competitionProgress?.competition ?? null;
    const cycleMatchNumber = competitionProgress?.currentIndex ?? ((active.matchNumber - 1) % 15) + 1;
    const totalMatches = competitionProgress?.total ?? 15;
    const participantCount = Math.max(leaderboard.length, 1);
    const directionCounts = await dbHelpers.getPositionCountByDirection(participantIds);
    const totalOpen = directionCounts.long + directionCounts.short;
    const longPct = totalOpen > 0 ? round2((directionCounts.long / totalOpen) * 100) : 50;
    const shortPct = round2(100 - longPct);

    const profitable = leaderboard.filter((row) => row.pnl > 0);
    const losing = leaderboard.filter((row) => row.pnl < 0);
    const nearPromotionCount = leaderboard.filter((row) => row.rank >= 290 && row.rank <= 310).length;

    this.refreshRankSnapshot(leaderboard);

    const directionConsistency = await dbHelpers.getDirectionConsistency(arenaAccountId, active.id);
    const recentTradeVolume = await dbHelpers.getRecentTradeVolume(active.id, 5 * 60 * 1000);
    const activeSeason = await compDb.getActiveSeason();
    const avgHoldWeight = await dbHelpers.getAvgHoldWeightForUser(arenaAccountId, activeSeason?.id);
    const seasonRankScore = round2(seasonPoints * avgHoldWeight);
    const grandFinalLine = await dbHelpers.getGrandFinalLine(500, activeSeason?.id);

    const userTrades = await dbHelpers.getTradesForUserMatch(arenaAccountId, active.id);
    const seasonMatches = competitionProgress
      ? competitionProgress.sameTypeCompetitions.map((item, idx) => {
          const number = idx + 1;
          if (item.id === currentCompetition?.id) {
            return {
              matchNumber: number,
              matchType: item.competitionType,
              status: "active" as const,
              rank: myRank,
              weightedPnl: totalWeightedPnl,
              pnlPct,
              pointsEarned: matchPoints,
              prizeWon: prizeAmount,
            };
          }
          if (isTerminalCompetitionStatus(item.status)) {
            return { matchNumber: number, matchType: item.competitionType, status: "completed" as const };
          }
          return { matchNumber: number, matchType: item.competitionType, status: "pending" as const };
        })
      : Array.from({ length: 15 }, (_, idx) => {
          const number = idx + 1;
          if (number < cycleMatchNumber) return { matchNumber: number, matchType: "regular", status: "completed" as const };
          if (number === cycleMatchNumber) {
            return {
              matchNumber: number,
              matchType: "regular" as const,
              status: "active" as const,
              rank: myRank,
              weightedPnl: totalWeightedPnl,
              pnlPct,
              pointsEarned: matchPoints,
              prizeWon: prizeAmount,
            };
          }
          return { matchNumber: number, matchType: "regular" as const, status: "pending" as const };
        });

    return {
      account: {
        capital: rules.startingCapital,
        equity: round2(rules.startingCapital + totalPnl),
        pnl: totalPnl,
        pnlPct,
        weightedPnl: totalWeightedPnl,
        tradesUsed,
        tradesMax: rules.maxTradesPerMatch,
        rank: myRank,
        matchPoints,
        seasonPoints,
        avgHoldWeight: round2(avgHoldWeight),
        seasonRankScore,
        grandFinalQualified: seasonRankScore > 0 && seasonRankScore >= grandFinalLine,
        grandFinalLine,
        prizeEligible,
        rankTier: displayTier.tier,
        tierLeverage: baseTier.leverage,
        prizeAmount,
        directionConsistency,
        directionBonus: directionConsistency > 0.7,
      },
      position: positionView,
      trades: userTrades.map((row) => ({
        id: row.id,
        direction: row.direction,
        size: row.size,
        entryPrice: row.entryPrice,
        exitPrice: row.exitPrice,
        pnl: row.pnl,
        pnlPct: row.pnlPct,
        fee: row.fee ?? 0,
        weightedPnl: row.weightedPnl,
        holdDuration: row.holdDuration,
        holdDurationWeight: row.holdWeight,
        closeReason: row.closeReason,
        openTime: row.openTime,
        closeTime: row.closeTime,
      })),
      leaderboard: leaderboard.map((row) => ({
        rank: row.rank,
        username: row.username,
        pnlPct: row.pnlPct,
        pnl: row.pnl,
        weightedPnl: row.weightedPnl,
        matchPoints: row.matchPoints,
        prizeEligible: row.prizeEligible,
        prizeAmount: row.prizeAmount,
        rankTier: row.rankTier,
        isYou: row.arenaAccountId === arenaAccountId,
        isBot: false,
      })),
      social: {
        longPct,
        shortPct,
        longPctDelta: 0,
        profitablePct: round2((profitable.length / participantCount) * 100),
        losingPct: round2((losing.length / participantCount) * 100),
        avgProfitPct: profitable.length
          ? round2(profitable.reduce((sum, row) => sum + row.pnlPct, 0) / profitable.length)
          : 0,
        avgLossPct: losing.length ? round2(losing.reduce((sum, row) => sum + row.pnlPct, 0) / losing.length) : 0,
        avgTradesPerPerson: round2(leaderboard.reduce((sum, row) => sum + row.tradesUsed, 0) / participantCount),
        medianTradesPerPerson: this.median(leaderboard.map((row) => row.tradesUsed)),
        activeTradersPct: round2((totalOpen / participantCount) * 100),
        nearPromotionCount,
        nearPromotionRange: "#290-#310",
        nearPromotionDelta: this.nearPromotionDelta,
        consecutiveLossLeader: 0,
        tradersOnLosingStreak: 0,
        recentDirectionBias: "neutral",
        recentTradeVolume,
        avgRankChange30m: 0,
        tradersOvertakenYou,
        youOvertook,
      },
      season: {
        seasonId: `season-${monthLabel(active.startTime)}`,
        month: monthLabel(active.startTime),
        matchesPlayed: cycleMatchNumber,
        matchesTotal: totalMatches,
        grandFinalScheduled: true,
        matches: seasonMatches,
        totalPoints: seasonPoints,
        grandFinalQualified: seasonPoints >= 200,
      },
      match: {
        matchId: `match-${active.id}`,
        matchNumber: cycleMatchNumber,
        matchType: currentCompetition?.competitionType ?? "regular",
        totalRegularMatches: totalMatches,
        startTime: active.startTime,
        endTime: active.endTime,
        elapsed,
        remainingSeconds,
        symbol: rules.symbol,
        participantCount,
        prizePool: rules.prizePool,
        isCloseOnly: remainingSeconds <= rules.closeOnlySeconds,
        monthLabel: currentCompetition
          ? `${monthLabelCn(active.startTime)} · ${competitionTypeLabel(currentCompetition.competitionType)}`
          : monthLabelCn(active.startTime),
      },
      tradingPair: getBinanceSymbolConfig(rules.symbol) ?? getSymbolConfig(rules.symbol),
      chatMessages: await dbHelpers.getRecentChatMessages(120, rules.competitionId),
      ticker: this.market.getTicker(),
      orderBook: this.market.getOrderBook(),
      prediction: await this.getPredictionState(arenaAccountId, competitionContext),
      pollData: await this.getPollData(arenaAccountId),
    };
  }

  async submitPollVote(arenaAccountId: number, direction: "long" | "short" | "neutral") {
    await this.recordBehaviorEvent(arenaAccountId, "poll_vote", { direction });
  }

  private async getPollData(arenaAccountId: number) {
    const agg = await dbHelpers.getPollVoteAggregation();
    const userVote = await dbHelpers.getUserLatestPollVote(arenaAccountId);
    return {
      longVotes: agg.long,
      shortVotes: agg.short,
      neutralVotes: agg.neutral,
      userVote,
    };
  }

  // ─── Prediction System ──────────────────────────────────────────────────────

  private getPredictionRoundKey(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hour = String(now.getUTCHours()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:00`;
  }

  private isInPredictionWindow(): boolean {
    const now = new Date();
    const secondsPastHour = now.getUTCMinutes() * 60 + now.getUTCSeconds();
    return secondsPastHour <= 60;
  }

  private shouldResolvePredictions(): boolean {
    const now = new Date();
    const secondsPastHour = now.getUTCMinutes() * 60 + now.getUTCSeconds();
    return secondsPastHour >= 300 && secondsPastHour <= 330;
  }

  async submitPrediction(
    arenaAccountId: number,
    direction: "up" | "down",
    confidence: number,
    competitionContext?: CompetitionContext | null,
  ) {
    if (!this.isInPredictionWindow()) {
      throw new Error("Prediction window is closed");
    }

    const rules = await this.getMatchRules({ competitionContext });
    const roundKey = this.getPredictionRoundKey();
    const existing = await dbHelpers.getPredictionForRound(arenaAccountId, rules.matchId, roundKey);
    if (existing) {
      throw new Error("Already submitted prediction for this round");
    }

    const price = this.market.getLastPrice();
    const position = await dbHelpers.getPosition(arenaAccountId);

    await dbHelpers.insertPrediction({
      arenaAccountId,
      matchId: rules.matchId,
      roundKey,
      direction,
      confidence: Math.min(5, Math.max(1, confidence)),
      priceAtPrediction: price,
      actualPositionDirection: position?.direction ?? null,
      submittedAt: Date.now(),
    });
  }

  async getPredictionState(arenaAccountId: number, competitionContext?: CompetitionContext | null) {
    const rules = await this.getMatchRules({ competitionContext });
    const roundKey = this.getPredictionRoundKey();
    const existingPrediction = await dbHelpers.getPredictionForRound(arenaAccountId, rules.matchId, roundKey);
    const stats = await dbHelpers.getPredictionStats(arenaAccountId, rules.matchId);
    const resolved = stats.total - stats.pending;

    return {
      currentRoundKey: roundKey,
      isWindowOpen: this.isInPredictionWindow(),
      windowClosesIn: this.isInPredictionWindow()
        ? Math.max(0, 60 - (new Date().getUTCMinutes() * 60 + new Date().getUTCSeconds()))
        : 0,
      alreadySubmitted: !!existingPrediction,
      submittedDirection: existingPrediction?.direction ?? null,
      stats: {
        totalPredictions: stats.total,
        correctPredictions: stats.correct,
        accuracy: resolved > 0 ? Math.round((stats.correct / resolved) * 100) : 0,
        pendingCount: stats.pending,
      },
    };
  }

  private async resolvePredictions() {
    if (!this.shouldResolvePredictions()) return;

    const rules = await this.getPublicMatchRules();
    if (!rules) return;

    const roundKey = this.getPredictionRoundKey();
    if (this.lastResolvedRound === roundKey) return;

    const pendingPredictions = await dbHelpers.getPendingPredictionsForRound(roundKey, rules.matchId);
    if (pendingPredictions.length === 0) {
      this.lastResolvedRound = roundKey;
      return;
    }

    const currentPrice = this.market.getLastPrice();
    if (currentPrice <= 0 || this.market.isStale()) return;

    for (const pred of pendingPredictions) {
      const actualDirection = currentPrice > pred.priceAtPrediction ? "up" : "down";
      const correct = pred.direction === actualDirection;
      await dbHelpers.resolvePrediction(pred.id, currentPrice, correct);
    }

    this.lastResolvedRound = roundKey;
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────────

  private toPositionView(pos: PositionRow, _seasonPoints: number, feeRate: number) {
    const price = this.market.getLastPrice();
    const holdSeconds = Math.max(0, (Date.now() - pos.openTime) / 1000);
    const weight = getHoldWeight(holdSeconds);
    const sign = pos.direction === "long" ? 1 : -1;
    // pos.size already includes leverage (applied at open time)
    const rawPnl = sign * ((price - pos.entryPrice) / pos.entryPrice) * pos.size;
    // Estimated fee: open side + close side (both 0.05%)
    const estFee = round2(pos.size * feeRate + pos.size * (price / pos.entryPrice) * feeRate);
    const pnl = rawPnl - estFee;
    const pnlPct = (pnl / pos.size) * 100;
    return {
      direction: pos.direction,
      size: pos.size,
      entryPrice: pos.entryPrice,
      openTime: pos.openTime,
      unrealizedPnl: round2(pnl),
      unrealizedPnlPct: round2(pnlPct),
      unrealizedFee: estFee,
      holdDurationWeight: weight,
      tradeNumber: pos.tradeNumber,
      takeProfit: pos.takeProfit,
      stopLoss: pos.stopLoss,
    };
  }

  async closePositionInternal(
    pos: PositionRow,
    reason: "manual" | "sl" | "tp" | "match_end",
    exitPrice?: number,
  ) {
    const rules = await this.getPositionMatchRules(pos);
    const closePrice = exitPrice ?? this.market.getLastPrice();
    const holdDuration = Math.max(0, (Date.now() - pos.openTime) / 1000);
    const weight = getHoldWeight(holdDuration);
    const sign = pos.direction === "long" ? 1 : -1;
    // pos.size already includes leverage (applied at open time)
    const rawPnl = sign * ((closePrice - pos.entryPrice) / pos.entryPrice) * pos.size;
    // Fee: 0.05% per side (open + close = 0.1% round trip)
    const fee = round2(pos.size * rules.feeRate + pos.size * (closePrice / pos.entryPrice) * rules.feeRate);
    const pnl = rawPnl - fee;
    const pnlPct = (pnl / pos.size) * 100;
    const weighted = pnl * weight;

    const tradeId = `trade-${nanoid(12)}`;

    // Atomic: insert trade + delete position in one transaction
    await db.transaction(async (tx) => {
      // Re-verify position still exists (prevents double-close)
      const currentPos = await dbHelpers.getPosition(pos.arenaAccountId, tx);
      if (!currentPos) {
        throw new Error("Position already closed");
      }

      await dbHelpers.insertTrade(
        {
          id: tradeId,
          arenaAccountId: pos.arenaAccountId,
          matchId: rules.matchId,
          direction: pos.direction,
          size: pos.size,
          entryPrice: pos.entryPrice,
          exitPrice: closePrice,
          pnl: round2(pnl),
          pnlPct: round2(pnlPct),
          fee,
          weightedPnl: round2(weighted),
          holdDuration: round2(holdDuration),
          holdWeight: weight,
          closeReason: reason,
          openTime: pos.openTime,
          closeTime: Date.now(),
        },
        tx,
      );
      await dbHelpers.deletePosition(pos.arenaAccountId, tx);
    });

    return tradeId;
  }

  private async autoCloseByTpSl() {
    const price = this.market.getLastPrice();
    if (price <= 0) return;
    if (this.market.isStale()) return;

    const allPositions = await dbHelpers.getAllPositions();
    for (const pos of allPositions) {
      let shouldClose = false;
      let reason: "tp" | "sl" = "tp";
      let closePrice = price;

      if (pos.takeProfit !== null) {
        if (pos.direction === "long" && price >= pos.takeProfit) {
          shouldClose = true;
          reason = "tp";
          closePrice = pos.takeProfit;
        } else if (pos.direction === "short" && price <= pos.takeProfit) {
          shouldClose = true;
          reason = "tp";
          closePrice = pos.takeProfit;
        }
      }
      if (!shouldClose && pos.stopLoss !== null) {
        if (pos.direction === "long" && price <= pos.stopLoss) {
          shouldClose = true;
          reason = "sl";
          closePrice = pos.stopLoss;
        } else if (pos.direction === "short" && price >= pos.stopLoss) {
          shouldClose = true;
          reason = "sl";
          closePrice = pos.stopLoss;
        }
      }

      if (shouldClose) {
        try {
          await this.closePositionInternal(
            { ...pos, arenaAccountId: pos.arenaAccountId, competitionId: pos.competitionId },
            reason,
            closePrice,
          );
        } catch (err) {
          // Position was already closed by another path — expected, not an error
          if ((err as Error).message !== "Position already closed") {
            console.error("[autoCloseByTpSl]", err);
          }
        }
      }
    }
  }

  private async rotateMatchIfNeeded() {
    // When CompetitionEngine manages lifecycle, skip auto-rotation
    if (!this.legacyAutoRotate) return;
    if (this.rotationLock) return;

    const active = await dbHelpers.getActiveMatch();
    if (!active) return;
    const now = Date.now();
    if (now < active.endTime) return;

    this.rotationLock = true;
    try {
      // Re-check inside lock
      const recheck = await dbHelpers.getActiveMatch();
      if (!recheck || Date.now() < recheck.endTime) return;

      // Close all open positions
      const openPositions = await dbHelpers.getAllPositions();
      for (const pos of openPositions) {
        try {
          await this.closePositionInternal(
            { ...pos, arenaAccountId: pos.arenaAccountId, competitionId: pos.competitionId },
            "match_end",
          );
        } catch (err) {
          if ((err as Error).message !== "Position already closed") {
            console.error("[rotateMatch] close error", err);
          }
        }
      }

      // Award season points + complete + create new match in one transaction
      const finalLeaderboard = await this.buildLeaderboard(recheck.id);
      await db.transaction(async (tx) => {
        for (const row of finalLeaderboard) {
          const points = this.getPointsForRankFromRules(row.rank);
          if (points > 0) {
            await dbHelpers.updateSeasonPoints(row.arenaAccountId, points, tx);
          }
        }
        await dbHelpers.completeMatch(recheck.id, tx);
        const rotateNow = Date.now();
        await dbHelpers.createMatch(recheck.matchNumber + 1, rotateNow, rotateNow + MATCH_DURATION_MS, "regular", tx);
      });
    } finally {
      this.rotationLock = false;
    }
  }

  async buildLeaderboard(
    matchId: number,
    participantIds?: Set<number>,
    competitionId?: number | null,
  ): Promise<LeaderboardRow[]> {
    const rules = await this.getMatchRules({ competitionId });
    // Return cached result if still fresh (cache only for unfiltered/legacy builds)
    const now = Date.now();
    if (!participantIds && !competitionId && this.leaderboardCache && this.leaderboardCache.matchId === matchId && now - this.leaderboardCache.at < ArenaEngine.LEADERBOARD_CACHE_TTL_MS) {
      return this.leaderboardCache.rows;
    }

    // Deduplicate concurrent unfiltered builds: if one is already in progress, await it
    if (!participantIds && !competitionId && this.leaderboardBuilding) {
      return this.leaderboardBuilding;
    }

    const buildPromise = this._buildLeaderboardInternal(matchId, participantIds, rules);

    if (!participantIds && !competitionId) {
      this.leaderboardBuilding = buildPromise;
      try {
        return await buildPromise;
      } finally {
        this.leaderboardBuilding = null;
      }
    }

    return buildPromise;
  }

  private async _buildLeaderboardInternal(
    matchId: number,
    participantIds: Set<number> | undefined,
    rules: MatchRules,
  ): Promise<LeaderboardRow[]> {
    let allAccounts = await dbHelpers.getAllArenaAccountsWithCapital();
    if (participantIds) {
      allAccounts = allAccounts.filter(a => participantIds.has(a.id));
    }
    const aggregated = await dbHelpers.getTradeAggregatesForMatch(matchId);
    const aggMap = new Map<number, { pnl: number; weighted: number; trades: number }>();
    for (const row of aggregated) {
      aggMap.set(row.arenaAccountId, { pnl: row.pnl, weighted: row.weighted, trades: row.trades });
    }

    let allPositions = await dbHelpers.getAllPositions();
    if (participantIds) {
      allPositions = allPositions.filter(p => participantIds.has(p.arenaAccountId));
    }
    const positionMap = new Map<number, (typeof allPositions)[0]>();
    for (const pos of allPositions) positionMap.set(pos.arenaAccountId, pos);

    const lastPrice = this.market.getLastPrice();
    // Direction consistency bonus: 1.05x weighted PnL for players with >70% consistency
    const dirConsistencyMap = await dbHelpers.getDirectionConsistencyBatch(matchId);

    const rows = allAccounts.map((account) => {
      const base = aggMap.get(account.id) ?? { pnl: 0, weighted: 0, trades: 0 };
      const position = positionMap.get(account.id);
      const tier = getRankTier(account.seasonPoints);
      let pnl = base.pnl;
      let weighted = base.weighted;
      let tradesUsed = base.trades;
      if (position) {
        const sign = position.direction === "long" ? 1 : -1;
        const hold = Math.max(0, (Date.now() - position.openTime) / 1000);
        const w = getHoldWeight(hold);
        // position.size already includes leverage (applied at open time)
        const rawUnrealized =
          sign * ((lastPrice - position.entryPrice) / position.entryPrice) * position.size;
        const estFee =
          position.size * rules.feeRate + position.size * (lastPrice / position.entryPrice) * rules.feeRate;
        const unrealized = rawUnrealized - estFee;
        pnl += unrealized;
        weighted += unrealized * w;
        tradesUsed = Math.max(base.trades, position.tradeNumber);
      }

      // Apply direction consistency bonus (1.05x) per design doc §6.4.3
      const dirConsistency = dirConsistencyMap.get(account.id) ?? 0;
      if (dirConsistency > 0.7) {
        weighted *= 1.05;
      }

      return {
        arenaAccountId: account.id,
        username: account.username,
        pnl: round2(pnl),
        weightedPnl: round2(weighted),
        pnlPct: round2((pnl / rules.startingCapital) * 100),
        tradesUsed,
        rankTier: tier.tier,
        rank: 0,
        matchPoints: 0,
        prizeEligible: tradesUsed >= MIN_TRADES_FOR_PRIZE,
        prizeAmount: 0,
      } as LeaderboardRow;
    });

    rows.sort((a, b) => {
      if (b.pnlPct !== a.pnlPct) return b.pnlPct - a.pnlPct;
      if (b.pnl !== a.pnl) return b.pnl - a.pnl;
      return a.arenaAccountId - b.arenaAccountId;
    });

    rows.forEach((row, idx) => {
      row.rank = idx + 1;
      row.matchPoints = this.getPointsForRankFromRules(row.rank, rules);
      row.prizeAmount = row.prizeEligible ? this.getPrizeForRankFromRules(row.rank, rules) : 0;
    });

    // Cache only unfiltered (legacy) results
    if (!participantIds && !rules.competitionId) {
      this.leaderboardCache = { matchId, rows, at: Date.now() };
    }
    return rows;
  }

  private refreshRankSnapshot(rows: LeaderboardRow[]) {
    const now = Date.now();
    if (now - this.lastRankSnapshotAt < 5000) return;
    const newMap = new Map<number, number>();
    for (const row of rows) newMap.set(row.arenaAccountId, row.rank);
    const nearCount = rows.filter((row) => row.rank >= 290 && row.rank <= 310).length;
    this.nearPromotionDelta = nearCount - this.nearPromotionCountSnapshot;
    this.nearPromotionCountSnapshot = nearCount;
    this.rankSnapshot = newMap;
    this.lastRankSnapshotAt = now;
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
}
