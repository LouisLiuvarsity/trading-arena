import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useHubData, useRegister } from "@/hooks/useCompetitionData";
import { RANK_TIERS, getRankTier } from "@/lib/types";
import type { HubData } from "@shared/competitionTypes";
import {
  Loader2,
  TrendingUp,
  ChevronRight,
  Clock,
  AlertCircle,
  Calendar,
  Users,
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
  const { username } = useAuth();
  const { t } = useT();
  const { data: hub, isLoading: loading, error: queryError } = useHubData();
  const registerMutation = useRegister();
  const error = queryError ? (queryError as Error).message : null;

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

  const { activeCompetition, upcomingCompetitions, season } = hub;
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

      {/* Competition Card — Active or Pushed */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        {activeCompetition ? (
          /* Live competition — show enter button */
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
                  {(() => {
                    const s = activeCompetition.remainingSeconds;
                    if (s <= 0) return t('common.ended');
                    const h = Math.floor(s / 3600);
                    const m = Math.floor((s % 3600) / 60);
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                  })()}
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
        ) : nextComp ? (
          /* Pushed competition — sign up + waitlist */
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-[#D1D4DC] text-sm font-display font-bold">{t('hub.pushedComp')}</span>
            </div>
            <p className="text-white text-lg font-bold mb-1">{nextComp.title}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#848E9C] mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(nextComp.startTime)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {t('hub.waitlistCount', { n: nextComp.registeredCount })}
              </span>
              {nextComp.prizePool > 0 && (
                <span className="text-[#F0B90B]">{nextComp.prizePool}U</span>
              )}
            </div>

            {nextComp.myRegistrationStatus ? (
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{
                    backgroundColor: `${STATUS_BADGE_COLORS[nextComp.myRegistrationStatus] ?? "#848E9C"}20`,
                    color: STATUS_BADGE_COLORS[nextComp.myRegistrationStatus] ?? "#848E9C",
                  }}
                >
                  {t('common.status.' + nextComp.myRegistrationStatus)}
                </span>
                {nextComp.myRegistrationStatus === "waitlisted" && (
                  <span className="text-[10px] text-[#848E9C]">{t('hub.waitlistJoined')}</span>
                )}
              </div>
            ) : nextComp.status === "registration_open" ? (
              <button
                onClick={() => registerMutation.mutate(nextComp.slug)}
                disabled={registerMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F0B90B] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
              >
                {registerMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                {t('hub.signUp')} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[11px] text-[#848E9C]">
                {t('hub.upcoming')} · {formatTime(nextComp.startTime)}
              </span>
            )}
          </div>
        ) : (
          /* No competitions */
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-[#848E9C] mx-auto mb-3" />
            <p className="text-[#D1D4DC] text-sm font-bold">{t('hub.noPushed')}</p>
            <p className="text-[#848E9C] text-[11px] mt-1">{t('hub.noPushedHint')}</p>
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
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="text-[#848E9C]">
              {t('hub.matchProgress', { done: season.matchesCompleted, total: season.matchesTotal })}
            </span>
            <span className={`font-bold ${season.grandFinalQualified ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
              {season.grandFinalQualified ? t('hub.gfQualified') : t('hub.gfNotQualified', { pts: season.grandFinalLine })}
            </span>
          </div>
          {/* Prize eligibility reminder */}
          <p className="mt-3 text-[10px] text-[#848E9C]/70 border-t border-white/[0.04] pt-3">
            {t('hub.prizeEligibility')}
          </p>
        </div>
      )}
    </div>
  );
}
