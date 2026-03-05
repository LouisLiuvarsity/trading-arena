import { TRADING_PAIR } from "../shared/tradingPair";

/** @deprecated Use MarketService.getSymbol() for dynamic symbol */
export const SYMBOL = TRADING_PAIR.symbol;
/** @deprecated Use getSymbolConfig() for dynamic base asset */
export const BASE_ASSET = TRADING_PAIR.baseAsset;
/** @deprecated Use getSymbolConfig() for dynamic quote asset */
export const QUOTE_ASSET = TRADING_PAIR.quoteAsset;
export const STARTING_CAPITAL = 5000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_TRADES_PER_MATCH = 40;
export const MIN_TRADES_FOR_PRIZE = 5;
export const MATCH_DURATION_MS = 24 * 60 * 60 * 1000;
export const CLOSE_ONLY_SECONDS = 30 * 60;
export const FEE_RATE = 0.0005; // 0.05% per side

// Log-sigmoid hold duration weight parameters
// weight(t) = W_MIN + (W_MAX - W_MIN) / (1 + (T_MID / t)^K)
export const HOLD_WEIGHT_MIN = 0.5;
export const HOLD_WEIGHT_MAX = 1.1;
export const HOLD_WEIGHT_MID_SECONDS = 300; // 5 minutes — midpoint
export const HOLD_WEIGHT_STEEPNESS = 1.5;

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

export const MATCH_POINTS_TABLE = [
  { rankMin: 1, rankMax: 1, points: 100 },
  { rankMin: 2, rankMax: 3, points: 70 },
  { rankMin: 4, rankMax: 10, points: 50 },
  { rankMin: 11, rankMax: 50, points: 30 },
  { rankMin: 51, rankMax: 100, points: 15 },
  { rankMin: 101, rankMax: 300, points: 5 },
  { rankMin: 301, rankMax: 1000, points: 0 },
] as const;

export const RANK_TIERS = [
  { tier: "iron", minPoints: 0, maxPoints: 99, leverage: 1 },
  { tier: "bronze", minPoints: 100, maxPoints: 299, leverage: 1.2 },
  { tier: "silver", minPoints: 300, maxPoints: 599, leverage: 1.5 },
  { tier: "gold", minPoints: 600, maxPoints: 999, leverage: 2 },
  { tier: "platinum", minPoints: 1000, maxPoints: 1499, leverage: 2.5 },
  { tier: "diamond", minPoints: 1500, maxPoints: Number.POSITIVE_INFINITY, leverage: 3 },
] as const;

export function getHoldWeight(seconds: number): number {
  if (seconds <= 0) return HOLD_WEIGHT_MIN;
  const ratio = Math.pow(HOLD_WEIGHT_MID_SECONDS / seconds, HOLD_WEIGHT_STEEPNESS);
  const weight = HOLD_WEIGHT_MIN + (HOLD_WEIGHT_MAX - HOLD_WEIGHT_MIN) / (1 + ratio);
  return Math.round(weight * 100) / 100;
}

export function getPrizeForRank(rank: number): number {
  for (const row of REGULAR_PRIZE_TABLE) {
    if (rank >= row.rankMin && rank <= row.rankMax) {
      return row.prize;
    }
  }
  return 0;
}

export function getPointsForRank(rank: number): number {
  for (const row of MATCH_POINTS_TABLE) {
    if (rank >= row.rankMin && rank <= row.rankMax) {
      return row.points;
    }
  }
  return 0;
}

export function getRankTier(seasonPoints: number): (typeof RANK_TIERS)[number] {
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (seasonPoints >= RANK_TIERS[i].minPoints) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}
