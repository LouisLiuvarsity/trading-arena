// ============================================================
// Mini Leaderboard — Compact strip for bottom panel (90px height)
// Shows promotion line status, your rank, and nearby ranks
// ============================================================

import { useMemo, memo } from 'react';
import type { LeaderboardEntry } from '@/lib/types';

interface Props {
  entries: LeaderboardEntry[];
  myRank: number;
  promotionLineRank: number;
}

function MiniLeaderboard({ entries, myRank, promotionLineRank }: Props) {
  const { promotionEntry, myEntry, nearbyEntries } = useMemo(() => {
    const pEntry = entries.find(e => e.rank === promotionLineRank);
    const mEntry = entries.find(e => e.rank === myRank);
    const myIdx = myRank - 1;
    const nearby = entries.slice(Math.max(0, myIdx - 1), Math.min(entries.length, myIdx + 2));
    return { promotionEntry: pEntry, myEntry: mEntry, nearbyEntries: nearby };
  }, [entries, myRank, promotionLineRank]);

  const isAbovePromotion = myRank <= promotionLineRank;
  const promotionPnlPct = promotionEntry?.pnlPct ?? 0;
  const gapPct = (myEntry?.pnlPct ?? 0) - promotionPnlPct;

  return (
    <div className="flex flex-col h-full text-[10px]">
      {/* Header with promotion line */}
      <div className="px-2 py-1 bg-[#F0B90B]/5 border-b border-[#F0B90B]/15 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[#F0B90B] font-semibold text-[9px]">⚡ Line #{promotionLineRank}</span>
          <span className="text-[#F0B90B] font-mono text-[9px]">+{promotionPnlPct.toFixed(2)}%</span>
        </div>
        <div className={`text-[8px] ${isAbovePromotion ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {isAbovePromotion
            ? `✓ Safe by ${promotionLineRank - myRank} spots`
            : `Need +${Math.abs(gapPct).toFixed(2)}% more`
          }
        </div>
      </div>

      {/* Nearby ranks */}
      <div className="flex-1 overflow-hidden px-1 py-0.5">
        {nearbyEntries.map(e => {
          const isMe = e.isYou;
          return (
            <div key={e.rank} className={`flex items-center px-1 py-[1px] font-mono rounded ${
              isMe ? 'bg-[#F0B90B]/10 text-[#F0B90B]' : 'text-[#D1D4DC]'
            }`}>
              <span className={`w-6 text-[9px] ${e.rank <= 3 ? 'text-[#F0B90B]' : 'text-[#848E9C]'}`}>
                {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}
              </span>
              <span className="flex-1 truncate text-[9px]">{e.username}</span>
              <span className={`text-[9px] ${e.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {e.pnlPct >= 0 ? '+' : ''}{e.pnlPct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Your rank summary */}
      <div className="px-2 py-1 border-t border-[rgba(255,255,255,0.06)] bg-[#0B0E11] shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[#F0B90B] font-semibold">You: #{myRank}</span>
          <span className={`font-mono ${(myEntry?.pnlPct ?? 0) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {(myEntry?.pnlPct ?? 0) >= 0 ? '+' : ''}{(myEntry?.pnlPct ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(MiniLeaderboard);
