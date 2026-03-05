import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, BarChart3, Users, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useResultsLeaderboard, useResultsHistory } from "@/hooks/useCompetitionData";
import { RANK_TIERS } from "@/lib/types";
import type { MatchResultDetail, MatchResultSummary } from "@shared/competitionTypes";

interface Props {
  competitionId: string;
}

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

function getTierInfo(tierKey: string) {
  return RANK_TIERS.find((t) => t.tier === tierKey) ?? RANK_TIERS[0];
}

function formatPnl(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function pnlColor(pct: number): string {
  return pct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]";
}

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

      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        <div className="flex items-end justify-center gap-4 h-40">
          <Skeleton className="w-28 h-24 rounded-t-xl" />
          <Skeleton className="w-28 h-32 rounded-t-xl" />
          <Skeleton className="w-28 h-20 rounded-t-xl" />
        </div>
      </div>

      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>

      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 mb-2" />
        ))}
      </div>
    </div>
  );
}

function Podium({ top3 }: { top3: LeaderboardRow[] }) {
  if (top3.length === 0) return null;

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
  const heights = ["h-32", "h-24", "h-20"];
  const delays = [0.3, 0.15, 0.45];

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

function MyResultCard({
  myEntry,
  myHistory,
  participantCount,
  t,
}: {
  myEntry: LeaderboardRow | undefined;
  myHistory: MatchResultSummary | MatchResultDetail | null;
  participantCount: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
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

  const tierProgress = useMemo(() => {
    const seasonPts = 0;
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
        <h3 className="text-sm font-display font-bold text-[#F0B90B]">{t('results.yourResult')}</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-[#0B0E11] rounded-lg p-3 text-center">
          <p className="text-[10px] text-[#848E9C] uppercase mb-1">{t('results.ranking')}</p>
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

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">{t('results.trades')}</p>
          <p className="text-sm font-mono font-bold text-[#D1D4DC]">{trades}</p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">{t('results.winRate')}</p>
          <p className="text-sm font-mono font-bold text-[#D1D4DC]">
            {winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">{t('results.points')}</p>
          <p className="text-sm font-mono font-bold text-[#F0B90B]">+{points}</p>
        </div>
        <div className="bg-[#0B0E11] rounded-lg p-2.5 text-center">
          <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">{t('results.prize')}</p>
          <p className={`text-sm font-mono font-bold ${prize > 0 ? "text-[#F0B90B]" : "text-[#848E9C]"}`}>
            {prize > 0 ? `${prize}U` : "--"}
          </p>
        </div>
      </div>

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

function LeaderboardTable({ entries, t }: { entries: LeaderboardRow[]; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.4 }}
      className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(255,255,255,0.08)]">
        <BarChart3 className="w-4 h-4 text-[#D1D4DC]" />
        <h3 className="text-sm font-display font-bold text-[#D1D4DC]">{t('results.fullLeaderboard')}</h3>
        <span className="text-[10px] text-[#848E9C] ml-auto">
          {t('results.nPlayers', { n: entries.length })}
        </span>
      </div>

      <div className="flex items-center px-5 py-2 text-[10px] text-[#848E9C] uppercase border-b border-[rgba(255,255,255,0.04)]">
        <span className="w-10">#</span>
        <span className="flex-1">{t('results.player')}</span>
        <span className="w-20 text-right">PnL%</span>
        <span className="w-16 text-right hidden sm:block">wPnL</span>
        <span className="w-14 text-right">{t('results.points')}</span>
        <span className="w-14 text-right">{t('results.prize')}</span>
      </div>

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
                  <span className="text-[8px] text-[#F6465D]/60 ml-1">{t('results.notEligible')}</span>
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

export default function ResultsPage({ competitionId }: Props) {
  const { username } = useAuth();
  const { t } = useT();

  const { data: lbData, isLoading: lbLoading, error: lbError } = useResultsLeaderboard(competitionId);
  const { data: myHistory, isLoading: histLoading } = useResultsHistory(competitionId);

  const loading = lbLoading || histLoading;

  const leaderboard = (lbData as LeaderboardResponse)?.leaderboard ?? [];
  const top3 = leaderboard.slice(0, 3);
  const myEntry = leaderboard.find((e: LeaderboardRow) => e.isYou || e.username === username);
  const title = (lbData as LeaderboardResponse)?.title ?? t('results.matchN', { n: competitionId });
  const status = (lbData as LeaderboardResponse)?.status ?? "completed";
  const participantCount = (lbData as LeaderboardResponse)?.participantCount ?? leaderboard.length;

  const statusBadge = useMemo(() => {
    const map: Record<string, { label: string; color: string }> = {
      completed: { label: t('results.settled'), color: "bg-[#0ECB81]/20 text-[#0ECB81]" },
      settling: { label: t('results.settling'), color: "bg-[#F0B90B]/20 text-[#F0B90B]" },
      live: { label: t('results.live'), color: "bg-[#0ECB81]/20 text-[#0ECB81]" },
      cancelled: { label: t('results.cancelled'), color: "bg-[#F6465D]/20 text-[#F6465D]" },
    };
    return map[status] ?? map.completed;
  }, [status, t]);

  if (loading) return <SkeletonState />;

  const error = lbError ? (lbError as any)?.status === 404 ? t('results.notFound') : t('results.loadFailed') : null;

  if (error && !lbData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="text-[#848E9C] hover:text-[#D1D4DC] text-xs underline"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
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
          {t('results.nPlayers', { n: participantCount })}
        </span>
      </motion.div>

      {top3.length > 0 && <Podium top3={top3} />}

      {(myEntry || myHistory) && (
        <MyResultCard
          myEntry={myEntry}
          myHistory={myHistory ?? null}
          participantCount={participantCount}
          t={t}
        />
      )}

      {leaderboard.length > 0 && <LeaderboardTable entries={leaderboard} t={t} />}

      {leaderboard.length === 0 && !myHistory && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <Loader2 className="w-6 h-6 text-[#848E9C] mx-auto mb-3 animate-spin" />
          <p className="text-[#848E9C] text-sm">{t('results.noLeaderboard')}</p>
          <p className="text-[#5E6673] text-[11px] mt-1">{t('results.noLeaderboardHint')}</p>
        </div>
      )}
    </div>
  );
}
