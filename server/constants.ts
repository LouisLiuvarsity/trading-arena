export const SYMBOL = "SOLUSDT";
export const STARTING_CAPITAL = 5000;
export const MAX_TRADES_PER_MATCH = 40;
export const MIN_TRADES_FOR_PRIZE = 5;
export const MATCH_DURATION_MS = 24 * 60 * 60 * 1000;
export const CLOSE_ONLY_SECONDS = 30 * 60;

export const HOLD_DURATION_WEIGHTS = [
  { minSeconds: 0, maxSeconds: 60, weight: 0.2 },
  { minSeconds: 60, maxSeconds: 180, weight: 0.4 },
  { minSeconds: 180, maxSeconds: 600, weight: 0.7 },
  { minSeconds: 600, maxSeconds: 1800, weight: 1.0 },
  { minSeconds: 1800, maxSeconds: 7200, weight: 1.15 },
  { minSeconds: 7200, maxSeconds: Number.POSITIVE_INFINITY, weight: 1.3 },
] as const;

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
  for (const row of HOLD_DURATION_WEIGHTS) {
    if (seconds >= row.minSeconds && seconds < row.maxSeconds) {
      return row.weight;
    }
  }
  return 1.3;
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
