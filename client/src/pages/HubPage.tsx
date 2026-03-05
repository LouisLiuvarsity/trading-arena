import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useHubData } from "@/hooks/useCompetitionData";
import { RANK_TIERS, getRankTier } from "@/lib/types";
import type { HubData } from "@shared/competitionTypes";
import {
  Loader2,
  Trophy,
  Calendar,
  TrendingUp,
  ChevronRight,
  Clock,
  AlertCircle,
  Star,
  Target,
} from "lucide-react";

const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: "#F0B90B",
  accepted: "#0ECB81",
  rejected: "#F6465D",
  withdrawn: "#5E6673",
  waitlisted: "#848E9C",
};

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HubPage() {
  const { token, username } = useAuth();
  const { t } = useT();
  const { data: hub, isLoading: loading, error: queryError } = useHubData();
  const error = queryError ? (queryError as Error).message : null;

  function formatCountdown(seconds: number): string {
    if (seconds <= 0) return t('common.ended');
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error || !hub) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error ?? t('common.loadFailed')}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#F0B90B] text-[#0B0E11] text-xs font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const { activeCompetition, myRegistrations, upcomingCompetitions, season, recentResults, quickStats } = hub;

  const nextComp = upcomingCompetitions.length > 0 ? upcomingCompetitions[0] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl font-display font-bold text-white">
          {t('hub.welcome', { name: username })}
        </h1>
        <p className="text-[#848E9C] text-[11px] mt-1">{t('hub.subtitle')}</p>
      </div>

      {/* Hero Card */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        {activeCompetition ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0ECB81]/15 text-[#0ECB81] text-[11px] font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
                LIVE
              </span>
              <span className="text-[#D1D4DC] text-sm font-display font-bold">
                {activeCompetition.title}
              </span>
            </div>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-[10px] text-[#848E9C]">{t('hub.rank')}</p>
                <p className="text-2xl font-mono font-bold text-white">
                  #{activeCompetition.myRank}
                  <span className="text-[11px] text-[#848E9C] ml-1">/ {activeCompetition.participantCount}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#848E9C]">{t('hub.returnRate')}</p>
                <p className={`text-2xl font-mono font-bold ${activeCompetition.myPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                  {activeCompetition.myPnlPct >= 0 ? "+" : ""}
                  {activeCompetition.myPnlPct.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#848E9C]">{t('hub.remaining')}</p>
                <p className="text-lg font-mono text-white">
                  {formatCountdown(activeCompetition.remainingSeconds)}
                </p>
              </div>
            </div>
            <Link
              href={`/arena/${activeCompetition.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ECB81] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
            >
              {t('hub.enterArena')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : nextComp && nextComp.status === "registration_open" ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-[#D1D4DC] text-sm font-display font-bold">{t('hub.nextComp')}</span>
            </div>
            <p className="text-white text-lg font-bold mb-1">{nextComp.title}</p>
            <p className="text-[#848E9C] text-[11px] mb-4">
              {formatTime(nextComp.startTime)} 开始 · {nextComp.registeredCount}/{nextComp.maxParticipants}人已报名 · {nextComp.prizePool}U奖池
            </p>
            {nextComp.myRegistrationStatus ? (
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                style={{
                  backgroundColor: `${STATUS_BADGE_COLORS[nextComp.myRegistrationStatus] ?? "#848E9C"}20`,
                  color: STATUS_BADGE_COLORS[nextComp.myRegistrationStatus] ?? "#848E9C",
                }}
              >
                {t('common.status.' + nextComp.myRegistrationStatus)}
              </span>
            ) : (
              <Link
                href={`/competitions/${nextComp.slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F0B90B] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
              >
                {t('hub.registerNow')} <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : nextComp ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-[#D1D4DC] text-sm font-display font-bold">{t('hub.upcoming')}</span>
            </div>
            <p className="text-white text-lg font-bold mb-1">{nextComp.title}</p>
            <p className="text-[#848E9C] text-[11px] mb-2">
              {formatTime(nextComp.startTime)} 开始 · {nextComp.prizePool}U奖池
            </p>
            {nextComp.myRegistrationStatus && (
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                style={{
                  backgroundColor: `${STATUS_BADGE_COLORS[nextComp.myRegistrationStatus] ?? "#848E9C"}20`,
                  color: STATUS_BADGE_COLORS[nextComp.myRegistrationStatus] ?? "#848E9C",
                }}
              >
                {t('hub.myStatus')}{t('common.status.' + nextComp.myRegistrationStatus)}
              </span>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-[#848E9C] mx-auto mb-3" />
            <p className="text-[#D1D4DC] text-sm font-bold">{t('hub.noSchedule')}</p>
            <p className="text-[#848E9C] text-[11px] mt-1">{t('hub.noScheduleHint')}</p>
            <Link
              href="/competitions"
              className="inline-flex items-center gap-1 mt-3 text-[#F0B90B] text-xs font-bold hover:underline"
            >
              {t('hub.browseSchedule')} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Season Progress */}
      {season && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#F0B90B]" />
            {t('hub.seasonProgress')}
            <span className="text-[10px] text-[#848E9C] font-normal ml-auto">{season.name}</span>
          </h2>
          <div className="mb-3">
            {(() => {
              const currentTier = getRankTier(season.mySeasonPoints);
              const tierColor = TIER_COLORS[season.myRankTier] ?? "#5E6673";
              const nextTierInfo = RANK_TIERS.find((t) => t.minPoints > season.mySeasonPoints);
              const progressMax = nextTierInfo ? nextTierInfo.minPoints : currentTier.maxPoints;
              const progressMin = currentTier.minPoints;
              const progressPct = progressMax === Infinity
                ? 100
                : Math.min(100, ((season.mySeasonPoints - progressMin) / (progressMax - progressMin)) * 100);

              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-lg font-bold" style={{ color: tierColor }}>
                      {season.mySeasonPoints}pts
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: tierColor }}>
                      {currentTier.icon} {currentTier.label}
                    </span>
                    {nextTierInfo && (
                      <span className="text-[10px] text-[#848E9C] ml-auto">
                        {nextTierInfo.label}({nextTierInfo.minPoints}pts)
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progressPct}%`, backgroundColor: tierColor }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#848E9C]">
              {t('hub.matchProgress', { done: season.matchesCompleted, total: season.matchesTotal })}
            </span>
            <span className={`font-bold ${season.grandFinalQualified ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
              {season.grandFinalQualified ? t('hub.gfQualified') : t('hub.gfNotQualified', { pts: season.grandFinalLine })}
            </span>
          </div>
        </div>
      )}

      {/* My Registrations */}
      {myRegistrations.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#F0B90B]" />
            {t('hub.myRegistrations')}
          </h2>
          <div className="space-y-2">
            {myRegistrations.map((reg) => {
              const badgeColor = STATUS_BADGE_COLORS[reg.status] ?? "#848E9C";
              return (
                <div
                  key={reg.competitionId}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div>
                    <span className="text-[#D1D4DC] text-xs font-bold">{reg.competitionTitle}</span>
                    <span className="text-[#848E9C] text-[10px] ml-2">{formatTime(reg.startTime)}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${badgeColor}20`,
                      color: badgeColor,
                    }}
                  >
                    {t('common.status.' + reg.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Results + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Results */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F0B90B]" />
            {t('hub.recentResults')}
          </h2>
          {recentResults.length === 0 ? (
            <p className="text-[#848E9C] text-[11px]">{t('hub.noRecords')}</p>
          ) : (
            <div className="space-y-2">
              {recentResults.slice(0, 5).map((r) => (
                <div
                  key={`${r.competitionId}-${r.competitionNumber}`}
                  className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#848E9C] text-[10px] font-mono w-6">#{r.finalRank}</span>
                    <span className="text-[#D1D4DC] text-[11px]">{t('hub.matchN', { n: r.competitionNumber })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-mono font-bold ${r.totalPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}
                    >
                      {r.totalPnlPct >= 0 ? "+" : ""}{r.totalPnlPct.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-[#F0B90B] font-mono">+{r.pointsEarned}pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-[#F0B90B] text-[11px] font-bold mt-3 hover:underline"
          >
            {t('common.viewAll')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#F0B90B]" />
            {t('hub.quickStats')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[#848E9C]">{t('hub.totalComps')}</p>
              <p className="text-lg font-mono font-bold text-white">{quickStats.totalCompetitions}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#848E9C]">{t('hub.winRate')}</p>
              <p className="text-lg font-mono font-bold text-[#0ECB81]">
                {(quickStats.winRate * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#848E9C]">{t('hub.totalPrize')}</p>
              <p className="text-lg font-mono font-bold text-[#F0B90B]">
                {quickStats.totalPrizeWon.toFixed(0)}U
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#848E9C]">{t('hub.bestRank')}</p>
              <p className="text-lg font-mono font-bold text-white">
                {quickStats.bestRank > 0 ? `#${quickStats.bestRank}` : "--"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-[#848E9C]">{t('hub.avgPnl')}</p>
              <p className={`text-lg font-mono font-bold ${quickStats.avgPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                {quickStats.avgPnlPct >= 0 ? "+" : ""}{quickStats.avgPnlPct.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
