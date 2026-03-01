// ============================================================
// Simulated Trading Engine
// Pure frontend mock trading with realistic competition mechanics
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

function getNextWeightThreshold(seconds: number): { nextWeight: number; secondsNeeded: number } | null {
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

function getProfitShareTier(score: number): number {
  if (score >= 4000) return 50;
  if (score >= 2500) return 45;
  if (score >= 1000) return 40;
  return 30;
}

export function useTrading(currentPrice: number) {
  const [position, setPosition] = useState<Position | null>(null);
  const [trades, setTrades] = useState<CompletedTrade[]>([]);
  const [account, setAccount] = useState<AccountState>(generateAccountState());
  const tradeCounterRef = useRef(account.tradesUsed);

  const openPosition = useCallback((direction: 'long' | 'short', sizeUsdt: number) => {
    if (position) return; // Already have a position
    if (tradeCounterRef.current >= account.tradesMax) return;
    if (sizeUsdt <= 0 || sizeUsdt > account.equity) return;

    tradeCounterRef.current += 1;
    const newPosition: Position = {
      direction,
      size: sizeUsdt,
      entryPrice: currentPrice,
      openTime: Date.now(),
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      holdDurationWeight: 0.2,
      participationScore: 0,
      tradeNumber: tradeCounterRef.current,
    };
    setPosition(newPosition);
    setAccount(prev => ({
      ...prev,
      tradesUsed: tradeCounterRef.current,
    }));
  }, [position, currentPrice, account.equity, account.tradesMax]);

  const closePosition = useCallback((exitPrice?: number) => {
    if (!position) return null;

    const price = exitPrice || currentPrice;
    const holdSeconds = (Date.now() - position.openTime) / 1000;
    const weight = getHoldWeight(holdSeconds);
    const direction = position.direction === 'long' ? 1 : -1;
    const pnl = direction * (price - position.entryPrice) / position.entryPrice * position.size;
    const pnlPct = direction * (price - position.entryPrice) / position.entryPrice * 100;
    const weightedPnl = pnl * weight;
    const participationScore = position.size * weight;

    const trade: CompletedTrade = {
      id: `trade-${Date.now()}`,
      direction: position.direction,
      size: position.size,
      entryPrice: position.entryPrice,
      exitPrice: price,
      pnl: Math.round(pnl * 100) / 100,
      pnlPct: Math.round(pnlPct * 100) / 100,
      weightedPnl: Math.round(weightedPnl * 100) / 100,
      holdDuration: holdSeconds,
      holdDurationWeight: weight,
      participationScore: Math.round(participationScore),
      closeReason: 'manual',
      openTime: position.openTime,
      closeTime: Date.now(),
    };

    setTrades(prev => [trade, ...prev]);
    setPosition(null);

    // Update account
    setAccount(prev => {
      const newPnl = prev.pnl + trade.pnl;
      const newEquity = prev.capital + newPnl;
      const newParticipation = prev.participationScore + trade.participationScore;
      const newSharePct = getProfitShareTier(newParticipation);
      const newWithdrawable = newPnl > 0 ? newPnl * (newSharePct / 100) : 0;
      // Simulate rank change
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
  }, [position, currentPrice]);

  // Update unrealized PnL
  const updatePosition = useCallback(() => {
    if (!position) return;
    const holdSeconds = (Date.now() - position.openTime) / 1000;
    const weight = getHoldWeight(holdSeconds);
    const direction = position.direction === 'long' ? 1 : -1;
    const pnl = direction * (currentPrice - position.entryPrice) / position.entryPrice * position.size;
    const pnlPct = direction * (currentPrice - position.entryPrice) / position.entryPrice * 100;
    const participationScore = position.size * weight;

    setPosition(prev => prev ? {
      ...prev,
      unrealizedPnl: Math.round(pnl * 100) / 100,
      unrealizedPnlPct: Math.round(pnlPct * 100) / 100,
      holdDurationWeight: weight,
      participationScore: Math.round(participationScore),
    } : null);
  }, [position, currentPrice]);

  return {
    position,
    trades,
    account,
    openPosition,
    closePosition,
    updatePosition,
    getNextWeightThreshold,
  };
}
