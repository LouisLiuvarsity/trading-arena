// ============================================================
// Mini Leaderboard — Always-visible compact leaderboard
// Design: Shows top 3, promotion line, and your rank ±5
// Gold pulsing promotion line, compact rows
// ============================================================

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LeaderboardEntry } from '@/lib/types';

interface Props {
  entries: LeaderboardEntry[];
  myRank: number;
  promotionLineRank: number;
}

export default function MiniLeaderboard({ entries, myRank, promotionLineRank }: Props) {
  const displayEntries = useMemo(() => {
    const top3 = entries.slice(0, 3);
    const promotionIdx = Math.max(0, promotionLineRank - 3);
    const nearPromotion = entries.slice(Math.max(3, promotionIdx - 2), promotionIdx + 3);
    const myIdx = myRank - 1;
    const nearMe = entries.slice(Math.max(0, myIdx - 2), Math.min(entries.length, myIdx + 3));

    // Build display list with separators
    const result: (LeaderboardEntry | { type: 'separator' })[] = [];
    result.push(...top3);

    // Add separator if gap between top3 and promotion zone
    if (nearPromotion.length > 0 && nearPromotion[0].rank > 4) {
      result.push({ type: 'separator' });
    }

    // Add promotion zone entries (avoid duplicates)
    nearPromotion.forEach(e => {
      if (!result.some(r => 'rank' in r && r.rank === e.rank)) {
        result.push(e);
      }
    });

    // Add separator if gap between promotion zone and my rank
    if (nearMe.length > 0 && nearMe[0].rank > (nearPromotion[nearPromotion.length - 1]?.rank ?? 3) + 1) {
      result.push({ type: 'separator' });
    }

    // Add my zone entries (avoid duplicates)
    nearMe.forEach(e => {
      if (!result.some(r => 'rank' in r && r.rank === e.rank)) {
        result.push(e);
      }
    });

    return result;
  }, [entries, myRank, promotionLineRank]);

  const promotionEntry = entries.find(e => e.rank === promotionLineRank);
  const promotionPnlPct = promotionEntry?.pnlPct ?? 0;
  const myEntry = entries.find(e => e.rank === myRank);
  const isAbovePromotion = myRank <= promotionLineRank;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <span>Leaderboard</span>
        <span className="text-[10px] text-[#848E9C]">1,000 players</span>
      </div>

      {/* Promotion line summary */}
      <div className="px-2.5 py-1.5 bg-[#F0B90B]/5 border-b border-[#F0B90B]/15">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#F0B90B] font-semibold">⚡ Line #{promotionLineRank}</span>
          <span className="text-[#F0B90B] font-mono text-[10px]">+{promotionPnlPct.toFixed(2)}%</span>
        </div>
        <div className={`text-[9px] mt-0.5 ${isAbovePromotion ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {isAbovePromotion
            ? `✓ Above promotion line (${300 - myRank} spots safe)`
            : `Need +${((promotionPnlPct - (myEntry?.pnlPct ?? 0))).toFixed(2)}% more`
          }
        </div>
      </div>

      {/* Entries */}
      <ScrollArea className="flex-1">
        <div className="px-1 py-0.5">
          {displayEntries.map((entry, idx) => {
            if ('type' in entry && entry.type === 'separator') {
              return (
                <div key={`sep-${idx}`} className="text-center text-[9px] text-[#848E9C]/40 py-0.5">···</div>
              );
            }

            const e = entry as LeaderboardEntry;
            const isMe = e.isYou;
            const isPromotionLine = e.rank === promotionLineRank;

            return (
              <div key={e.rank}>
                {isPromotionLine && (
                  <div className="relative my-0.5">
                    <div className="w-full border-t border-[#F0B90B]/60 animate-pulse-gold" />
                  </div>
                )}
                <div className={`flex items-center px-1.5 py-[2px] text-[10px] font-mono rounded ${
                  isMe
                    ? 'bg-[#F0B90B]/10 border border-[#F0B90B]/25'
                    : 'hover:bg-white/3'
                }`}>
                  <span className={`w-8 ${
                    e.rank <= 3 ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
                  }`}>
                    {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}
                  </span>
                  <span className={`flex-1 truncate text-[10px] ${isMe ? 'text-[#F0B90B] font-semibold' : 'text-[#D1D4DC]'}`}>
                    {e.username}
                  </span>
                  <span className={`w-14 text-right text-[10px] ${e.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {e.pnlPct >= 0 ? '+' : ''}{e.pnlPct.toFixed(1)}%
                  </span>
                  <span className="w-8 text-right text-[9px] text-[#848E9C]">{e.promotionScore}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
