// ============================================================
// Simulated Trading Engine — 5000U Capital / 5%-20% Profit Share
// Pure frontend mock trading with realistic competition mechanics
// Supports TP/SL auto-close, hold duration weights, participation scoring
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { Position, CompletedTrade, AccountState } from '@/lib/types';
import { generateAccountState } from '@/lib/mockData';

const HOLD_WEIGHTS: Array<{ maxSeconds: number; weight: number }> = [
  { maxSeconds: 60, weight: 0.2 },
  { maxSeconds: 180, weight: 0.4 },
  { maxSeconds: 600, weight: 0.7 },
  { maxSeconds: 1800, weight: 1.0 },
  { maxSeconds: 7200, weight: 1.15 },
  { maxSeconds: 14400, weight: 1.3 },
];

function getHoldWeight(seconds: number): number {
  for (const hw of HOLD_WEIGHTS) {
    if (seconds < hw.maxSeconds) return hw.weight;
  }
  return 1.3;
}

function getNextWeightThresholdFn(seconds: number): { nextWeight: number; secondsNeeded: number } | null {
  for (const hw of HOLD_WEIGHTS) {
    if (seconds < hw.maxSeconds) {
      const idx = HOLD_WEIGHTS.indexOf(hw);
      if (idx < HOLD_WEIGHTS.length - 1) {
        return {
          nextWeight: HOLD_WEIGHTS[idx + 1].weight,
          secondsNeeded: hw.maxSeconds - seconds,
        };
      }
      return null;
    }
  }
  return null;
}

// 5000U model: 5%-20% profit sharing tiers
function getProfitShareTier(score: number): number {
  if (score >= 40000) return 20;
  if (score >= 25000) return 15;
  if (score >= 10000) return 10;
  return 5;
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
      const newParticipation = prev.participationScore + trade.participationScore;
      const newSharePct = getProfitShareTier(newParticipation);
      const newWithdrawable = newPnl > 0 ? newPnl * (newSharePct / 100) : 0;
      const rankDelta = trade.pnl > 0 ? -Math.floor(Math.random() * 15) : Math.floor(Math.random() * 10);
      const newRank = Math.max(1, Math.min(1000, prev.rank + rankDelta));
      return {
        ...prev,
        equity: Math.round(newEquity * 100) / 100,
        pnl: Math.round(newPnl * 100) / 100,
        pnlPct: Math.round((newPnl / prev.capital) * 10000) / 100,
        participationScore: Math.round(newParticipation),
        profitSharePct: newSharePct,
        withdrawable: Math.round(newWithdrawable * 100) / 100,
        rank: newRank,
        promotionScore: 1000 - newRank,
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
