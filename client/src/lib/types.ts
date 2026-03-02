// ============================================================
// Trading Arena Types
// Design: Obsidian Exchange — Dark exchange + esports arena
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
  // TP/SL
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

export interface MatchState {
  matchId: string;
  matchNumber: number; // 1-3 in cycle
  totalMatches: 3;
  startTime: number;
  endTime: number;
  elapsed: number; // 0-1
  remainingSeconds: number;
  symbol: string;
  participantCount: number;
}

export interface AccountState {
  capital: number; // 5000
  equity: number;
  pnl: number;
  pnlPct: number;
  tradesUsed: number;
  tradesMax: number;
  rank: number;
  promotionScore: number;
  promotionThreshold: number;
  participationScore: number;
  profitSharePct: number;
  withdrawable: number;
  stage: number; // 1-3
  stageCapital: number;
  stageMaxLeverage: number;
}

export interface CycleState {
  cycleId: string;
  matches: Array<{
    matchNumber: number;
    status: 'completed' | 'active' | 'pending';
    rank?: number;
    promotionScore?: number;
    pnl?: number;
    profitSharePct?: number;
    withdrawable?: number;
  }>;
  avgPromotionScore: number;
  cumulativePnl: number;
  cumulativeWithdrawable: number;
  promotionTarget: string; // e.g. "进阶（1000U / 3x杠杆）"
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  pnlPct: number;
  pnl: number;
  profitSharePct: number;
  withdrawable: number;
  promotionScore: number;
  isYou?: boolean;
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

// Historical All-Time Leaderboard
export interface AllTimeLeaderboardEntry {
  rank: number;
  username: string;
  totalMatches: number;
  totalPnl: number;
  totalPnlPct: number;
  avgPnlPct: number;
  winRate: number;
  bestMatch: number;
  currentTier: string;
  isBot?: boolean;
}

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
  // L/S Ratio
  longPct: number;
  shortPct: number;
  longPctDelta: number; // change in last 5 min
  // Profit/Loss distribution
  profitablePct: number;
  losingPct: number;
  avgProfitPct: number; // average profit % of profitable traders
  avgLossPct: number; // average loss % of losing traders
  // Trading activity
  avgTradesPerPerson: number;
  medianTradesPerPerson: number;
  activeTradersPct: number; // % currently in a position
  // Promotion zone
  nearPromotionCount: number;
  nearPromotionRange: string;
  nearPromotionDelta: number; // change in last 10 min
  // Streaks
  consecutiveLossLeader: number; // max consecutive losses in the match
  tradersOnLosingStreak: number; // traders with 3+ consecutive losses
  // Crowd behavior
  recentDirectionBias: 'long' | 'short' | 'neutral'; // last 5 min dominant direction
  recentTradeVolume: number; // trades in last 5 min
  // Rank volatility
  avgRankChange30m: number; // average rank change in last 30 min
  tradersOvertakenYou: number; // traders who passed you in last 30 min
  youOvertook: number; // traders you passed in last 30 min
}

export type TimeframeKey = '1m' | '5m' | '15m' | '1h' | '4h';
