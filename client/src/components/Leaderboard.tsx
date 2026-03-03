import { useMemo, useState } from "react";
import { Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LeaderboardEntry } from "@/lib/types";

interface Props {
  entries: LeaderboardEntry[];
  myRank: number;
  promotionLineRank: number;
}

export default function Leaderboard({ entries, myRank, promotionLineRank }: Props) {
  const [viewMode, setViewMode] = useState<"top" | "around">("around");

  const currentMyRank = useMemo(() => {
    const me = entries.find(entry => entry.isYou);
    return me?.rank ?? myRank;
  }, [entries, myRank]);

  const displayEntries = useMemo(() => {
    if (viewMode === "top") {
      return entries.slice(0, 30);
    }
    const myIndex = entries.findIndex(entry => entry.isYou);
    if (myIndex < 0) {
      return entries.slice(0, 30);
    }
    const start = Math.max(0, myIndex - 10);
    const end = Math.min(entries.length, myIndex + 11);
    return entries.slice(start, end);
  }, [entries, viewMode]);

  const promotionEntry = entries.find(entry => entry.rank === promotionLineRank);
  const promotionPnlPct = promotionEntry?.pnlPct ?? 0;
  const myEntry = entries.find(entry => entry.isYou);
  const gapToPromotion = myEntry ? (promotionPnlPct - myEntry.pnlPct).toFixed(2) : "?";

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>排行榜</span>
          <span className="text-[9px] text-[#848E9C] bg-white/5 px-1.5 py-0.5 rounded">LIVE</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("top")}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === "top" ? "bg-white/10 text-white" : "text-[#848E9C]"}`}
          >
            Top
          </button>
          <button
            onClick={() => setViewMode("around")}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === "around" ? "bg-white/10 text-white" : "text-[#848E9C]"}`}
          >
            Around Me
          </button>
        </div>
      </div>

      <div className="px-3 py-2 bg-[#F0B90B]/5 border-b border-[#F0B90B]/20">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#F0B90B] font-semibold">⚡ 奖金线 #{promotionLineRank}</span>
          <span className="text-[#F0B90B] font-mono">+{promotionPnlPct.toFixed(2)}%</span>
        </div>
        {currentMyRank > promotionLineRank ? (
          <div className="text-[10px] text-[#F6465D] mt-0.5">还需 +{gapToPromotion}% 才能进入奖金区</div>
        ) : (
          <div className="text-[10px] text-[#0ECB81] mt-0.5">✓ 你在奖金线以上</div>
        )}
      </div>

      <div className="flex items-center px-3 py-1 text-[10px] text-[#848E9C] border-b border-[rgba(255,255,255,0.04)]">
        <span className="w-10">#</span>
        <span className="flex-1">选手</span>
        <span className="w-16 text-right">收益%</span>
        <span className="w-14 text-right">奖金</span>
        <span className="w-10 text-right">积分</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-1">
          {displayEntries.map(entry => {
            const isPromotionLine = entry.rank === promotionLineRank;
            const isMe = Boolean(entry.isYou);
            return (
              <div key={`${entry.rank}-${entry.username}`}>
                {isPromotionLine && (
                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#F0B90B] animate-pulse-gold" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#0B0E11] px-2 text-[9px] text-[#F0B90B] font-semibold">═ 奖金线 ═</span>
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-center px-2 py-[3px] text-[11px] font-mono rounded ${
                    isMe
                      ? "bg-[#F0B90B]/10 border border-[#F0B90B]/30"
                      : entry.isBot
                        ? "bg-[#8B5CF6]/5 border border-[#8B5CF6]/10"
                        : "hover:bg-white/3"
                  }`}
                >
                  <span className={`w-10 ${entry.rank <= 3 ? "text-[#F0B90B] font-bold" : "text-[#848E9C]"}`}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                  </span>

                  <span
                    className={`flex-1 truncate flex items-center gap-1 ${
                      isMe ? "text-[#F0B90B] font-semibold" : entry.isBot ? "text-[#A78BFA]" : "text-[#D1D4DC]"
                    }`}
                  >
                    {entry.isBot && (
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 shrink-0">
                        <Bot className="w-2.5 h-2.5 text-[#A78BFA]" />
                      </span>
                    )}
                    {entry.username}
                    {!entry.prizeEligible && <span className="text-[7px] text-[#F6465D]/60 ml-0.5">未达5笔</span>}
                  </span>

                  <span className={`w-16 text-right ${entry.pnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {entry.pnlPct >= 0 ? "+" : ""}
                    {entry.pnlPct.toFixed(2)}%
                  </span>
                  <span className={`w-14 text-right ${entry.prizeAmount > 0 ? "text-[#F0B90B] font-semibold" : "text-[#5E6673]"}`}>
                    {entry.prizeAmount > 0 ? `${entry.prizeAmount}U` : "—"}
                  </span>
                  <span className={`w-10 text-right ${entry.matchPoints > 0 ? "text-[#F0B90B]" : "text-[#5E6673]"}`}>
                    {entry.matchPoints > 0 ? `+${entry.matchPoints}` : "0"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
