// ============================================================
// Leaderboard — with dynamic rank fluctuation
// Design: Gold glowing promotion line, your rank highlighted
// Ranks fluctuate ±1-3 every 30s to simulate real competition
// ============================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LeaderboardEntry } from '@/lib/types';

interface Props {
  entries: LeaderboardEntry[];
  myRank: number;
  promotionLineRank: number;
}

export default function Leaderboard({ entries, myRank, promotionLineRank }: Props) {
  const [viewMode, setViewMode] = useState<'top' | 'around'>('around');
  const [liveEntries, setLiveEntries] = useState(entries);
  const [rankChanges, setRankChanges] = useState<Map<string, number>>(new Map());
  const prevEntriesRef = useRef(entries);

  // Dynamic rank fluctuation — every 30 seconds, shuffle some ranks ±1-3
  useEffect(() => {
    setLiveEntries(entries);
    prevEntriesRef.current = entries;

    const interval = setInterval(() => {
      setLiveEntries(prev => {
        const updated = [...prev];
        const changes = new Map<string, number>();

        // Randomly select 15-30 traders to swap ranks
        const swapCount = 15 + Math.floor(Math.random() * 15);
        for (let i = 0; i < swapCount; i++) {
          const idx = Math.floor(Math.random() * (updated.length - 1));
          const shift = Math.floor(Math.random() * 3) + 1;
          const targetIdx = Math.min(updated.length - 1, Math.max(0, idx + (Math.random() > 0.5 ? shift : -shift)));

          if (idx !== targetIdx && !updated[idx].isYou && !updated[targetIdx].isYou) {
            // Swap pnl and recalculate
            const temp = { ...updated[idx] };
            updated[idx] = {
              ...updated[idx],
              pnl: updated[targetIdx].pnl + (Math.random() - 0.5) * 10,
              pnlPct: updated[targetIdx].pnlPct + (Math.random() - 0.5) * 0.3,
            };
            updated[targetIdx] = {
              ...updated[targetIdx],
              pnl: temp.pnl + (Math.random() - 0.5) * 10,
              pnlPct: temp.pnlPct + (Math.random() - 0.5) * 0.3,
            };
          }
        }

        // Also shift user's rank slightly (±1-2) for realism
        const myIdx = updated.findIndex(e => e.isYou);
        if (myIdx >= 0) {
          const myShift = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;
          if (myShift !== 0) {
            const myTargetIdx = Math.min(updated.length - 1, Math.max(0, myIdx + myShift));
            if (!updated[myTargetIdx].isYou) {
              const myEntry = updated[myIdx];
              updated[myIdx] = updated[myTargetIdx];
              updated[myTargetIdx] = myEntry;
            }
          }
        }

        // Re-sort by pnlPct descending and reassign ranks
        updated.sort((a, b) => b.pnlPct - a.pnlPct);
        updated.forEach((entry, idx) => {
          const oldRank = entry.rank;
          entry.rank = idx + 1;
          entry.promotionScore = 1000 - entry.rank;
          if (oldRank !== entry.rank) {
            changes.set(entry.username, oldRank - entry.rank); // positive = moved up
          }
        });

        setRankChanges(changes);
        return updated;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [entries]);

  // Clear rank change indicators after 5 seconds
  useEffect(() => {
    if (rankChanges.size === 0) return;
    const timer = setTimeout(() => setRankChanges(new Map()), 5000);
    return () => clearTimeout(timer);
  }, [rankChanges]);

  const currentMyRank = useMemo(() => {
    const me = liveEntries.find(e => e.isYou);
    return me?.rank ?? myRank;
  }, [liveEntries, myRank]);

  const displayEntries = useMemo(() => {
    if (viewMode === 'top') {
      return liveEntries.slice(0, 30);
    }
    const myIdx = liveEntries.findIndex(e => e.isYou);
    const start = Math.max(0, myIdx - 10);
    const end = Math.min(liveEntries.length, myIdx + 10);
    const around = liveEntries.slice(start, end);
    const top3 = liveEntries.slice(0, 3);
    return [...top3, { rank: -1, username: '...', pnlPct: 0, pnl: 0, profitSharePct: 0, withdrawable: 0, promotionScore: 0 } as LeaderboardEntry, ...around];
  }, [liveEntries, viewMode]);

  const promotionEntry = liveEntries.find(e => e.rank === promotionLineRank);
  const promotionPnlPct = promotionEntry?.pnlPct ?? 0;
  const myEntry = liveEntries.find(e => e.isYou);
  const gapToPromotion = myEntry ? (promotionPnlPct - myEntry.pnlPct).toFixed(2) : '?';

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Leaderboard</span>
          <span className="text-[9px] text-[#848E9C] bg-white/5 px-1.5 py-0.5 rounded">LIVE</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('top')}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'top' ? 'bg-white/10 text-white' : 'text-[#848E9C]'}`}
          >
            Top
          </button>
          <button
            onClick={() => setViewMode('around')}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'around' ? 'bg-white/10 text-white' : 'text-[#848E9C]'}`}
          >
            Around Me
          </button>
        </div>
      </div>

      {/* Promotion line info */}
      <div className="px-3 py-2 bg-[#F0B90B]/5 border-b border-[#F0B90B]/20">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#F0B90B] font-semibold">⚡ Promotion Line #{promotionLineRank}</span>
          <span className="text-[#F0B90B] font-mono">+{promotionPnlPct.toFixed(2)}%</span>
        </div>
        {currentMyRank > promotionLineRank && (
          <div className="text-[10px] text-[#F6465D] mt-0.5">
            You need +{gapToPromotion}% more to reach promotion line
          </div>
        )}
        {currentMyRank <= promotionLineRank && (
          <div className="text-[10px] text-[#0ECB81] mt-0.5">
            ✓ You are above the promotion line
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center px-3 py-1 text-[10px] text-[#848E9C] border-b border-[rgba(255,255,255,0.04)]">
        <span className="w-10">#</span>
        <span className="flex-1">Trader</span>
        <span className="w-12 text-right">Δ</span>
        <span className="w-16 text-right">PnL%</span>
        <span className="w-16 text-right">PnL</span>
        <span className="w-10 text-right">Score</span>
      </div>

      {/* Entries */}
      <ScrollArea className="flex-1">
        <div className="px-1">
          {displayEntries.map((entry, idx) => {
            if (entry.rank === -1) {
              return (
                <div key="separator" className="text-center text-[10px] text-[#848E9C] py-1">• • •</div>
              );
            }
            const isPromotionLine = entry.rank === promotionLineRank;
            const isMe = entry.isYou;
            const change = rankChanges.get(entry.username);

            return (
              <div key={`${entry.rank}-${entry.username}`}>
                {/* Promotion line divider */}
                {isPromotionLine && (
                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#F0B90B] animate-pulse-gold" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#0B0E11] px-2 text-[9px] text-[#F0B90B] font-semibold">
                        ═ PROMOTION LINE ═
                      </span>
                    </div>
                  </div>
                )}
                <div className={`flex items-center px-2 py-[3px] text-[11px] font-mono rounded transition-all duration-300 ${
                  isMe
                    ? 'bg-[#F0B90B]/10 border border-[#F0B90B]/30'
                    : entry.isBot
                      ? 'bg-[#8B5CF6]/5 border border-[#8B5CF6]/10'
                      : change && change !== 0
                        ? change > 0 ? 'bg-[#0ECB81]/5' : 'bg-[#F6465D]/5'
                        : 'hover:bg-white/3'
                }`}>
                  <span className={`w-10 ${
                    entry.rank <= 3 ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
                  }`}>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </span>
                  <span className={`flex-1 truncate flex items-center gap-1 ${isMe ? 'text-[#F0B90B] font-semibold' : entry.isBot ? 'text-[#A78BFA]' : 'text-[#D1D4DC]'}`}>
                    {entry.isBot && (
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 shrink-0" title="Quant Bot">
                        <Bot className="w-2.5 h-2.5 text-[#A78BFA]" />
                      </span>
                    )}
                    {entry.username}
                  </span>
                  <span className="w-12 text-right text-[10px]">
                    {change && change !== 0 ? (
                      <span className={change > 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                        {change > 0 ? `▲${change}` : `▼${Math.abs(change)}`}
                      </span>
                    ) : (
                      <span className="text-[#5E6673]">—</span>
                    )}
                  </span>
                  <span className={`w-16 text-right ${entry.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {entry.pnlPct >= 0 ? '+' : ''}{entry.pnlPct.toFixed(2)}%
                  </span>
                  <span className={`w-16 text-right ${entry.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(1)}
                  </span>
                  <span className="w-10 text-right text-[#848E9C]">{entry.promotionScore}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
