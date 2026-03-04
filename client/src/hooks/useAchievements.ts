import { useEffect, useRef, useState } from 'react';
import type { AccountState, CompletedTrade, Position } from '@/lib/types';

export type AchievementType =
  | 'consecutive_profits'
  | 'first_trade'
  | 'big_win'
  | 'big_loss'
  | 'enter_top10'
  | 'drop_from_top100';

export interface Achievement {
  id: string;
  type: AchievementType;
  triggeredAt: number;
  data?: Record<string, unknown>;
}

export function useAchievements(
  account: AccountState,
  trades: CompletedTrade[],
  position: Position | null,
): Achievement[] {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const initialized = useRef(false);
  const prevRank = useRef<number>(account.rank);
  const prevTradeCount = useRef<number>(trades.length);
  const prevPosition = useRef<Position | null>(position);
  const firedSet = useRef<Set<string>>(new Set());

  useEffect(() => {
    // First render: initialize refs only, don't detect
    if (!initialized.current) {
      prevRank.current = account.rank;
      prevTradeCount.current = trades.length;
      prevPosition.current = position;
      initialized.current = true;
      return;
    }

    const fired: Achievement[] = [];

    function fire(type: AchievementType, key: string, data?: Record<string, unknown>) {
      if (firedSet.current.has(key)) return;
      firedSet.current.add(key);
      fired.push({ id: key, type, triggeredAt: Date.now(), data });
    }

    // --- Rank transitions ---
    if (prevRank.current > 10 && account.rank <= 10) {
      fire('enter_top10', `enter_top10_${account.rank}_${Date.now()}`, { rank: account.rank });
    }
    if (prevRank.current <= 100 && account.rank > 100) {
      fire('drop_from_top100', `drop_top100_${Date.now()}`, { rank: account.rank });
    }
    prevRank.current = account.rank;

    // --- New trades detection ---
    if (trades.length > prevTradeCount.current) {
      const newCount = trades.length - prevTradeCount.current;
      // trades[] is sorted descending by closeTime, so slice(0, newCount) = newest
      const newTrades = trades.slice(0, newCount);

      for (const trade of newTrades) {
        if (trade.pnlPct >= 5) {
          fire('big_win', `big_win_${trade.id}`, { pnlPct: trade.pnlPct });
        }
        if (trade.pnlPct <= -5) {
          fire('big_loss', `big_loss_${trade.id}`, { pnlPct: trade.pnlPct });
        }
      }

      // Consecutive 3 profits
      if (trades.length >= 3) {
        const last3 = trades.slice(0, 3);
        if (last3.every(t => t.pnl > 0)) {
          const key = `consec_${last3.map(t => t.id).join('_')}`;
          fire('consecutive_profits', key, { count: 3 });
        }
      }
    }
    prevTradeCount.current = trades.length;

    // --- First trade of match ---
    if (!prevPosition.current && position && position.tradeNumber === 1) {
      fire('first_trade', `first_trade_${Date.now()}`);
    }
    prevPosition.current = position;

    if (fired.length > 0) {
      setAchievements(prev => [...fired, ...prev]);
    }
  }, [account.rank, trades, position]);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setAchievements(prev => prev.filter(a => now - a.triggeredAt < 3000));
    }, 500);
    return () => clearInterval(timer);
  }, [achievements.length]);

  return achievements;
}
