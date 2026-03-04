import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, BarChart3, Users, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, ApiError } from "@/lib/api";
import { RANK_TIERS } from "@/lib/types";
import type { MatchResultDetail, MatchResultSummary } from "@shared/competitionTypes";

interface Props {
  competitionId: string;
}

// ─── Types for leaderboard response ─────────────────────────────────
interface LeaderboardRow {
  rank: number;
  username: string;
  pnlPct: number;
  weightedPnl: number;
  matchPoints: number;
  prizeAmount: number;
  prizeEligible: boolean;
  tradesCount?: number;
  winRate?: number;
  rankTier?: string;
  isYou?: boolean;
}

interface LeaderboardResponse {
  competitionId: number;
  title: string;
  status: string;
  participantCount: number;
  prizePool: number;
  leaderboard: LeaderboardRow[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function getTierInfo(tierKey: string) {
  return RANK_TIERS.find((t) => t.tier === tierKey) ?? RANK_TIERS[0];
}

function formatPnl(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function pnlColor(pct: number): string {
  return pct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]";
}

// ─── Skeleton ───────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded ${className}`} />;
}

function SkeletonState() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Podium skeleton */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        <div className="flex items-end justify-center gap-4 h-40">
          <Skeleton className="w-28 h-24 rounded-t-xl" />
          <Skeleton className="w-28 h-32 rounded-t-xl" />
          <Skeleton className="w-28 h-20 rounded-t-xl" />
        </div>
      </div>

      {/* My result skeleton */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 mb-2" />
        ))}
      </div>
    </div>
  );
}

// ─── Podium Component ───────────────────────────────────────────────

