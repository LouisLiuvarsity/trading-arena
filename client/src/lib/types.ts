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
  capital: number; // 500
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
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system' | 'alert';
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  url?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface SocialData {
  longPct: number;
  shortPct: number;
  profitablePct: number;
  losingPct: number;
  nearPromotionCount: number;
  nearPromotionRange: string;
}

export type TimeframeKey = '1m' | '5m' | '15m' | '1h' | '4h';
