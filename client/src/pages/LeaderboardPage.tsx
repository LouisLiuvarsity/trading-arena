import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCompetitions, getCompetitionLeaderboard } from "@/lib/competition-api";
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
  const { token, username } = useAuth();
  const [tab, setTab] = useState<TabKey>("current");
  const [liveComp, setLiveComp] = useState<CompetitionSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find live competition and load its leaderboard
  useEffect(() => {
    if (tab !== "current") return;
    setLoading(true);
    setError(null);

    getCompetitions(token)
      .then((res) => {
        const live = res.items.find((c) => c.status === "live" || c.status === "settling");
        if (!live) {
          setLiveComp(null);
          setLeaderboard([]);
          setLoading(false);
          return;
        }
        setLiveComp(live);
        return getCompetitionLeaderboard(live.slug, token).then((lb) => {
          setLeaderboard(lb);
        });
      })
      .catch((err) => setError(err.message ?? "加载失败"))
      .finally(() => setLoading(false));
  }, [token, tab]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-display font-bold text-white mb-1">排行榜</h1>
      <p className="text-[#848E9C] text-[11px] mb-5">全平台选手排名</p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-white/[0.03] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("current")}
          className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
            tab === "current" ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#848E9C] hover:text-[#D1D4DC]"
          }`}
        >
          当前比赛
        </button>
        <button
          onClick={() => setTab("season")}
          className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
            tab === "season" ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#848E9C] hover:text-[#D1D4DC]"
          }`}
        >
          赛季总分
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
              <p className="text-[#D1D4DC] text-sm">暂无进行中的比赛</p>
              <p className="text-[#848E9C] text-[11px] mt-1">比赛开始后排行榜将自动更新</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Competition info */}
              <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#0ECB81]/15 text-[#0ECB81] text-[10px] font-bold rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-sm font-display font-bold text-[#D1D4DC]">{liveComp.title}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#848E9C]">
                  <span>{liveComp.acceptedCount}人参赛</span>
                  <span className="text-[#F0B90B] font-mono">{liveComp.prizePool}U</span>
                </div>
              </div>

              {/* Leaderboard table */}
              <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[3rem_1fr_4rem_5rem_4rem_4rem] gap-2 px-4 py-2.5 text-[10px] text-[#848E9C] font-bold border-b border-[rgba(255,255,255,0.08)]">
                  <span>#</span>
                  <span>选手</span>
                  <span className="text-right">PnL%</span>
                  <span className="text-right">wPnL</span>
                  <span className="text-right">积分</span>
                  <span className="text-right">奖金</span>
                </div>

                {/* Rows */}
                {leaderboard.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#848E9C] text-[11px]">暂无排行数据</div>
                ) : (
                  <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {leaderboard.map((entry) => {
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
                              {isYou && <span className="text-[9px] ml-0.5">(你)</span>}
                            </span>
                            {!entry.prizeEligible && (
                              <span className="text-[8px] text-[#F6465D]/60 shrink-0">不达标</span>
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
          <p className="text-[#D1D4DC] text-sm font-bold">赛季总分排行</p>
          <p className="text-[#848E9C] text-[11px] mt-1">赛季排行榜正在开发中，敬请期待</p>
        </div>
      )}
    </div>
  );
}