function Podium({ top3 }: { top3: LeaderboardRow[] }) {
  if (top3.length === 0) return null;

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
  const heights = ["h-32", "h-24", "h-20"];
  const delays = [0.3, 0.15, 0.45];

  // Display order: 2nd, 1st, 3rd
  const order = [second, first, third].filter(Boolean);
  const orderIndices = second ? (third ? [1, 0, 2] : [1, 0]) : [0];

  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {order.map((entry, idx) => {
          if (!entry) return null;
          const rankIdx = orderIndices[idx];
          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays[rankIdx], duration: 0.5, type: "spring" }}
              className="flex flex-col items-center"
            >
              <span className="text-2xl sm:text-3xl mb-1">{medals[rankIdx]}</span>
              <span
                className={`text-[11px] sm:text-xs font-semibold truncate max-w-[80px] sm:max-w-[120px] ${
                  entry.isYou ? "text-[#F0B90B]" : "text-[#D1D4DC]"
                }`}
              >
                {entry.username}
              </span>
              <span className={`text-xs sm:text-sm font-mono font-bold mt-0.5 ${pnlColor(entry.pnlPct)}`}>
                {formatPnl(entry.pnlPct)}
              </span>
              {entry.prizeAmount > 0 && (
                <span className="text-[10px] font-mono text-[#F0B90B] mt-0.5">
                  {entry.prizeAmount}U
                </span>
              )}
              <div
                className={`w-20 sm:w-28 ${heights[rankIdx]} mt-2 rounded-t-xl ${
                  rankIdx === 0
                    ? "bg-gradient-to-t from-[#F0B90B]/20 to-[#F0B90B]/5 border-t-2 border-[#F0B90B]/60"
                    : rankIdx === 1
                      ? "bg-gradient-to-t from-[#C0C0C0]/15 to-[#C0C0C0]/5 border-t-2 border-[#C0C0C0]/40"
                      : "bg-gradient-to-t from-[#CD7F32]/15 to-[#CD7F32]/5 border-t-2 border-[#CD7F32]/40"
                }`}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── My Result Card ─────────────────────────────────────────────────

function MyResultCard({
  myEntry,
  myHistory,
  participantCount,
}: {
  myEntry: LeaderboardRow | undefined;
  myHistory: MatchResultSummary | MatchResultDetail | null;
  participantCount: number;
}) {
  // Prefer data from history API (more detailed), fallback to leaderboard entry
  const rank = myHistory?.finalRank ?? myEntry?.rank ?? 0;
  const pnlPct = myHistory?.totalPnlPct ?? myEntry?.pnlPct ?? 0;
  const wPnl = myHistory?.totalWeightedPnl ?? myEntry?.weightedPnl ?? 0;
  const trades = myHistory?.tradesCount ?? myEntry?.tradesCount ?? 0;
  const winCount = myHistory?.winCount ?? 0;
  const lossCount = myHistory?.lossCount ?? 0;
  const winRate = trades > 0 ? ((winCount / (winCount + lossCount)) * 100) : (myEntry?.winRate ?? 0);
  const points = myHistory?.pointsEarned ?? myEntry?.matchPoints ?? 0;
  const prize = myHistory?.prizeWon ?? myEntry?.prizeAmount ?? 0;
  const count = myHistory?.participantCount ?? participantCount;
  const tierKey = (myHistory as MatchResultDetail)?.rankTierAtTime ?? myEntry?.rankTier ?? "iron";
  const tier = getTierInfo(tierKey);

  // Tier progress bar: compute percent within tier
  const tierProgress = useMemo(() => {
    const seasonPts = 0; // We don't have season points here, just show the tier
    const range = tier.maxPoints === Infinity ? 500 : tier.maxPoints - tier.minPoints;
    const current = Math.max(0, seasonPts - tier.minPoints);
    return Math.min(100, (current / range) * 100);
  }, [tier]);

  if (rank === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="bg-[#1C2030] border border-[#F0B90B]/20 rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-[#F0B90B]" />
        <h3 className="text-sm font-display font-bold text-[#F0B90B]">你的成绩</h3>
      </div>

      {/* First row: Rank, PnL, wPnL */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-[#0B0E11] rounded-lg p-3 text-center">
          <p className="text-[10px] text-[#848E9C] uppercase mb-1">排名</p>
          <p className="text-lg font-mono font-bold text-white">
            #{rank}
            <span className="text-[#848E9C] text-xs">/{count}</span>
          </p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-3 text-center">
          <p className="text-[10px] text-[#848E9C] uppercase mb-1">PnL</p>
          <p className={`text-lg font-mono font-bold ${pnlColor(pnlPct)}`}>
            {formatPnl(pnlPct)}
          </p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-3 text-center">
          <p className="text-[10px] text-[#848E9C] uppercase mb-1">wPnL</p>
          <p className={`text-lg font-mono font-bold ${pnlColor(wPnl)}`}>
            {wPnl >= 0 ? "+" : ""}
            {wPnl.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Second row: Trades, WR, Points, Prize */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">交易</p>
          <p className="text-sm font-mono font-bold text-[#D1D4DC]">{trades}</p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">胜率</p>
          <p className="text-sm font-mono font-bold text-[#D1D4DC]">
            {winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">积分</p>
          <p className="text-sm font-mono font-bold text-[#F0B90B]">+{points}</p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">奖金</p>
          <p className={`text-sm font-mono font-bold ${prize > 0 ? "text-[#F0B90B]" : "text-[#848E9C]"}`}>
            {prize > 0 ? `${prize}U` : "--"}
          </p>
        </div>
      </div>

      {/* Tier progress */}
      <div className="flex items-center gap-2">
        <span className="text-sm">{tier.icon}</span>
        <span className="text-[11px] font-semibold" style={{ color: tier.color }}>
          {tier.label}
        </span>
        <div className="flex-1 h-1.5 bg-[#0B0E11] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${tierProgress}%`,
              backgroundColor: tier.color,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Full Leaderboard Table ─────────────────────────────────────────

function LeaderboardTable({ entries }: { entries: LeaderboardRow[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.4 }}
      className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(255,255,255,0.08)]">
        <BarChart3 className="w-4 h-4 text-[#D1D4DC]" />
        <h3 className="text-sm font-display font-bold text-[#D1D4DC]">完整排行榜</h3>
        <span className="text-[10px] text-[#848E9C] ml-auto">
          {entries.length} 名选手
        </span>
      </div>

      {/* Table header */}
      <div className="flex items-center px-5 py-2 text-[10px] text-[#848E9C] uppercase border-b border-[rgba(255,255,255,0.04)]">
        <span className="w-10">#</span>
        <span className="flex-1">选手</span>
        <span className="w-20 text-right">PnL%</span>
        <span className="w-16 text-right hidden sm:block">wPnL</span>
        <span className="w-14 text-right">积分</span>
        <span className="w-14 text-right">奖金</span>
      </div>

      {/* Table body */}
      <div className="max-h-[400px] overflow-y-auto">
        {entries.map((entry) => {
          const isMe = Boolean(entry.isYou);
          const isTop3 = entry.rank <= 3;
          const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

          return (
            <div
              key={`${entry.rank}-${entry.username}`}
              className={`flex items-center px-5 py-2 text-[11px] font-mono border-b border-[rgba(255,255,255,0.03)] transition-colors ${
                isMe
                  ? "bg-[#F0B90B]/8 border-l-2 border-l-[#F0B90B]"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              <span className={`w-10 ${isTop3 ? "text-base" : "text-[#848E9C]"}`}>
                {isTop3 ? medals[entry.rank - 1] : entry.rank}
              </span>
              <span
                className={`flex-1 truncate ${
                  isMe ? "text-[#F0B90B] font-semibold" : "text-[#D1D4DC]"
                }`}
              >
                {entry.username}
                {!entry.prizeEligible && (
                  <span className="text-[8px] text-[#F6465D]/60 ml-1">未达标</span>
                )}
              </span>
              <span className={`w-20 text-right ${pnlColor(entry.pnlPct)}`}>
                {formatPnl(entry.pnlPct)}
              </span>
              <span className={`w-16 text-right hidden sm:block ${pnlColor(entry.weightedPnl)}`}>
                {entry.weightedPnl >= 0 ? "+" : ""}
                {entry.weightedPnl.toFixed(0)}
              </span>
              <span className={`w-14 text-right ${entry.matchPoints > 0 ? "text-[#F0B90B]" : "text-[#5E6673]"}`}>
                {entry.matchPoints > 0 ? `+${entry.matchPoints}` : "0"}
              </span>
              <span className={`w-14 text-right ${entry.prizeAmount > 0 ? "text-[#F0B90B] font-semibold" : "text-[#5E6673]"}`}>
                {entry.prizeAmount > 0 ? `${entry.prizeAmount}U` : "--"}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main ResultsPage ───────────────────────────────────────────────

export default function ResultsPage({ competitionId }: Props) {
  const { token, username } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lbData, setLbData] = useState<LeaderboardResponse | null>(null);
  const [myHistory, setMyHistory] = useState<MatchResultSummary | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch leaderboard and history in parallel
        const [lbResult, historyResult] = await Promise.allSettled([
          apiRequest<LeaderboardResponse>(
            `/api/competitions/${competitionId}/leaderboard`,
            { token }
          ),
          apiRequest<{ results: MatchResultSummary[] }>(
            `/api/me/history`,
            { token }
          ),
        ]);

        if (cancelled) return;

        if (lbResult.status === "fulfilled") {
          setLbData(lbResult.value);
        } else {
          // If leaderboard fails, we might still have history
          const apiErr = lbResult.reason;
          if (apiErr instanceof ApiError && apiErr.status === 404) {
            // Competition not found -- show error
            setError("未找到该比赛");
          }
        }

        if (historyResult.status === "fulfilled") {
          const myMatch = historyResult.value.results?.find(
            (r) => String(r.competitionId) === String(competitionId)
          );
          if (myMatch) setMyHistory(myMatch);
        }

        // If both failed, set error
        if (lbResult.status === "rejected" && historyResult.status === "rejected") {
          setError("无法加载比赛数据");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [competitionId, token]);

  // Derive data from responses
  const leaderboard = lbData?.leaderboard ?? [];
  const top3 = leaderboard.slice(0, 3);
  const myEntry = leaderboard.find((e) => e.isYou || e.username === username);
  const title = lbData?.title ?? `比赛 #${competitionId}`;
  const status = lbData?.status ?? "completed";
  const participantCount = lbData?.participantCount ?? leaderboard.length;

  // Status badge
  const statusBadge = useMemo(() => {
    const map: Record<string, { label: string; color: string }> = {
      completed: { label: "已结算", color: "bg-[#0ECB81]/20 text-[#0ECB81]" },
      settling: { label: "结算中", color: "bg-[#F0B90B]/20 text-[#F0B90B]" },
      live: { label: "进行中", color: "bg-[#0ECB81]/20 text-[#0ECB81]" },
      cancelled: { label: "已取消", color: "bg-[#F6465D]/20 text-[#F6465D]" },
    };
    return map[status] ?? map.completed;
  }, [status]);

  if (loading) return <SkeletonState />;

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="text-[#848E9C] hover:text-[#D1D4DC] text-xs underline"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <button
          onClick={() => window.history.back()}
          className="text-[#848E9C] hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold text-white">{title}</h1>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge.color}`}>
          {statusBadge.label}
        </span>
        <span className="text-[11px] text-[#848E9C] ml-auto flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {participantCount} 名选手
        </span>
      </motion.div>

      {/* Podium */}
      {top3.length > 0 && <Podium top3={top3} />}

      {/* My Result */}
      {(myEntry || myHistory) && (
        <MyResultCard
          myEntry={myEntry}
          myHistory={myHistory}
          participantCount={participantCount}
        />
      )}

      {/* Full Leaderboard */}
      {leaderboard.length > 0 && <LeaderboardTable entries={leaderboard} />}

      {/* Empty state */}
      {leaderboard.length === 0 && !myHistory && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <Loader2 className="w-6 h-6 text-[#848E9C] mx-auto mb-3 animate-spin" />
          <p className="text-[#848E9C] text-sm">排行榜数据暂未生成</p>
          <p className="text-[#5E6673] text-[11px] mt-1">比赛结算完成后将显示完整排名</p>
        </div>
      )}
    </div>
  );
}
