import { useMemo, useState } from "react";
import { Bot } from "lucide-react";
import type { LeaderboardEntry, AccountState, SocialData } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Props {
  entries: LeaderboardEntry[];
  myRank: number;
  promotionLineRank: number;
  account?: AccountState;
  social?: SocialData;
}

export default function Leaderboard({ entries, myRank, promotionLineRank, account, social }: Props) {
  const { t } = useT();
  const [viewMode, setViewMode] = useState<"top" | "around">("around");

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

  const danger = account && social
    ? account.rank > 300 || social.tradersOvertakenYou > social.youOvertook
    : false;

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{t('lb.title')}</span>
          <span className="text-[9px] text-[#848E9C] bg-white/5 px-1.5 py-0.5 rounded">LIVE</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("top")}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === "top" ? "bg-white/10 text-white" : "text-[#848E9C]"}`}
          >
            {t('lb.top')}
          </button>
          <button
            onClick={() => setViewMode("around")}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === "around" ? "bg-white/10 text-white" : "text-[#848E9C]"}`}
          >
            {t('lb.aroundMe')}
          </button>
        </div>
      </div>

      {/* Rank summary card (migrated from RankAnxietyStrip) */}
      {account && social && (
        <div className={`px-3 py-2 border-b ${
          danger
            ? "bg-[#F6465D]/[0.06] border-[#F6465D]/20"
            : "bg-[#0ECB81]/[0.04] border-[rgba(255,255,255,0.06)]"
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold font-mono ${danger ? "text-[#F6465D]" : "text-[#F0B90B]"}`}>
                {t('rank.label')} #{account.rank}
              </span>
              {account.rank <= 300 ? (
                <span className="text-[10px] text-[#0ECB81] font-medium">{t('rank.safe', { n: 300 - account.rank })}</span>
              ) : (
                <span className="text-[10px] text-[#F6465D] font-medium">{t('rank.behind', { n: account.rank - 300 })}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${danger ? "bg-[#F6465D]" : "bg-[#0ECB81]"} animate-pulse`} />
              <span className="text-[8px] text-[#848E9C]">{t('common.live')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-[#848E9C]">
            <span>
              {t('rank.overtaken')} <span className={social.tradersOvertakenYou > 0 ? "text-[#F6465D] font-semibold" : ""}>{social.tradersOvertakenYou}</span>
            </span>
            <span className="text-[#5E6673]">·</span>
            <span>
              {t('rank.overtook')} <span className={social.youOvertook > 0 ? "text-[#0ECB81] font-semibold" : ""}>{social.youOvertook}</span>
            </span>
            <span className="text-[#5E6673]">·</span>
            <span className="text-[#F0B90B]">{t('rank.nearLine', { n: social.nearPromotionCount })}</span>
          </div>
        </div>
      )}

      {/* Ad space */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#F0B90B]/5 via-[#F0B90B]/10 to-[#F0B90B]/5 border-b border-[#F0B90B]/20">
        <div className="flex items-center justify-center gap-2 text-[12px]">
          <span className="text-[#F0B90B]/60">📢</span>
          <span className="text-[#F0B90B]/80 font-medium tracking-wide">{t('lb.adSpace')}</span>
          <span className="text-[#F0B90B]/60">📢</span>
        </div>
        <div className="text-[9px] text-[#848E9C]/60 text-center mt-0.5">{t('lb.adSub')}</div>
      </div>

      <div className="flex items-center px-3 py-1.5 text-[10px] text-[#848E9C] border-b border-[rgba(255,255,255,0.04)]">
        <span className="w-12">#</span>
        <span className="flex-1">{t('lb.player')}</span>
        <span className="w-20 text-right">{t('lb.return')}</span>
        <span className="w-16 text-right">{t('lb.prizeCol')}</span>
        <span className="w-12 text-right">{t('lb.pointsCol')}</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
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
                      <span className="bg-[#0B0E11] px-2 text-[9px] text-[#F0B90B] font-semibold">{t('lb.promotionLine')}</span>
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-center px-3 py-1.5 text-[11px] font-mono rounded mb-0.5 ${
                    isMe
                      ? "bg-[#F0B90B]/10 border border-[#F0B90B]/30"
                      : entry.isBot
                        ? "bg-[#8B5CF6]/5 border border-[#8B5CF6]/10"
                        : "hover:bg-white/3"
                  }`}
                >
                  <span className={`w-12 ${entry.rank <= 3 ? "text-[#F0B90B] font-bold" : "text-[#848E9C]"}`}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                  </span>

                  <span
                    className={`flex-1 truncate flex items-center gap-1.5 ${
                      isMe ? "text-[#F0B90B] font-semibold" : entry.isBot ? "text-[#A78BFA]" : "text-[#D1D4DC]"
                    }`}
                  >
                    {entry.isBot && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 shrink-0">
                        <Bot className="w-3 h-3 text-[#A78BFA]" />
                      </span>
                    )}
                    {entry.username}
                    {!entry.prizeEligible && <span className="text-[7px] text-[#F6465D]/60 ml-0.5">{t('lb.notEligible')}</span>}
                  </span>

                  <span className={`w-20 text-right ${entry.pnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {entry.pnlPct >= 0 ? "+" : ""}
                    {entry.pnlPct.toFixed(2)}%
                  </span>
                  <span className={`w-16 text-right ${entry.prizeAmount > 0 ? "text-[#F0B90B] font-semibold" : "text-[#5E6673]"}`}>
                    {entry.prizeAmount > 0 ? `${entry.prizeAmount}U` : "—"}
                  </span>
                  <span className={`w-12 text-right ${entry.matchPoints > 0 ? "text-[#F0B90B]" : "text-[#5E6673]"}`}>
                    {entry.matchPoints > 0 ? `+${entry.matchPoints}` : "0"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
