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
import { Streamdown } from "streamdown";
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
  Bot,
  Swords,
  Zap,
  FileText,
} from "lucide-react";

/* ── Default coin logos ── */
const COIN_LOGOS: Record<string, string> = {
  SOL: "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/dRgYLfmNL5QAGwfaYvi5WU/sol-logo_8a0d6446.png",
};

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

function getBaseAsset(symbol: string): string {
  return symbol.replace(/USDT|USDC/, "");
}

function getCoverImage(comp: any): string | null {
  if (comp.coverImageUrl) return comp.coverImageUrl;
  return null;
}

function getDefaultCoinLogo(symbol: string): string {
  const base = getBaseAsset(symbol);
  return COIN_LOGOS[base] ?? COIN_LOGOS.SOL;
}

interface Props {
  slug: string;
}

export default function CompetitionDetailPage({ slug }: Props) {
  const { t, lang } = useT();
  const { token, username } = useAuth();

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
  const isAgentCompetition = comp.participantMode === "agent";
  const coverUrl = getCoverImage(comp);
  const coinLogo = getDefaultCoinLogo(comp.symbol);
  const baseAsset = getBaseAsset(comp.symbol);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Back link */}
      <div className="px-6 pt-6 pb-3">
        <Link href="/competitions" className="inline-flex items-center gap-1 text-[#848E9C] text-[11px] hover:text-[#D1D4DC] transition-colors">
          <ArrowLeft className="w-3 h-3" /> {t("compDetail.backToSchedule")}
        </Link>
      </div>

      {/* ═══ Hero Section ═══ */}
      <div className="relative overflow-hidden rounded-2xl mx-6 mb-6 border border-white/[0.06] bg-[#0E1422]">
        {/* Cover image background (blurred) */}
        {coverUrl && (
          <div className="absolute inset-0">
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover opacity-20 blur-xl scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E1422] via-[#0E1422]/80 to-[#0E1422]/60" />
          </div>
        )}

        <div className="relative flex items-stretch min-h-[220px]">
          {/* Left content */}
          <div className="flex-1 p-8 flex flex-col justify-between min-w-0">
            {/* Status + type badges */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
              >
                {comp.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/[0.06] text-white/60">
                {isAgentCompetition ? <Bot className="w-3 h-3" /> : <Swords className="w-3 h-3" />}
                {isAgentCompetition ? "Agent vs Agent" : "Human vs Human"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/[0.06] text-white/60">
                <Zap className="w-3 h-3 text-[#25C2A0]" />
                {baseAsset}/USDT
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white mb-3 leading-tight">
              {comp.title}
            </h1>

            {/* Key stats row */}
            <div className="flex items-center gap-6 flex-wrap text-[13px]">
              <div>
                <span className="text-white/35 text-[11px] block mb-0.5">
                  {lang === "zh" ? "比赛时间" : "Schedule"}
                </span>
                <span className="text-white/80 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  {formatDateTime(comp.startTime)}
                </span>
              </div>
              <div>
                <span className="text-white/35 text-[11px] block mb-0.5">
                  {lang === "zh" ? "时长" : "Duration"}
                </span>
                <span className="text-white/80 font-medium">
                  {formatDuration(comp.startTime, comp.endTime)}
                </span>
              </div>
              <div>
                <span className="text-white/35 text-[11px] block mb-0.5">
                  {lang === "zh" ? "参赛者" : "Participants"}
                </span>
                <span className="text-white/80 font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-white/40" />
                  {comp.acceptedCount}/{comp.maxParticipants}
                </span>
              </div>
              {comp.prizePool > 0 && (
                <div>
                  <span className="text-white/35 text-[11px] block mb-0.5">
                    {lang === "zh" ? "奖金池" : "Prize Pool"}
                  </span>
                  <span className="text-[#F0B90B] font-bold flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    {comp.prizePool.toLocaleString()} USDT
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Cover image or coin logo */}
          <div className="hidden sm:flex items-center justify-center w-[200px] lg:w-[260px] shrink-0 p-6">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={comp.title}
                className="max-h-[180px] max-w-full object-contain rounded-xl"
              />
            ) : (
              <img
                src={coinLogo}
                alt={baseAsset}
                className="max-h-[120px] max-w-full object-contain opacity-15 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              />
            )}
          </div>
        </div>

        {/* Registration action bar */}
        <div className="relative border-t border-white/[0.06] px-8 py-4">
          {comp.status === "registration_open" && (
            <>
              {isAgentCompetition ? (
                <Link
                  href="/agents"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F0B90B] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
                >
                  {lang === "zh" ? "通过 Agent API 报名" : "Register via Agent API"} <ChevronRight className="w-4 h-4" />
                </Link>
              ) : !token ? (
                <Link
                  href="/login?mode=register"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F0B90B] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
                >
                  {t("compDetail.loginToRegister")} <ChevronRight className="w-4 h-4" />
                </Link>
              ) : comp.myRegistrationStatus ? (
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
            </>
          )}

          {comp.status === "live" && isParticipant && (
            <Link
              href={`/arena/${comp.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ECB81] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
            >
              {t("hub.enterArena")} <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {comp.status === "live" && !isParticipant && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#848E9C] bg-white/5 rounded-lg">
                <Eye className="w-3.5 h-3.5" /> {t("compDetail.spectatorMode")}
              </span>
              {isAgentCompetition && (
                <Link
                  href={`/watch/${comp.slug}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F0B90B] px-4 py-2 text-[11px] font-bold text-[#0B0E11] hover:bg-[#F0B90B]/90 transition-colors"
                >
                  {lang === "zh" ? "围观比赛" : "Watch Match"} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          {(comp.status === "completed" || comp.status === "ended_early") && (
            <Link
              href={`/results/${comp.id}`}
              className="inline-flex items-center gap-1 px-5 py-2.5 text-sm font-bold text-[#D1D4DC] border border-white/[0.08] rounded-lg hover:bg-white/5 transition-colors"
            >
              {t("comp.viewResults")} <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ═══ Content sections ═══ */}
      <div className="px-6 space-y-5">
        {/* Description (Markdown) */}
        {comp.description && (
          <div className="bg-[#1C2030] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F0B90B]" />
              {lang === "zh" ? "比赛介绍" : "About This Competition"}
            </h2>
            <div className="prose prose-invert prose-sm max-w-none text-[#AAB3C2] prose-headings:text-[#D1D4DC] prose-strong:text-[#D1D4DC] prose-a:text-[#F0B90B]">
              <Streamdown>{comp.description}</Streamdown>
            </div>
          </div>
        )}

        {/* Detailed trading rules (Markdown) */}
        {comp.rulesDetail && (
          <div className="bg-[#1C2030] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#F0B90B]" />
              {lang === "zh" ? "详细交易规则" : "Detailed Trading Rules"}
            </h2>
            <div className="prose prose-invert prose-sm max-w-none text-[#AAB3C2] prose-headings:text-[#D1D4DC] prose-strong:text-[#D1D4DC] prose-a:text-[#F0B90B]">
              <Streamdown>{comp.rulesDetail}</Streamdown>
            </div>
          </div>
        )}

        {/* Quick rules grid (always shown) */}
        <div className="bg-[#1C2030] border border-white/[0.06] rounded-xl p-5">
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
              {isAgentCompetition && (
                <span className="text-[#F0B90B]">
                  {lang === "zh" ? "本场仅允许 Agent 使用 API Key 参赛" : "Agent API Key required"}
                </span>
              )}
              {comp.requireMinSeasonPoints > 0 && (
                <span className="text-[#F0B90B]">{t("compDetail.minSeasonPts", { n: comp.requireMinSeasonPoints })}</span>
              )}
              {comp.inviteOnly && (
                <span className="text-[#F6465D]">{t("compDetail.inviteOnly")}</span>
              )}
            </div>
          )}
        </div>

        {/* Prize breakdown (if prizeTableJson exists) */}
        {comp.prizePool > 0 && comp.prizeTableJson && (() => {
          try {
            const prizeTable = JSON.parse(comp.prizeTableJson);
            if (!Array.isArray(prizeTable) || prizeTable.length === 0) return null;
            return (
              <div className="bg-[#1C2030] border border-white/[0.06] rounded-xl p-5">
                <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#F0B90B]" />
                  {lang === "zh" ? "奖金分配" : "Prize Distribution"}
                </h2>
                <div className="space-y-1.5">
                  {prizeTable.map((row: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] text-[12px]">
                      <span className="text-[#D1D4DC] font-medium">
                        {row.label ?? `#${row.rank ?? i + 1}`}
                      </span>
                      <span className="font-mono font-bold text-[#F0B90B]">
                        {row.amount ?? row.prize ?? row.value} USDT
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })()}

        {/* Mini leaderboard (for live) */}
        {(comp.status === "live" || comp.status === "settling") && leaderboard.length > 0 && (
          <div className="bg-[#1C2030] border border-white/[0.06] rounded-xl p-5">
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
          <div className="bg-[#1C2030] border border-white/[0.06] rounded-xl p-5">
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
    </div>
  );
}
