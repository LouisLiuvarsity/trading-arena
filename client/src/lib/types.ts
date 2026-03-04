// ============================================================
// Trading Arena Types — v5.0
// 24h Crypto Trading Competition Platform
// Monthly: 15 Regular Matches + 1 Grand Final
// Rank tiers by cumulative season points (LoL-style)
// ============================================================

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  stale?: boolean;
  lastUpdatedAt?: number;
}

export interface PredictionState {
  currentRoundKey: string;
  isWindowOpen: boolean;
  windowClosesIn: number;
  alreadySubmitted: boolean;
  submittedDirection: "up" | "down" | null;
  stats: {
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    pendingCount: number;
  };
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface Position {
  direction: 'long' | 'short';
  size: number;
  entryPrice: number;
  openTime: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  holdDurationWeight: number;
  tradeNumber: number;
  takeProfit: number | null;
  stopLoss: number | null;
}

export interface CompletedTrade {
  id: string;
  direction: 'long' | 'short';
  size: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  fee: number;
  weightedPnl: number;
  holdDuration: number;
  holdDurationWeight: number;
  closeReason: 'manual' | 'sl' | 'tp' | 'time_limit' | 'match_end';
  openTime: number;
  closeTime: number;
}

// v5.0: Match types
export type MatchType = 'regular' | 'grand_final';

export interface MatchState {
  matchId: string;
  matchNumber: number; // 1-15 for regular, 16 for grand final
  matchType: MatchType;
  totalRegularMatches: 15;
  startTime: number;
  endTime: number;
  elapsed: number; // 0-1
  remainingSeconds: number;
  symbol: string;
  participantCount: number;
  prizePool: number; // 500 USDT regular, 2500 USDT grand final
  isCloseOnly: boolean; // true in last 30 min
  monthLabel: string; // e.g. "2026年3月"
}

// v5.0: LoL-style rank tiers driven by cumulative season points
export type RankTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export const RANK_TIERS = [
  { tier: 'iron' as const, minPoints: 0, maxPoints: 99, label: '黑铁', labelEn: 'Iron', leverage: 1, color: '#5E6673', icon: '⚙️' },
  { tier: 'bronze' as const, minPoints: 100, maxPoints: 299, label: '青铜', labelEn: 'Bronze', leverage: 1.2, color: '#CD7F32', icon: '🥉' },
  { tier: 'silver' as const, minPoints: 300, maxPoints: 599, label: '白银', labelEn: 'Silver', leverage: 1.5, color: '#C0C0C0', icon: '🥈' },
  { tier: 'gold' as const, minPoints: 600, maxPoints: 999, label: '黄金', labelEn: 'Gold', leverage: 2, color: '#F0B90B', icon: '🥇' },
  { tier: 'platinum' as const, minPoints: 1000, maxPoints: 1499, label: '铂金', labelEn: 'Platinum', leverage: 2.5, color: '#00D4AA', icon: '💠' },
  { tier: 'diamond' as const, minPoints: 1500, maxPoints: Infinity, label: '钻石', labelEn: 'Diamond', leverage: 3, color: '#B9F2FF', icon: '💎' },
] as const;

// Helper: get rank tier from cumulative points
export function getRankTier(seasonPoints: number) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (seasonPoints >= RANK_TIERS[i].minPoints) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

// v5.0: Min trades per match for prize eligibility
export const MIN_TRADES_FOR_PRIZE = 5;

// v5.0: Monthly points decay factor
export const POINTS_DECAY_FACTOR = 0.8;

export interface AccountState {
  capital: number; // 5000 for all tiers
  equity: number;
  pnl: number;
  pnlPct: number;
  weightedPnl: number; // main ranking metric
  tradesUsed: number;
  tradesMax: number; // 40
  rank: number;
  // Points system
  matchPoints: number; // points earned this match
  seasonPoints: number; // cumulative points across all matches this month
  grandFinalQualified: boolean;
  grandFinalLine: number; // estimated qualification line
  // v5.0: Prize eligibility by min trades (replaces participation score)
  prizeEligible: boolean; // true if tradesUsed >= MIN_TRADES_FOR_PRIZE
  // v5.0: Rank tier (LoL-style, driven by seasonPoints)
  rankTier: RankTier;
  tierLeverage: number; // 1x, 1.2x, 1.5x, 2x, 2.5x, 3x
  // Prize info
  prizeAmount: number; // estimated prize based on current rank
  directionConsistency: number; // 0-1, >0.7 gets 1.05x bonus
  directionBonus: boolean;
}

// v5.0: Season/Monthly tracking
export interface SeasonState {
  seasonId: string;
  month: string; // "2026-03"
  matchesPlayed: number;
  matchesTotal: 15;
  grandFinalScheduled: boolean;
  matches: Array<{
    matchNumber: number;
    matchType: MatchType;
    status: 'completed' | 'active' | 'pending';
    rank?: number;
    weightedPnl?: number;
    pnlPct?: number;
    pointsEarned?: number;
    prizeWon?: number;
  }>;
  totalPoints: number;
  grandFinalQualified: boolean;
  grandFinalRank?: number;
  // v5.0: Points before decay (last month)
  lastMonthPointsBeforeDecay?: number;
  lastMonthPointsAfterDecay?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  pnlPct: number;
  pnl: number;
  weightedPnl: number;
  matchPoints: number; // points earned this match
  prizeEligible: boolean; // true if >= 5 trades
  prizeAmount: number;
  rankTier: RankTier; // LoL-style tier
  isYou?: boolean;
  isBot?: boolean;
}

// v5.0: Overall leaderboard sorted by cumulative points
export interface AllTimeLeaderboardEntry {
  rank: number;
  username: string;
  seasonPoints: number; // cumulative points this season
  matchesPlayed: number;
  avgPointsPerMatch: number;
  totalWeightedPnl: number;
  avgPnlPct: number;
  winRate: number;
  bestMatchRank: number;
  rankTier: RankTier;
  grandFinalQualified: boolean;
  isBot?: boolean;
}

// Quant Bot Performance Data
export interface QuantBotStats {
  name: string;
  totalReturn: number;
  totalReturnPct: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgHoldDuration: string;
  currentPosition: {
    direction: 'long' | 'short' | 'flat';
    size: number;
    entryPrice: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
  } | null;
  recentTrades: Array<{
    id: string;
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPct: number;
    holdDuration: string;
    timestamp: number;
  }>;
  equityCurve: Array<{ time: number; equity: number }>;
  vsHumans: {
    botReturnPct: number;
    avgHumanReturnPct: number;
    topHumanReturnPct: number;
    botWinRate: number;
    avgHumanWinRate: number;
    botMaxDrawdown: number;
    avgHumanMaxDrawdown: number;
    botSharpe: number;
    avgHumanSharpe: number;
  };
}

// v5.0: Prize distribution tables
export const REGULAR_PRIZE_TABLE = [
  { rankMin: 1, rankMax: 1, prize: 55 },
  { rankMin: 2, rankMax: 2, prize: 35 },
  { rankMin: 3, rankMax: 3, prize: 25 },
  { rankMin: 4, rankMax: 5, prize: 15 },
  { rankMin: 6, rankMax: 10, prize: 10 },
  { rankMin: 11, rankMax: 20, prize: 6 },
  { rankMin: 21, rankMax: 50, prize: 4 },
  { rankMin: 51, rankMax: 100, prize: 2.5 },
] as const;

export const GRAND_FINAL_PRIZE_TABLE = [
  { rankMin: 1, rankMax: 1, prize: 300 },
  { rankMin: 2, rankMax: 2, prize: 200 },
  { rankMin: 3, rankMax: 3, prize: 150 },
  { rankMin: 4, rankMax: 5, prize: 100 },
  { rankMin: 6, rankMax: 10, prize: 60 },
  { rankMin: 11, rankMax: 20, prize: 35 },
  { rankMin: 21, rankMax: 50, prize: 15 },
  { rankMin: 51, rankMax: 100, prize: 11 },
] as const;

// v5.0: Points table per regular match
export const MATCH_POINTS_TABLE = [
  { rankMin: 1, rankMax: 1, points: 100 },
  { rankMin: 2, rankMax: 3, points: 70 },
  { rankMin: 4, rankMax: 10, points: 50 },
  { rankMin: 11, rankMax: 50, points: 30 },
  { rankMin: 51, rankMax: 100, points: 15 },
  { rankMin: 101, rankMax: 300, points: 5 },
  { rankMin: 301, rankMax: 1000, points: 0 },
] as const;

// Log-sigmoid hold duration weight
// weight(t) = W_MIN + (W_MAX - W_MIN) / (1 + (T_MID / t)^K)
export const HOLD_WEIGHT_MIN = 0.5;
export const HOLD_WEIGHT_MAX = 1.1;
export const HOLD_WEIGHT_MID_SECONDS = 300;
export const HOLD_WEIGHT_STEEPNESS = 1.5;

export function getHoldWeight(seconds: number): number {
  if (seconds <= 0) return HOLD_WEIGHT_MIN;
  const ratio = Math.pow(HOLD_WEIGHT_MID_SECONDS / seconds, HOLD_WEIGHT_STEEPNESS);
  const weight = HOLD_WEIGHT_MIN + (HOLD_WEIGHT_MAX - HOLD_WEIGHT_MIN) / (1 + ratio);
  return Math.round(weight * 100) / 100;
}

// Sample data points for UI display
export const HOLD_WEIGHT_SAMPLES = [
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '1m' },
  { seconds: 180, label: '3m' },
  { seconds: 300, label: '5m' },
  { seconds: 600, label: '10m' },
  { seconds: 1800, label: '30m' },
  { seconds: 3600, label: '1h' },
  { seconds: 7200, label: '2h+' },
] as const;

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system' | 'alert' | 'brag' | 'panic';
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  url?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  impact?: 'high' | 'medium' | 'low';
  isBreaking?: boolean;
}

export interface SocialData {
  longPct: number;
  shortPct: number;
  longPctDelta: number;
  profitablePct: number;
  losingPct: number;
  avgProfitPct: number;
  avgLossPct: number;
  avgTradesPerPerson: number;
  medianTradesPerPerson: number;
  activeTradersPct: number;
  nearPromotionCount: number;
  nearPromotionRange: string;
  nearPromotionDelta: number;
  consecutiveLossLeader: number;
  tradersOnLosingStreak: number;
  recentDirectionBias: 'long' | 'short' | 'neutral';
  recentTradeVolume: number;
  avgRankChange30m: number;
  tradersOvertakenYou: number;
  youOvertook: number;
}

export type TimeframeKey = '1m' | '5m' | '15m' | '1h' | '4h';
