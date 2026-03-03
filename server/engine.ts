import crypto from "node:crypto";
import { nanoid } from "nanoid";
import type { ArenaDB } from "./db.js";
import {
  CLOSE_ONLY_SECONDS,
  MATCH_DURATION_MS,
  MAX_TRADES_PER_MATCH,
  MIN_TRADES_FOR_PRIZE,
  STARTING_CAPITAL,
  SYMBOL,
  getHoldWeight,
  getPointsForRank,
  getPrizeForRank,
  getRankTier,
} from "./constants.js";
import type { MarketService } from "./market.js";

type UserRow = {
  id: number;
  username: string;
};

type MatchRow = {
  id: number;
  match_number: number;
  start_time: number;
  end_time: number;
};

type PositionRow = {
  user_id: number;
  direction: "long" | "short";
  size: number;
  entry_price: number;
  open_time: number;
  take_profit: number | null;
  stop_loss: number | null;
  trade_number: number;
};

type LeaderboardRow = {
  userId: number;
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelCn(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

export class ArenaEngine {
  private rankSnapshot = new Map<number, number>();
  private nearPromotionCountSnapshot = 0;
  private nearPromotionDelta = 0;
  private lastRankSnapshotAt = 0;

  constructor(
    private readonly db: ArenaDB,
    private readonly market: MarketService,
  ) {}

  login(usernameInput: string): { token: string; user: UserRow } {
    const username = usernameInput.trim();
    if (!username || username.length < 2 || username.length > 20) {
      throw new Error("Username length must be between 2 and 20");
    }

    const now = Date.now();
    const existing = this.db
      .prepare("SELECT id, username FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    const user = existing
      ? existing
      : (() => {
          const result = this.db
            .prepare("INSERT INTO users (username, created_at) VALUES (?, ?)")
            .run(username, now);
          return { id: Number(result.lastInsertRowid), username };
        })();

    const hasAccount = this.db
      .prepare("SELECT user_id FROM accounts WHERE user_id = ?")
      .get(user.id) as { user_id: number } | undefined;

    if (!hasAccount) {
      this.db
        .prepare(
          "INSERT INTO accounts (user_id, capital, season_points, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
        )
        .run(user.id, STARTING_CAPITAL, now, now);
    }

    const token = crypto.randomBytes(24).toString("hex");
    this.db
      .prepare("INSERT INTO sessions (token, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)")
      .run(token, user.id, now, now);

    return { token, user };
  }

  getUserByToken(token: string | null | undefined): UserRow | null {
    if (!token) return null;
    const user = this.db
      .prepare(
        `SELECT u.id, u.username
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ?`,
      )
      .get(token) as UserRow | undefined;
    if (!user) return null;
    this.db.prepare("UPDATE sessions SET last_seen = ? WHERE token = ?").run(Date.now(), token);
    return user;
  }

  recordBehaviorEvent(userId: number, eventType: string, payload: unknown, source = "client") {
    this.db
      .prepare(
        "INSERT INTO behavior_events (user_id, event_type, payload, source, timestamp) VALUES (?, ?, ?, ?, ?)",
      )
      .run(userId, eventType, JSON.stringify(payload ?? {}), source, Date.now());
  }

  sendChatMessage(userId: number, messageInput: string) {
    const message = messageInput.trim();
    if (!message) return;
    const user = this.db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as { username: string };
    this.db
      .prepare(
        "INSERT INTO chat_messages (id, user_id, username, message, type, timestamp) VALUES (?, ?, ?, ?, 'user', ?)",
      )
      .run(`chat-${nanoid(12)}`, userId, user.username, message.slice(0, 280), Date.now());
  }

  openPosition(
    userId: number,
    input: { direction: "long" | "short"; size: number; tp?: number | null; sl?: number | null },
  ) {
    this.rotateMatchIfNeeded();
    const active = this.getActiveMatch();
    const remainingSeconds = Math.floor((active.end_time - Date.now()) / 1000);
    if (remainingSeconds <= CLOSE_ONLY_SECONDS) {
      throw new Error("Close-only mode in last 30 minutes");
    }

    const existingPosition = this.getPosition(userId);
    if (existingPosition) {
      throw new Error("Only one position is allowed");
    }

    const tradesUsed = this.getTradesUsed(userId, active.id);
    if (tradesUsed >= MAX_TRADES_PER_MATCH) {
      throw new Error("Trade limit reached");
    }

    const size = Number(input.size);
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error("Invalid size");
    }

    const leaderboard = this.buildLeaderboard(active.id);
    const me = leaderboard.find(row => row.userId === userId);
    const equity = STARTING_CAPITAL + (me?.pnl ?? 0);
    if (size > equity) {
      throw new Error("Insufficient equity");
    }

    const price = this.market.getLastPrice();
    if (price <= 0) {
      throw new Error("Price feed unavailable");
    }

    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO positions (
          user_id, direction, size, entry_price, open_time, take_profit, stop_loss, trade_number, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(userId, input.direction, size, price, now, input.tp ?? null, input.sl ?? null, tradesUsed + 1, now);
  }

  closePosition(userId: number) {
    this.rotateMatchIfNeeded();
    const pos = this.getPosition(userId);
    if (!pos) {
      throw new Error("No open position");
    }
    return this.closePositionInternal(pos, "manual");
  }

  setTpSl(userId: number, input: { tp: number | null; sl: number | null }) {
    const pos = this.getPosition(userId);
    if (!pos) {
      throw new Error("No open position");
    }
    this.db
      .prepare("UPDATE positions SET take_profit = ?, stop_loss = ?, updated_at = ? WHERE user_id = ?")
      .run(input.tp, input.sl, Date.now(), userId);
  }

  tick() {
    this.rotateMatchIfNeeded();
    this.autoCloseByTpSl();
  }

  getPublicSummary() {
    const active = this.getActiveMatch();
    const leaderboard = this.buildLeaderboard(active.id);
    const top = leaderboard[0];
    return {
      participants: leaderboard.length,
      matchNumber: ((active.match_number - 1) % 15) + 1,
      prizePool: 500,
      symbol: SYMBOL,
      leader: top
        ? {
            username: top.username,
            weightedPnl: top.weightedPnl,
            pnlPct: top.pnlPct,
          }
        : null,
    };
  }

  getPublicLeaderboard(limit = 50) {
    const active = this.getActiveMatch();
    return this.buildLeaderboard(active.id).slice(0, limit).map(row => ({
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

  getStateForUser(userId: number) {
    this.rotateMatchIfNeeded();
    const active = this.getActiveMatch();
    const leaderboard = this.buildLeaderboard(active.id);
    const me = leaderboard.find(row => row.userId === userId);
    const myRank = me?.rank ?? Math.max(leaderboard.length, 1);

    const accountRow = this.db
      .prepare("SELECT capital, season_points FROM accounts WHERE user_id = ?")
      .get(userId) as { capital: number; season_points: number };
    const position = this.getPosition(userId);
    const positionView = position ? this.toPositionView(position, accountRow.season_points) : null;

    const realized = this.db
      .prepare(
        "SELECT COALESCE(SUM(pnl), 0) as pnl, COALESCE(SUM(weighted_pnl), 0) as weighted FROM trades WHERE user_id = ? AND match_id = ?",
      )
      .get(userId, active.id) as { pnl: number; weighted: number };

    const unrealized = positionView ? positionView.unrealizedPnl : 0;
    const unrealizedWeighted = positionView ? positionView.unrealizedPnl * positionView.holdDurationWeight : 0;
    const totalPnl = round2(realized.pnl + unrealized);
    const totalWeightedPnl = round2(realized.weighted + unrealizedWeighted);
    const pnlPct = round2((totalPnl / accountRow.capital) * 100);
    const tradesUsed = position ? position.trade_number : this.getTradesUsed(userId, active.id);
    const matchPoints = getPointsForRank(myRank);
    const seasonPoints = round2(accountRow.season_points + matchPoints);
    const tier = getRankTier(seasonPoints);
    const prizeEligible = tradesUsed >= MIN_TRADES_FOR_PRIZE;
    const prizeAmount = prizeEligible ? getPrizeForRank(myRank) : 0;

    const previousRank = this.rankSnapshot.get(userId) ?? myRank;
    const tradersOvertakenYou = Math.max(0, myRank - previousRank);
    const youOvertook = Math.max(0, previousRank - myRank);

    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((active.end_time - now) / 1000));
    const elapsed = Math.max(0, Math.min(1, (now - active.start_time) / (active.end_time - active.start_time)));
    const cycleMatchNumber = ((active.match_number - 1) % 15) + 1;
    const participantCount = Math.max(leaderboard.length, 1);
    const longCount = this.db.prepare("SELECT COUNT(*) as count FROM positions WHERE direction = 'long'").get() as {
      count: number;
    };
    const shortCount = this.db.prepare("SELECT COUNT(*) as count FROM positions WHERE direction = 'short'").get() as {
      count: number;
    };
    const totalOpen = longCount.count + shortCount.count;
    const longPct = totalOpen > 0 ? round2((longCount.count / totalOpen) * 100) : 50;
    const shortPct = round2(100 - longPct);

    const profitable = leaderboard.filter(row => row.pnl > 0);
    const losing = leaderboard.filter(row => row.pnl < 0);
    const nearPromotionCount = leaderboard.filter(row => row.rank >= 290 && row.rank <= 310).length;

    this.refreshRankSnapshot(leaderboard);

    return {
      account: {
        capital: accountRow.capital,
        equity: round2(accountRow.capital + totalPnl),
        pnl: totalPnl,
        pnlPct,
        weightedPnl: totalWeightedPnl,
        tradesUsed,
        tradesMax: MAX_TRADES_PER_MATCH,
        rank: myRank,
        matchPoints,
        seasonPoints,
        grandFinalQualified: seasonPoints >= 200,
        grandFinalLine: 200,
        prizeEligible,
        rankTier: tier.tier,
        tierLeverage: tier.leverage,
        prizeAmount,
        directionConsistency: this.computeDirectionConsistency(userId, active.id),
        directionBonus: this.computeDirectionConsistency(userId, active.id) > 0.7,
      },
      position: positionView,
      trades: this.db
        .prepare(
          `SELECT id, direction, size, entry_price, exit_price, pnl, pnl_pct, weighted_pnl, hold_duration, hold_weight, close_reason, open_time, close_time
           FROM trades WHERE user_id = ? AND match_id = ? ORDER BY close_time DESC LIMIT 200`,
        )
        .all(userId, active.id)
        .map((row: any) => ({
          id: row.id,
          direction: row.direction,
          size: row.size,
          entryPrice: row.entry_price,
          exitPrice: row.exit_price,
          pnl: row.pnl,
          pnlPct: row.pnl_pct,
          weightedPnl: row.weighted_pnl,
          holdDuration: row.hold_duration,
          holdDurationWeight: row.hold_weight,
          closeReason: row.close_reason,
          openTime: row.open_time,
          closeTime: row.close_time,
        })),
      leaderboard: leaderboard.map(row => ({
        rank: row.rank,
        username: row.username,
        pnlPct: row.pnlPct,
        pnl: row.pnl,
        weightedPnl: row.weightedPnl,
        matchPoints: row.matchPoints,
        prizeEligible: row.prizeEligible,
        prizeAmount: row.prizeAmount,
        rankTier: row.rankTier,
        isYou: row.userId === userId,
        isBot: false,
      })),
      social: {
        longPct,
        shortPct,
        longPctDelta: 0,
        profitablePct: round2((profitable.length / participantCount) * 100),
        losingPct: round2((losing.length / participantCount) * 100),
        avgProfitPct: profitable.length ? round2(profitable.reduce((sum, row) => sum + row.pnlPct, 0) / profitable.length) : 0,
        avgLossPct: losing.length ? round2(losing.reduce((sum, row) => sum + row.pnlPct, 0) / losing.length) : 0,
        avgTradesPerPerson: round2(leaderboard.reduce((sum, row) => sum + row.tradesUsed, 0) / participantCount),
        medianTradesPerPerson: this.median(leaderboard.map(row => row.tradesUsed)),
        activeTradersPct: round2((totalOpen / participantCount) * 100),
        nearPromotionCount,
        nearPromotionRange: "#290-#310",
        nearPromotionDelta: this.nearPromotionDelta,
        consecutiveLossLeader: 0,
        tradersOnLosingStreak: 0,
        recentDirectionBias: "neutral",
        recentTradeVolume: this.recentTradeVolume(active.id, 5 * 60 * 1000),
        avgRankChange30m: 0,
        tradersOvertakenYou,
        youOvertook,
      },
      season: {
        seasonId: `season-${monthLabel(active.start_time)}`,
        month: monthLabel(active.start_time),
        matchesPlayed: cycleMatchNumber - 1,
        matchesTotal: 15,
        grandFinalScheduled: true,
        matches: Array.from({ length: 15 }, (_, idx) => {
          const number = idx + 1;
          if (number < cycleMatchNumber) return { matchNumber: number, matchType: "regular", status: "completed" };
          if (number === cycleMatchNumber) {
            return {
              matchNumber: number,
              matchType: "regular",
              status: "active",
              rank: myRank,
              weightedPnl: totalWeightedPnl,
              pnlPct,
              pointsEarned: matchPoints,
              prizeWon: prizeAmount,
            };
          }
          return { matchNumber: number, matchType: "regular", status: "pending" };
        }),
        totalPoints: seasonPoints,
        grandFinalQualified: seasonPoints >= 200,
      },
      match: {
        matchId: `match-${active.id}`,
        matchNumber: cycleMatchNumber,
        matchType: "regular",
        totalRegularMatches: 15,
        startTime: active.start_time,
        endTime: active.end_time,
        elapsed,
        remainingSeconds,
        symbol: SYMBOL,
        participantCount,
        prizePool: 500,
        isCloseOnly: remainingSeconds <= CLOSE_ONLY_SECONDS,
        monthLabel: monthLabelCn(active.start_time),
      },
      chatMessages: this.db
        .prepare("SELECT id, username, message, timestamp, type FROM chat_messages ORDER BY timestamp DESC LIMIT 120")
        .all()
        .reverse(),
      ticker: this.market.getTicker(),
      orderBook: this.market.getOrderBook(),
    };
  }

  private getActiveMatch(): MatchRow {
    const row = this.db
      .prepare("SELECT id, match_number, start_time, end_time FROM matches WHERE status = 'active' ORDER BY id DESC LIMIT 1")
      .get() as MatchRow | undefined;
    if (!row) throw new Error("No active match");
    return row;
  }

  private getPosition(userId: number): PositionRow | null {
    const row = this.db
      .prepare(
        "SELECT user_id, direction, size, entry_price, open_time, take_profit, stop_loss, trade_number FROM positions WHERE user_id = ?",
      )
      .get(userId) as PositionRow | undefined;
    return row ?? null;
  }

  private getTradesUsed(userId: number, matchId: number): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM trades WHERE user_id = ? AND match_id = ?")
      .get(userId, matchId) as { count: number };
    return row.count;
  }

  private toPositionView(pos: PositionRow, seasonPoints: number) {
    const price = this.market.getLastPrice();
    const holdSeconds = Math.max(0, (Date.now() - pos.open_time) / 1000);
    const weight = getHoldWeight(holdSeconds);
    const sign = pos.direction === "long" ? 1 : -1;
    const leverage = getRankTier(seasonPoints).leverage;
    const pnl = sign * ((price - pos.entry_price) / pos.entry_price) * pos.size * leverage;
    const pnlPct = sign * ((price - pos.entry_price) / pos.entry_price) * 100 * leverage;
    return {
      direction: pos.direction,
      size: pos.size,
      entryPrice: pos.entry_price,
      openTime: pos.open_time,
      unrealizedPnl: round2(pnl),
      unrealizedPnlPct: round2(pnlPct),
      holdDurationWeight: weight,
      tradeNumber: pos.trade_number,
      takeProfit: pos.take_profit,
      stopLoss: pos.stop_loss,
    };
  }

  private closePositionInternal(pos: PositionRow, reason: "manual" | "sl" | "tp" | "match_end", exitPrice?: number) {
    const active = this.getActiveMatch();
    const closePrice = exitPrice ?? this.market.getLastPrice();
    const holdDuration = Math.max(0, (Date.now() - pos.open_time) / 1000);
    const weight = getHoldWeight(holdDuration);
    const season = this.db.prepare("SELECT season_points FROM accounts WHERE user_id = ?").get(pos.user_id) as {
      season_points: number;
    };
    const leverage = getRankTier(season.season_points).leverage;
    const sign = pos.direction === "long" ? 1 : -1;
    const pnl = sign * ((closePrice - pos.entry_price) / pos.entry_price) * pos.size * leverage;
    const pnlPct = sign * ((closePrice - pos.entry_price) / pos.entry_price) * 100 * leverage;
    const weighted = pnl * weight;

    const tradeId = `trade-${nanoid(12)}`;
    this.db
      .prepare(
        `INSERT INTO trades (
          id, user_id, match_id, direction, size, entry_price, exit_price, pnl, pnl_pct, weighted_pnl, hold_duration, hold_weight, close_reason, open_time, close_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        tradeId,
        pos.user_id,
        active.id,
        pos.direction,
        pos.size,
        pos.entry_price,
        closePrice,
        round2(pnl),
        round2(pnlPct),
        round2(weighted),
        round2(holdDuration),
        weight,
        reason,
        pos.open_time,
        Date.now(),
      );
    this.db.prepare("DELETE FROM positions WHERE user_id = ?").run(pos.user_id);
    return tradeId;
  }

  private autoCloseByTpSl() {
    const price = this.market.getLastPrice();
    const positions = this.db
      .prepare(
        "SELECT user_id, direction, size, entry_price, open_time, take_profit, stop_loss, trade_number FROM positions",
      )
      .all() as PositionRow[];
    for (const pos of positions) {
      if (pos.take_profit !== null) {
        if (pos.direction === "long" && price >= pos.take_profit) {
          this.closePositionInternal(pos, "tp", pos.take_profit);
          continue;
        }
        if (pos.direction === "short" && price <= pos.take_profit) {
          this.closePositionInternal(pos, "tp", pos.take_profit);
          continue;
        }
      }
      if (pos.stop_loss !== null) {
        if (pos.direction === "long" && price <= pos.stop_loss) {
          this.closePositionInternal(pos, "sl", pos.stop_loss);
          continue;
        }
        if (pos.direction === "short" && price >= pos.stop_loss) {
          this.closePositionInternal(pos, "sl", pos.stop_loss);
          continue;
        }
      }
    }
  }

  private rotateMatchIfNeeded() {
    const active = this.getActiveMatch();
    const now = Date.now();
    if (now < active.end_time) return;

    const open = this.db
      .prepare(
        "SELECT user_id, direction, size, entry_price, open_time, take_profit, stop_loss, trade_number FROM positions",
      )
      .all() as PositionRow[];
    for (const pos of open) {
      this.closePositionInternal(pos, "match_end");
    }

    const finalLeaderboard = this.buildLeaderboard(active.id);
    const stmt = this.db.prepare("UPDATE accounts SET season_points = season_points + ?, updated_at = ? WHERE user_id = ?");
    for (const row of finalLeaderboard) {
      const points = getPointsForRank(row.rank);
      if (points > 0) {
        stmt.run(points, now, row.userId);
      }
    }

    this.db.prepare("UPDATE matches SET status = 'completed' WHERE id = ?").run(active.id);
    this.db
      .prepare("INSERT INTO matches (match_number, match_type, start_time, end_time, status) VALUES (?, 'regular', ?, ?, 'active')")
      .run(active.match_number + 1, now, now + MATCH_DURATION_MS);
  }

  private buildLeaderboard(matchId: number): LeaderboardRow[] {
    const users = this.db
      .prepare(
        `SELECT u.id as user_id, u.username as username, a.capital as capital, a.season_points as season_points
         FROM users u JOIN accounts a ON a.user_id = u.id`,
      )
      .all() as Array<{ user_id: number; username: string; capital: number; season_points: number }>;

    const aggregated = this.db
      .prepare(
        `SELECT user_id, COALESCE(SUM(pnl), 0) as pnl, COALESCE(SUM(weighted_pnl), 0) as weighted, COUNT(*) as trades
         FROM trades WHERE match_id = ? GROUP BY user_id`,
      )
      .all(matchId) as Array<{ user_id: number; pnl: number; weighted: number; trades: number }>;
    const aggMap = new Map<number, { pnl: number; weighted: number; trades: number }>();
    for (const row of aggregated) {
      aggMap.set(row.user_id, { pnl: row.pnl, weighted: row.weighted, trades: row.trades });
    }

    const positions = this.db
      .prepare("SELECT user_id, direction, size, entry_price, open_time, take_profit, stop_loss, trade_number FROM positions")
      .all() as PositionRow[];
    const positionMap = new Map<number, PositionRow>();
    for (const pos of positions) positionMap.set(pos.user_id, pos);

    const lastPrice = this.market.getLastPrice();

    const rows = users.map(user => {
      const base = aggMap.get(user.user_id) ?? { pnl: 0, weighted: 0, trades: 0 };
      const position = positionMap.get(user.user_id);
      const tier = getRankTier(user.season_points);
      let pnl = base.pnl;
      let weighted = base.weighted;
      let tradesUsed = base.trades;
      if (position) {
        const sign = position.direction === "long" ? 1 : -1;
        const hold = Math.max(0, (Date.now() - position.open_time) / 1000);
        const w = getHoldWeight(hold);
        const unrealized = sign * ((lastPrice - position.entry_price) / position.entry_price) * position.size * tier.leverage;
        pnl += unrealized;
        weighted += unrealized * w;
        tradesUsed = Math.max(base.trades, position.trade_number);
      }

      return {
        userId: user.user_id,
        username: user.username,
        pnl: round2(pnl),
        weightedPnl: round2(weighted),
        pnlPct: round2((pnl / user.capital) * 100),
        tradesUsed,
        rankTier: tier.tier,
        rank: 0,
        matchPoints: 0,
        prizeEligible: tradesUsed >= MIN_TRADES_FOR_PRIZE,
        prizeAmount: 0,
      } as LeaderboardRow;
    });

    rows.sort((a, b) => {
      if (b.weightedPnl !== a.weightedPnl) return b.weightedPnl - a.weightedPnl;
      if (b.pnl !== a.pnl) return b.pnl - a.pnl;
      return a.userId - b.userId;
    });

    rows.forEach((row, idx) => {
      row.rank = idx + 1;
      row.matchPoints = getPointsForRank(row.rank);
      row.prizeAmount = row.prizeEligible ? getPrizeForRank(row.rank) : 0;
    });
    return rows;
  }

  private computeDirectionConsistency(userId: number, matchId: number): number {
    const rows = this.db
      .prepare("SELECT direction FROM trades WHERE user_id = ? AND match_id = ? ORDER BY close_time DESC LIMIT 30")
      .all(userId, matchId) as Array<{ direction: "long" | "short" }>;
    if (rows.length === 0) return 0;
    const longCount = rows.filter(row => row.direction === "long").length;
    const shortCount = rows.length - longCount;
    return round2(Math.max(longCount, shortCount) / rows.length);
  }

  private refreshRankSnapshot(rows: LeaderboardRow[]) {
    const now = Date.now();
    if (now - this.lastRankSnapshotAt < 5000) return;
    const newMap = new Map<number, number>();
    for (const row of rows) newMap.set(row.userId, row.rank);
    const nearCount = rows.filter(row => row.rank >= 290 && row.rank <= 310).length;
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

  private recentTradeVolume(matchId: number, lookbackMs: number): number {
    const cutoff = Date.now() - lookbackMs;
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM trades WHERE match_id = ? AND close_time >= ?")
      .get(matchId, cutoff) as { count: number };
    return row.count;
  }
}
