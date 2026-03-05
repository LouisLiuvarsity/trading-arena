import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useCompetitions, useCompetitionLeaderboard } from "@/hooks/useCompetitionData";
import type { CompetitionSummary } from "@shared/competitionTypes";
import type { LeaderboardEntry } from "@/lib/types";
import { RANK_TIERS } from "@/lib/types";
import {
  Loader2,
  AlertCircle,
  Trophy,
  Medal,
  Crown,
  Star,
} from "lucide-react";

type TabKey = "current" | "season";

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-4 h-4 text-[#F0B90B]" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-[#C0C0C0]" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-[#CD7F32]" />;
  return null;
}

export default function LeaderboardPage() {
  const { username } = useAuth();
  const { t } = useT();
  const [tab, setTab] = useState<TabKey>("current");

  const { data: compsData, isLoading: compsLoading, error: compsError } = useCompetitions();

  const liveComp = (compsData as any)?.items?.find(
    (c: CompetitionSummary) => c.status === "live" || c.status === "settling"
  ) ?? null;

  const { data: leaderboard = [], isLoading: lbLoading } = useCompetitionLeaderboard(
    liveComp?.slug ?? "",
    tab === "current" && !!liveComp
  );

  const loading = tab === "current" && (compsLoading || lbLoading);
  const error = compsError ? (compsError as Error).message ?? t('common.loadFailed') : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-display font-bold text-white mb-1">{t('lbpage.title')}</h1>
      <p className="text-[#848E9C] text-[11px] mb-5">{t('lbpage.subtitle')}</p>

      <div className="flex items-center gap-1 mb-5 bg-white/[0.03] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("current")}
          className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
            tab === "current" ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#848E9C] hover:text-[#D1D4DC]"
          }`}
        >
          {t('lbpage.currentTab')}
        </button>
        <button
          onClick={() => setTab("season")}
          className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
            tab === "season" ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#848E9C] hover:text-[#D1D4DC]"
          }`}
        >
          {t('lbpage.seasonTab')}
        </button>
      </div>

      {tab === "current" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
              <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
              <p className="text-[#D1D4DC] text-sm">{error}</p>
            </div>
          ) : !liveComp ? (
            <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
              <Trophy className="w-8 h-8 text-[#848E9C] mx-auto mb-3" />
              <p className="text-[#D1D4DC] text-sm">{t('lbpage.noLive')}</p>
              <p className="text-[#848E9C] text-[11px] mt-1">{t('lbpage.noLiveHint')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#0ECB81]/15 text-[#0ECB81] text-[10px] font-bold rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-sm font-display font-bold text-[#D1D4DC]">{liveComp.title}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#848E9C]">
                  <span>{t('lbpage.inComp', { n: liveComp.acceptedCount })}</span>
                  <span className="text-[#F0B90B] font-mono">{liveComp.prizePool}U</span>
                </div>
              </div>

              <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[3rem_1fr_4rem_5rem_4rem_4rem] gap-2 px-4 py-2.5 text-[10px] text-[#848E9C] font-bold border-b border-[rgba(255,255,255,0.08)]">
                  <span>#</span>
                  <span>{t('lbpage.player')}</span>
                  <span className="text-right">PnL%</span>
                  <span className="text-right">wPnL</span>
                  <span className="text-right">{t('lbpage.points')}</span>
                  <span className="text-right">{t('lbpage.prize')}</span>
                </div>

                {(leaderboard as LeaderboardEntry[]).length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#848E9C] text-[11px]">{t('lbpage.noData')}</div>
                ) : (
                  <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {(leaderboard as LeaderboardEntry[]).map((entry) => {
                      const isYou = entry.username === username || entry.isYou;
                      const tierColor = TIER_COLORS[entry.rankTier] ?? "#5E6673";
                      const tierInfo = RANK_TIERS.find((t) => t.tier === entry.rankTier);

                      return (
                        <div
                          key={entry.rank}
                          className={`grid grid-cols-[3rem_1fr_4rem_5rem_4rem_4rem] gap-2 px-4 py-2.5 text-[11px] items-center ${
                            isYou ? "bg-[#F0B90B]/8 border-l-2 border-[#F0B90B]" : ""
                          }`}
                        >
                          <span className="font-mono font-bold text-[#848E9C] flex items-center gap-1">
                            {getRankIcon(entry.rank) ?? `#${entry.rank}`}
                          </span>
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px]" style={{ color: tierColor }}>{tierInfo?.icon ?? ""}</span>
                            <span className={`truncate ${isYou ? "text-[#F0B90B] font-bold" : "text-[#D1D4DC]"}`}>
                              {entry.username}
                              {isYou && <span className="text-[9px] ml-0.5">{t('lbpage.you')}</span>}
                            </span>
                            {!entry.prizeEligible && (
                              <span className="text-[8px] text-[#F6465D]/60 shrink-0">{t('lbpage.notEligible')}</span>
                            )}
                          </span>
                          <span className={`font-mono font-bold text-right ${entry.pnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                            {entry.pnlPct >= 0 ? "+" : ""}{entry.pnlPct.toFixed(2)}%
                          </span>
                          <span className={`font-mono text-right ${entry.weightedPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                            {entry.weightedPnl >= 0 ? "+" : ""}{entry.weightedPnl.toFixed(1)}
                          </span>
                          <span className="font-mono text-[#F0B90B] text-right">{entry.matchPoints}</span>
                          <span className="font-mono text-[#D1D4DC] text-right">
                            {entry.prizeAmount > 0 ? `${entry.prizeAmount}U` : "--"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "season" && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <Star className="w-8 h-8 text-[#848E9C] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm font-bold">{t('lbpage.seasonTitle')}</p>
          <p className="text-[#848E9C] text-[11px] mt-1">{t('lbpage.seasonComingSoon')}</p>
        </div>
      )}
    </div>
  );
}
