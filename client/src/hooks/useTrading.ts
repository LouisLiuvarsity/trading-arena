// ============================================================
// Simulated Trading Engine — v4.0
// 5000U Capital / Fixed Prize Pool (500 USDT per regular match)
// Points-based grand final qualification
// Participation score tiers: Bronze/Silver/Gold/Diamond
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { Position, CompletedTrade, AccountState } from '@/lib/types';
import { HOLD_DURATION_WEIGHTS, REGULAR_PRIZE_TABLE, MATCH_POINTS_TABLE, PARTICIPATION_TIERS } from '@/lib/types';
import { generateAccountState } from '@/lib/mockData';

function getHoldWeight(seconds: number): number {
  for (const hw of HOLD_DURATION_WEIGHTS) {
    if (seconds >= hw.minSeconds && seconds < hw.maxSeconds) return hw.weight;
  }
  return 1.3;
}

function getNextWeightThresholdFn(seconds: number): { nextWeight: number; secondsNeeded: number } | null {
  for (let i = 0; i < HOLD_DURATION_WEIGHTS.length; i++) {
    const hw = HOLD_DURATION_WEIGHTS[i];
    if (seconds < hw.maxSeconds) {
      if (i < HOLD_DURATION_WEIGHTS.length - 1) {
        return {
          nextWeight: HOLD_DURATION_WEIGHTS[i + 1].weight,
          secondsNeeded: hw.maxSeconds - seconds,
        };
      }
      return null;
    }
  }
  return null;
}

function getParticipationTier(score: number): 'bronze' | 'silver' | 'gold' | 'diamond' {
  for (const tier of [...PARTICIPATION_TIERS].reverse()) {
    if (score >= tier.min) return tier.tier;
  }
  return 'bronze';
}

function isPrizeEligible(tier: 'bronze' | 'silver' | 'gold' | 'diamond'): boolean {
  return tier !== 'bronze';
}

function getPrizeForRank(rank: number): number {
  for (const tier of REGULAR_PRIZE_TABLE) {
    if (rank >= tier.rankMin && rank <= tier.rankMax) return tier.prize;
  }
  return 0;
}

function getPointsForRank(rank: number): number {
  for (const tier of MATCH_POINTS_TABLE) {
    if (rank >= tier.rankMin && rank <= tier.rankMax) return tier.points;
  }
  return 0;
}

