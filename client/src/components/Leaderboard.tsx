// ============================================================
// Leaderboard — Mini version with promotion line highlight
// Design: Gold glowing promotion line, your rank highlighted
// ============================================================

import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LeaderboardEntry } from '@/lib/types';

interface Props {
  entries: LeaderboardEntry[];
  myRank: number;
  promotionLineRank: number; // e.g. 300
}

export default function Leaderboard({ entries, myRank, promotionLineRank }: Props) {
  const [viewMode, setViewMode] = useState<'top' | 'around'>('around');

  const displayEntries = useMemo(() => {
    if (viewMode === 'top') {
      return entries.slice(0, 30);
    }
    // Show around user's rank
    const start = Math.max(0, myRank - 10);
    const end = Math.min(entries.length, myRank + 10);
    const around = entries.slice(start, end);
    // Also include top 3
    const top3 = entries.slice(0, 3);
    return [...top3, { rank: -1, username: '...', pnlPct: 0, pnl: 0, profitSharePct: 0, withdrawable: 0, promotionScore: 0 } as LeaderboardEntry, ...around];
  }, [entries, myRank, viewMode]);

  const promotionEntry = entries.find(e => e.rank === promotionLineRank);
  const promotionPnlPct = promotionEntry?.pnlPct ?? 0;
  const myEntry = entries.find(e => e.rank === myRank);
  const gapToPromotion = myEntry ? (promotionPnlPct - myEntry.pnlPct).toFixed(2) : '?';

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <span>Leaderboard</span>
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
        {myRank > promotionLineRank && (
          <div className="text-[10px] text-[#F6465D] mt-0.5">
            You need +{gapToPromotion}% more to reach promotion line
          </div>
        )}
        {myRank <= promotionLineRank && (
          <div className="text-[10px] text-[#0ECB81] mt-0.5">
            ✓ You are above the promotion line
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center px-3 py-1 text-[10px] text-[#848E9C] border-b border-[rgba(255,255,255,0.04)]">
        <span className="w-10">#</span>
        <span className="flex-1">Trader</span>
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
            const isAbovePromotion = entry.rank <= promotionLineRank;

            return (
              <div key={entry.rank}>
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
                <div className={`flex items-center px-2 py-[3px] text-[11px] font-mono rounded transition-colors ${
                  isMe
                    ? 'bg-[#F0B90B]/10 border border-[#F0B90B]/30'
                    : 'hover:bg-white/3'
                }`}>
                  <span className={`w-10 ${
                    entry.rank <= 3 ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
                  }`}>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </span>
                  <span className={`flex-1 truncate ${isMe ? 'text-[#F0B90B] font-semibold' : 'text-[#D1D4DC]'}`}>
                    {entry.username}
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
