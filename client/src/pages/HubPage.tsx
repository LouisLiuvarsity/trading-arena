import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useHubData, useRegister } from "@/hooks/useCompetitionData";
import { RANK_TIERS, getRankTier } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  Loader2,
  TrendingUp,
  ChevronRight,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  Trophy,
  Coins,
} from "lucide-react";

const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: "#F0B90B",
  accepted: "#0ECB81",
  rejected: "#F6465D",
  withdrawn: "#5E6673",
  waitlisted: "#848E9C",
};

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  live: { color: "#0ECB81", bg: "rgba(14,203,129,0.15)", label: "LIVE" },
  registration_open: { color: "#F0B90B", bg: "rgba(240,185,11,0.15)", label: "报名中" },
  announced: { color: "#F0B90B", bg: "rgba(240,185,11,0.15)", label: "已公布" },
  registration_closed: { color: "#848E9C", bg: "rgba(132,142,156,0.15)", label: "报名截止" },
  completed: { color: "#5E6673", bg: "rgba(94,102,115,0.15)", label: "已结束" },
  ended_early: { color: "#FF6B35", bg: "rgba(255,107,53,0.15)", label: "提前结束" },
  settling: { color: "#848E9C", bg: "rgba(132,142,156,0.15)", label: "结算中" },
  draft: { color: "#848E9C", bg: "rgba(132,142,156,0.15)", label: "草稿" },
};

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

const TYPE_GRADIENTS: Record<string, string> = {
  grand_final: "from-[#F0B90B]/30 via-[#FF6B35]/15 to-[#1C2030]",
  special: "from-[#8B5CF6]/30 via-[#6366F1]/15 to-[#1C2030]",
  regular: "from-[#0ECB81]/20 via-[#0ECB81]/8 to-[#1C2030]",
  practice: "from-[#848E9C]/20 via-[#848E9C]/8 to-[#1C2030]",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Competition card: image on top, text on bottom */
function CompetitionCard({
  comp,
  t,
  onRegister,
  registerPending,
}: {
  comp: any;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onRegister: (slug: string) => void;
  registerPending: boolean;
}) {
  const statusCfg = STATUS_STYLE[comp.status] ?? STATUS_STYLE.draft;
  const gradient = TYPE_GRADIENTS[comp.competitionType] ?? TYPE_GRADIENTS.regular;

  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden hover:border-[rgba(255,255,255,0.15)] transition-colors">
      {/* Cover image area */}
      <div className="relative h-40 overflow-hidden">
        {comp.coverImageUrl ? (
          <img
            src={comp.coverImageUrl}
            alt={comp.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-b ${gradient}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-white/10" />
            </div>
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full backdrop-blur-sm"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
          >
            {comp.status === "live" && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
            {statusCfg.label}
          </span>
        </div>
        {/* Prize badge */}
        {comp.prizePool > 0 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-[#F0B90B] text-[11px] font-bold rounded-full">
              <Coins className="w-3 h-3" />
              {comp.prizePool}U
            </span>
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="p-4 space-y-3">
        <h3 className="text-[#D1D4DC] text-sm font-display font-bold truncate">{comp.title}</h3>

        {/* Description (if available) */}
        {comp.description && (
          <p className="text-[#848E9C] text-[11px] line-clamp-2">{comp.description}</p>
        )}

        {/* Info row */}
        <div className="flex items-center gap-3 text-[11px] text-[#848E9C] flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(comp.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {comp.registeredCount}/{comp.maxParticipants}
          </span>
          {comp.symbol && (
            <span className="font-mono text-[#D1D4DC]">{comp.symbol}</span>
          )}
        </div>

        {/* Registration status / Action */}
        <div className="pt-1">
          {comp.myRegistrationStatus ? (
            <span
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{
                backgroundColor: `${STATUS_BADGE_COLORS[comp.myRegistrationStatus] ?? "#848E9C"}20`,
                color: STATUS_BADGE_COLORS[comp.myRegistrationStatus] ?? "#848E9C",
              }}
            >
              {t("common.status." + comp.myRegistrationStatus)}
            </span>
          ) : comp.status === "registration_open" ? (
            <button
              onClick={() => onRegister(comp.slug)}
              disabled={registerPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F0B90B] text-[#0B0E11] text-[11px] font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
            >
              {registerPending && <Loader2 className="w-3 h-3 animate-spin" />}
              {t("hub.signUp")} <ChevronRight className="w-3 h-3" />
            </button>
          ) : comp.status === "live" ? (
            <Link
              href={`/arena/${comp.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0ECB81] text-[#0B0E11] text-[11px] font-bold rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
            >
              {t("hub.enterArena")} <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <Link
              href={`/competitions/${comp.slug}`}
              className="inline-flex items-center gap-1 text-[11px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
            >
              {t("comp.details")} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl font-display font-bold text-white">
          {t('hub.welcome', { name: username })}
        </h1>
        <p className="text-[#848E9C] text-[11px] mt-1">{t('hub.subtitle')}</p>
      </div>

      {/* Active Competition — always on top if live */}
      {activeCompetition && (
        <div className="bg-[#1C2030] border border-[#0ECB81]/30 rounded-xl p-6">
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
      )}

      {/* Competition Carousel — swipeable cards with image on top */}
      {upcomingCompetitions.length > 0 ? (
        <div>
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F0B90B]" />
            {t('hub.pushedComp')}
            <span className="text-[10px] text-[#848E9C] font-normal ml-auto">
              {upcomingCompetitions.length} {t('hub.upcoming')}
            </span>
          </h2>
          <Carousel
            opts={{ align: "start", loop: upcomingCompetitions.length > 2, dragFree: true }}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {upcomingCompetitions.map((comp) => (
                <CarouselItem key={comp.id} className="pl-3 basis-[85%] sm:basis-[48%] lg:basis-[33%]">
                  <CompetitionCard
                    comp={comp}
                    t={t}
                    onRegister={(slug) => registerMutation.mutate(slug)}
                    registerPending={registerMutation.isPending}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {upcomingCompetitions.length > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <CarouselPrevious className="static translate-y-0 bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#848E9C] hover:text-white hover:bg-white/10" />
                <CarouselNext className="static translate-y-0 bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#848E9C] hover:text-white hover:bg-white/10" />
              </div>
            )}
          </Carousel>
        </div>
      ) : !activeCompetition ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <Calendar className="w-8 h-8 text-[#848E9C] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm font-bold">{t('hub.noPushed')}</p>
          <p className="text-[#848E9C] text-[11px] mt-1">{t('hub.noPushedHint')}</p>
        </div>
      ) : null}

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
          <p className="mt-3 text-[10px] text-[#848E9C]/70 border-t border-white/[0.04] pt-3">
            {t('hub.prizeEligibility')}
          </p>
        </div>
      )}
    </div>
  );
}