export function useTrading(currentPrice: number) {
  const [position, setPosition] = useState<Position | null>(null);
  const [trades, setTrades] = useState<CompletedTrade[]>([]);
  const [account, setAccount] = useState<AccountState>(generateAccountState);
  const tradeCounterRef = useRef(account.tradesUsed);

  const positionRef = useRef<Position | null>(null);
  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;

  const closePositionRef = useRef<(exitPrice?: number, reason?: 'manual' | 'sl' | 'tp') => CompletedTrade | null>(null);

  const openPosition = useCallback((direction: 'long' | 'short', sizeUsdt: number, tp?: number | null, sl?: number | null) => {
    if (positionRef.current) return;
    setAccount(prev => {
      if (tradeCounterRef.current >= prev.tradesMax) return prev;
      if (sizeUsdt <= 0 || sizeUsdt > prev.equity) return prev;

      tradeCounterRef.current += 1;
      const newPosition: Position = {
        direction,
        size: sizeUsdt,
        entryPrice: priceRef.current,
        openTime: Date.now(),
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        holdDurationWeight: 0.2,
        participationScore: 0,
        tradeNumber: tradeCounterRef.current,
        takeProfit: tp ?? null,
        stopLoss: sl ?? null,
      };
      positionRef.current = newPosition;
      setPosition(newPosition);
      return {
        ...prev,
        tradesUsed: tradeCounterRef.current,
      };
    });
  }, []);

  const closePosition = useCallback((exitPrice?: number, reason?: 'manual' | 'sl' | 'tp') => {
    const pos = positionRef.current;
    if (!pos) return null;

    const price = exitPrice || priceRef.current;
    const holdSeconds = (Date.now() - pos.openTime) / 1000;
    const weight = getHoldWeight(holdSeconds);
    const direction = pos.direction === 'long' ? 1 : -1;
    const pnl = direction * (price - pos.entryPrice) / pos.entryPrice * pos.size;
    const pnlPct = direction * (price - pos.entryPrice) / pos.entryPrice * 100;
    const weightedPnl = pnl * weight;
    const participationScore = pos.size * weight;

    const trade: CompletedTrade = {
      id: `trade-${Date.now()}`,
      direction: pos.direction,
      size: pos.size,
      entryPrice: pos.entryPrice,
      exitPrice: price,
      pnl: Math.round(pnl * 100) / 100,
      pnlPct: Math.round(pnlPct * 100) / 100,
      weightedPnl: Math.round(weightedPnl * 100) / 100,
      holdDuration: holdSeconds,
      holdDurationWeight: weight,
      participationScore: Math.round(participationScore),
      closeReason: reason || 'manual',
      openTime: pos.openTime,
      closeTime: Date.now(),
    };

    positionRef.current = null;
    setTrades(prev => [trade, ...prev]);
    setPosition(null);

    setAccount(prev => {
      const newPnl = prev.pnl + trade.pnl;
      const newEquity = prev.capital + newPnl;
      const newWeightedPnl = prev.weightedPnl + trade.weightedPnl;
      const newParticipation = prev.participationScore + trade.participationScore;
      const newTier = getParticipationTier(newParticipation);
      const eligible = isPrizeEligible(newTier);
      const rankDelta = trade.pnl > 0 ? -Math.floor(Math.random() * 15) : Math.floor(Math.random() * 10);
      const newRank = Math.max(1, Math.min(1000, prev.rank + rankDelta));
      const newPrize = eligible ? getPrizeForRank(newRank) : 0;
      const newPoints = getPointsForRank(newRank);
      return {
        ...prev,
        equity: Math.round(newEquity * 100) / 100,
        pnl: Math.round(newPnl * 100) / 100,
        pnlPct: Math.round((newPnl / prev.capital) * 10000) / 100,
        weightedPnl: Math.round(newWeightedPnl * 100) / 100,
        participationScore: Math.round(newParticipation),
        participationTier: newTier,
        prizeEligible: eligible,
        rank: newRank,
        matchPoints: newPoints,
        prizeAmount: newPrize,
      };
    });

    return trade;
  }, []);

  closePositionRef.current = closePosition;

  const setTpSl = useCallback((tp: number | null, sl: number | null) => {
    const pos = positionRef.current;
    if (!pos) return;
    const updated: Position = {
      ...pos,
      takeProfit: tp,
      stopLoss: sl,
    };
    positionRef.current = updated;
    setPosition(updated);
  }, []);

  const updatePosition = useCallback(() => {
    const pos = positionRef.current;
    if (!pos) return;
    const price = priceRef.current;
    if (price <= 0) return;

    // Check TP/SL triggers
    if (pos.takeProfit !== null) {
      if (pos.direction === 'long' && price >= pos.takeProfit) {
        closePositionRef.current?.(pos.takeProfit, 'tp');
        return;
      }
      if (pos.direction === 'short' && price <= pos.takeProfit) {
        closePositionRef.current?.(pos.takeProfit, 'tp');
        return;
      }
    }
    if (pos.stopLoss !== null) {
      if (pos.direction === 'long' && price <= pos.stopLoss) {
        closePositionRef.current?.(pos.stopLoss, 'sl');
        return;
      }
      if (pos.direction === 'short' && price >= pos.stopLoss) {
        closePositionRef.current?.(pos.stopLoss, 'sl');
        return;
      }
    }

    const holdSeconds = (Date.now() - pos.openTime) / 1000;
    const weight = getHoldWeight(holdSeconds);
    const dir = pos.direction === 'long' ? 1 : -1;
    const pnl = dir * (price - pos.entryPrice) / pos.entryPrice * pos.size;
    const pnlPct = dir * (price - pos.entryPrice) / pos.entryPrice * 100;
    const participationScore = pos.size * weight;

    const updated: Position = {
      ...pos,
      unrealizedPnl: Math.round(pnl * 100) / 100,
      unrealizedPnlPct: Math.round(pnlPct * 100) / 100,
      holdDurationWeight: weight,
      participationScore: Math.round(participationScore),
    };
    positionRef.current = updated;
    setPosition(updated);
  }, []);

  const getNextWeightThreshold = useCallback((seconds: number) => {
    return getNextWeightThresholdFn(seconds);
  }, []);

  return {
    position,
    trades,
    account,
    openPosition,
    closePosition,
    updatePosition,
    getNextWeightThreshold,
    setTpSl,
  };
}
