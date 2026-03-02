// ============================================================
// Trading Arena Types — v4.0
// 24h Crypto Trading Competition Platform
// Monthly: 15 Regular Matches + 1 Grand Final
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
  participationScore: number;
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
  weightedPnl: number;
  holdDuration: number;
  holdDurationWeight: number;
  participationScore: number;
  closeReason: 'manual' | 'sl' | 'tp' | 'time_limit' | 'match_end';
  openTime: number;
  closeTime: number;
}

// v4.0: Match types
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

export interface AccountState {
  capital: number; // 5000 (Starter), 10000 (Intermediate), 20000 (Advanced)
  equity: number;
  pnl: number;
  pnlPct: number;
  weightedPnl: number; // v4.0: main ranking metric
  tradesUsed: number;
  tradesMax: number; // 40
  rank: number;
  // v4.0: Points system
  matchPoints: number; // points earned this match
  seasonPoints: number; // cumulative points across all matches this month
  grandFinalQualified: boolean;
  grandFinalLine: number; // estimated qualification line
  // Participation score
  participationScore: number;
  participationTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  prizeEligible: boolean; // false if bronze
  // Promotion system
  tier: 'starter' | 'intermediate' | 'advanced';
  tierCapital: number;
  tierLeverage: number; // 1x, 2x, 3x
  // Prize info
  prizeAmount: number; // estimated prize based on current rank
  directionConsistency: number; // 0-1, >0.7 gets 1.05x bonus
  directionBonus: boolean;
}

// v4.0: Season/Monthly tracking
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
    participationTier?: string;
  }>;
  totalPoints: number;
  grandFinalQualified: boolean;
  grandFinalRank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  pnlPct: number;
  pnl: number;
  weightedPnl: number;
  matchPoints: number; // points earned this match
  participationTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  prizeAmount: number;
  isYou?: boolean;
  isBot?: boolean;
}

// v4.0: Overall leaderboard sorted by cumulative points
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
  participationTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  tier: 'starter' | 'intermediate' | 'advanced';
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

// v4.0: Prize distribution tables
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

// v4.0: Points table per regular match
export const MATCH_POINTS_TABLE = [
  { rankMin: 1, rankMax: 1, points: 100 },
  { rankMin: 2, rankMax: 3, points: 70 },
  { rankMin: 4, rankMax: 10, points: 50 },
  { rankMin: 11, rankMax: 50, points: 30 },
  { rankMin: 51, rankMax: 100, points: 15 },
  { rankMin: 101, rankMax: 300, points: 5 },
  { rankMin: 301, rankMax: 1000, points: 0 },
] as const;

// v4.0: Hold duration weights
export const HOLD_DURATION_WEIGHTS = [
  { minSeconds: 0, maxSeconds: 60, weight: 0.2, label: '< 1 min' },
  { minSeconds: 60, maxSeconds: 180, weight: 0.4, label: '1-3 min' },
  { minSeconds: 180, maxSeconds: 600, weight: 0.7, label: '3-10 min' },
  { minSeconds: 600, maxSeconds: 1800, weight: 1.0, label: '10-30 min' },
  { minSeconds: 1800, maxSeconds: 7200, weight: 1.15, label: '30min-2h' },
  { minSeconds: 7200, maxSeconds: Infinity, weight: 1.3, label: '2-4h+' },
] as const;

// v4.0: Participation tiers
export const PARTICIPATION_TIERS = [
  { tier: 'bronze' as const, min: 0, max: 4999, label: 'Bronze', eligible: false },
  { tier: 'silver' as const, min: 5000, max: 14999, label: 'Silver', eligible: true },
  { tier: 'gold' as const, min: 15000, max: 29999, label: 'Gold', eligible: true },
  { tier: 'diamond' as const, min: 30000, max: Infinity, label: 'Diamond', eligible: true },
] as const;

// v4.0: Promotion tiers
export const PROMOTION_TIERS = [
  { tier: 'starter' as const, capital: 5000, leverage: 1, label: 'Starter', condition: 'Default' },
  { tier: 'intermediate' as const, capital: 10000, leverage: 2, label: 'Intermediate', condition: 'Monthly avg top 20%' },
  { tier: 'advanced' as const, capital: 20000, leverage: 3, label: 'Advanced', condition: '2 consecutive months top 10%' },
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
