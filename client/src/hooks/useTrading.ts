// ============================================================
// Simulated Trading Engine — v5.0
// 5000U Capital / Fixed Prize Pool (500 USDT per regular match)
// Points-based grand final qualification
// Min 5 trades/match for prize eligibility
// Rank tiers by cumulative season points (LoL-style)
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { Position, CompletedTrade, AccountState } from '@/lib/types';
import { HOLD_DURATION_WEIGHTS, REGULAR_PRIZE_TABLE, MATCH_POINTS_TABLE, MIN_TRADES_FOR_PRIZE, getRankTier } from '@/lib/types';
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
        tradeNumber: tradeCounterRef.current,
        takeProfit: tp ?? null,
        stopLoss: sl ?? null,
      };
      positionRef.current = newPosition;
      setPosition(newPosition);
      return {
        ...prev,
        tradesUsed: tradeCounterRef.current,
        // Update prize eligibility based on trade count
        prizeEligible: tradeCounterRef.current >= MIN_TRADES_FOR_PRIZE,
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
    // Apply tier leverage to P&L
    const leverage = account.tierLeverage;
    const pnl = direction * (price - pos.entryPrice) / pos.entryPrice * pos.size * leverage;
    const pnlPct = direction * (price - pos.entryPrice) / pos.entryPrice * 100 * leverage;
    const weightedPnl = pnl * weight;

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
      const rankDelta = trade.pnl > 0 ? -Math.floor(Math.random() * 15) : Math.floor(Math.random() * 10);
      const newRank = Math.max(1, Math.min(1000, prev.rank + rankDelta));
      const eligible = prev.tradesUsed >= MIN_TRADES_FOR_PRIZE;
      const newPrize = eligible ? getPrizeForRank(newRank) : 0;
      const newPoints = getPointsForRank(newRank);
      return {
        ...prev,
        equity: Math.round(newEquity * 100) / 100,
        pnl: Math.round(newPnl * 100) / 100,
        pnlPct: Math.round((newPnl / prev.capital) * 10000) / 100,
        weightedPnl: Math.round(newWeightedPnl * 100) / 100,
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
    // Apply tier leverage to unrealized P&L
    const leverage = account.tierLeverage;
    const pnl = dir * (price - pos.entryPrice) / pos.entryPrice * pos.size * leverage;
    const pnlPct = dir * (price - pos.entryPrice) / pos.entryPrice * 100 * leverage;

    const updated: Position = {
      ...pos,
      unrealizedPnl: Math.round(pnl * 100) / 100,
      unrealizedPnlPct: Math.round(pnlPct * 100) / 100,
      holdDurationWeight: weight,
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
