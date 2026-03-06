import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import {
  useCompetitionDetail,
  useCompetitionLeaderboard,
  useRegister,
  useWithdraw,
} from "@/hooks/useCompetitionData";
import type { LeaderboardEntry } from "@/lib/types";
import { RANK_TIERS } from "@/lib/types";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  Users,
  Clock,
  Trophy,
  Shield,
  DollarSign,
  BarChart3,
  Eye,
  ArrowLeft,
} from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#848E9C",
  announced: "#F0B90B",
  registration_open: "#F0B90B",
  registration_closed: "#848E9C",
  live: "#0ECB81",
  settling: "#F0B90B",
  completed: "#848E9C",
  ended_early: "#FF6B35",
  cancelled: "#F6465D",
};

const REG_COLORS: Record<string, string> = {
  pending: "#F0B90B",
  accepted: "#0ECB81",
  rejected: "#F6465D",
  withdrawn: "#5E6673",
  waitlisted: "#848E9C",
};

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  slug: string;
}

export default function CompetitionDetailPage({ slug }: Props) {
  const { t } = useT();
  const { token, username } = useAuth();

  // ── React Query: detail + leaderboard ──
  const {
    data: comp,
    isLoading: loading,
    error: queryError,
  } = useCompetitionDetail(slug);
  const error = queryError ? (queryError as Error).message : null;

  const { data: leaderboard = [] } = useCompetitionLeaderboard(
    slug,
    comp?.status === "live" || comp?.status === "settling",
  );

  // ── Mutations ──
  const registerMutation = useRegister();
  const withdrawMutation = useWithdraw();

  const handleRegister = async () => {
    if (!token) return;
    try {
      await registerMutation.mutateAsync(slug);
      toast.success(t("compDetail.registerSuccess"));
    } catch (err: any) {
      toast.error(err.message ?? t("compDetail.registerFailed"));
    }
  };

  const handleWithdraw = async () => {
    if (!token) return;
    try {
      await withdrawMutation.mutateAsync(slug);
      toast.success(t("comp.withdrawSuccess"));
    } catch (err: any) {
      toast.error(err.message ?? t("comp.withdrawFailed"));
    }
  };

  // ── Helper: format duration with i18n ──
  function formatDuration(startTs: number, endTs: number): string {
    const diffMs = endTs - startTs;
    const h = Math.floor(diffMs / (1000 * 60 * 60));
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (h > 0 && m > 0) return t("compDetail.hoursMinutes", { h, m });
    if (h > 0) return t("compDetail.hours", { h });
    return t("compDetail.minutes", { m });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error || !comp) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error ?? t("common.loadFailed")}</p>
          <Link href="/competitions" className="inline-flex items-center gap-1 mt-4 text-[#F0B90B] text-xs font-bold hover:underline">
            <ArrowLeft className="w-3 h-3" /> {t("compDetail.backToSchedule")}
          </Link>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[comp.status] ?? STATUS_COLORS.draft;
  const statusLabel = t("common.compStatus." + comp.status);
  const isParticipant = comp.myRegistrationStatus === "accepted";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back link */}
      <Link href="/competitions" className="inline-flex items-center gap-1 text-[#848E9C] text-[11px] hover:text-[#D1D4DC] transition-colors">
        <ArrowLeft className="w-3 h-3" /> {t("compDetail.backToSchedule")}
      </Link>

      {/* Header */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h1 className="text-xl font-display font-bold text-white">{comp.title}</h1>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold"
            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
          >
            {comp.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />}
            {statusLabel}
          </span>
        </div>

        {comp.description && (
          <p className="text-[#848E9C] text-xs mb-4">{comp.description}</p>
        )}

        {/* Key info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Clock className="w-3 h-3" />{t("compDetail.startTime")}</p>
            <p className="text-sm font-mono text-[#D1D4DC]">{formatDateTime(comp.startTime)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Clock className="w-3 h-3" />{t("compDetail.duration")}</p>
            <p className="text-sm font-mono text-[#D1D4DC]">{formatDuration(comp.startTime, comp.endTime)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Users className="w-3 h-3" />{t("compDetail.participants")}</p>
            <p className="text-sm font-mono text-[#D1D4DC]">{comp.acceptedCount}/{comp.maxParticipants}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Trophy className="w-3 h-3" />{t("compDetail.prizePool")}</p>
            <p className="text-sm font-mono text-[#F0B90B]">{comp.prizePool} USDT</p>
          </div>
        </div>

        {/* Registration action */}
        {comp.status === "registration_open" && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            {comp.myRegistrationStatus ? (
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{
                    backgroundColor: `${REG_COLORS[comp.myRegistrationStatus] ?? "#848E9C"}20`,
                    color: REG_COLORS[comp.myRegistrationStatus] ?? "#848E9C",
                  }}
                >
                  {t("compDetail.myReg")}{t("common.status." + comp.myRegistrationStatus)}
                </span>
                {comp.myRegistrationStatus !== "withdrawn" && comp.myRegistrationStatus !== "rejected" && (
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawMutation.isPending}
                    className="px-3 py-1.5 text-[11px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
                  >
                    {withdrawMutation.isPending ? t("comp.withdrawing") : t("comp.withdraw")}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="px-6 py-2.5 bg-[#F0B90B] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t("compDetail.registering")}</span>
                ) : (
                  t("compDetail.registerNow")
                )}
              </button>
            )}
          </div>
        )}

        {/* Live: Enter arena button */}
        {comp.status === "live" && isParticipant && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            <Link
              href={`/arena/${comp.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ECB81] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
            >
              {t("hub.enterArena")} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Live: Spectator mode */}
        {comp.status === "live" && !isParticipant && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#848E9C] bg-white/5 rounded-lg">
              <Eye className="w-3.5 h-3.5" /> {t("compDetail.spectatorMode")}
            </span>
          </div>
        )}

        {/* Completed: link to results */}
        {(comp.status === "completed" || comp.status === "ended_early") && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            <Link
              href={`/results/${comp.id}`}
              className="inline-flex items-center gap-1 px-5 py-2.5 text-sm font-bold text-[#D1D4DC] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors"
            >
              {t("comp.viewResults")} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Rules card (for registration_open) */}
      {(comp.status === "registration_open" || comp.status === "announced" || comp.status === "draft") && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F0B90B]" />
            {t("compDetail.rules")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" />{t("compDetail.startingCapital")}</p>
              <p className="font-mono font-bold text-[#D1D4DC]">{comp.startingCapital.toLocaleString()} USDT</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3" />{t("compDetail.maxTrades")}</p>
              <p className="font-mono font-bold text-[#D1D4DC]">{t("compDetail.nTrades", { n: comp.maxTradesPerMatch })}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />{t("compDetail.closeOnlyPeriod")}</p>
              <p className="font-mono font-bold text-[#D1D4DC]">{t("compDetail.lastMinutes", { n: comp.closeOnlySeconds / 60 })}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1">{t("compDetail.feeRate")}</p>
              <p className="font-mono font-bold text-[#D1D4DC]">{(comp.feeRate * 100).toFixed(2)}%</p>
            </div>
          </div>
          {(comp.requireMinSeasonPoints > 0 || comp.inviteOnly) && (
            <div className="mt-3 flex items-center gap-3 text-[11px]">
              {comp.requireMinSeasonPoints > 0 && (
                <span className="text-[#F0B90B]">{t("compDetail.minSeasonPts", { n: comp.requireMinSeasonPoints })}</span>
              )}
              {comp.inviteOnly && (
                <span className="text-[#F6465D]">{t("compDetail.inviteOnly")}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mini leaderboard (for live) */}
      {(comp.status === "live" || comp.status === "settling") && leaderboard.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F0B90B]" />
            {t("compDetail.liveRanking")}
          </h2>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((entry: LeaderboardEntry) => {
              const isYou = entry.username === username || entry.isYou;
              return (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] ${
                    isYou ? "bg-[#F0B90B]/10 border border-[#F0B90B]/20" : "bg-white/[0.02]"
                  }`}
                >
                  <span className="font-mono font-bold text-[#848E9C] w-6">#{entry.rank}</span>
                  <span className={`font-bold flex-1 ${isYou ? "text-[#F0B90B]" : "text-[#D1D4DC]"}`}>
                    {entry.username}
                    {isYou && <span className="text-[9px] ml-1">{t("compDetail.you")}</span>}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: TIER_COLORS[entry.rankTier] ?? "#5E6673" }}
                  >
                    {RANK_TIERS.find((rt) => rt.tier === entry.rankTier)?.icon ?? ""}
                  </span>
                  <span className={`font-mono font-bold w-16 text-right ${entry.pnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {entry.pnlPct >= 0 ? "+" : ""}{entry.pnlPct.toFixed(2)}%
                  </span>
                  <span className="font-mono text-[#F0B90B] w-12 text-right">{entry.matchPoints}pts</span>
                </div>
              );
            })}
          </div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 text-[#F0B90B] text-[11px] font-bold mt-3 hover:underline"
          >
            {t("compDetail.fullRanking")} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Participants list */}
      {comp.participants && comp.participants.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F0B90B]" />
            {t("compDetail.playerList", { n: comp.participants.length })}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {comp.participants.map((p: any) => (
              <Link
                key={p.username}
                href={`/user/${p.username}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <span
                  className="text-[10px]"
                  style={{ color: TIER_COLORS[p.rankTier] ?? "#5E6673" }}
                >
                  {RANK_TIERS.find((rt) => rt.tier === p.rankTier)?.icon ?? ""}
                </span>
                <span className={`text-[11px] truncate ${p.username === username ? "text-[#F0B90B] font-bold" : "text-[#D1D4DC]"}`}>
                  {p.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
