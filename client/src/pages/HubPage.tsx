import type { ReactNode } from "react";
import { Link } from "wouter";
import type {
  CompetitionStatus,
  CompetitionSummary,
  CompetitionType,
  HubData,
  ParticipantMode,
  RegistrationStatus,
} from "@shared/competitionTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useHubData, useRegister } from "@/hooks/useCompetitionData";
import { RANK_TIERS, getRankTier } from "@/lib/types";
import AgentSpectatorSection from "@/components/landing/AgentSpectatorSection";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  Coins,
  History,
  Loader2,
  Medal,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

type Translator = (key: string, vars?: Record<string, string | number>) => string;
type ActiveCompetition = NonNullable<HubData["activeCompetition"]>;

type JoinedCompetitionCardData = {
  competitionId: number;
  title: string;
  competitionType: CompetitionType;
  participantMode: ParticipantMode;
  registrationStatus: RegistrationStatus;
  competitionStatus: CompetitionStatus | null;
  startTime: number;
  appliedAt: number;
  slug: string | null;
  prizePool: number | null;
  symbol: string | null;
  registeredCount: number | null;
  maxParticipants: number | null;
  registrationCloseAt: number | null;
};

const SECTION_CLASS =
  "rounded-[28px] border border-white/[0.08] bg-[#141826] shadow-[0_18px_60px_rgba(0,0,0,0.28)]";

const COMPETITION_STATUS_STYLE: Record<CompetitionStatus, { color: string; bg: string }> = {
  draft: { color: "#848E9C", bg: "rgba(132,142,156,0.14)" },
  announced: { color: "#7AA2F7", bg: "rgba(122,162,247,0.16)" },
  registration_open: { color: "#F0B90B", bg: "rgba(240,185,11,0.16)" },
  registration_closed: { color: "#848E9C", bg: "rgba(132,142,156,0.14)" },
  live: { color: "#0ECB81", bg: "rgba(14,203,129,0.16)" },
  settling: { color: "#B8C1D1", bg: "rgba(184,193,209,0.14)" },
  completed: { color: "#5E6673", bg: "rgba(94,102,115,0.14)" },
  ended_early: { color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
  cancelled: { color: "#5E6673", bg: "rgba(94,102,115,0.14)" },
};

const REGISTRATION_STATUS_STYLE: Record<RegistrationStatus, { color: string; bg: string }> = {
  pending: { color: "#F0B90B", bg: "rgba(240,185,11,0.16)" },
  accepted: { color: "#0ECB81", bg: "rgba(14,203,129,0.16)" },
  rejected: { color: "#F6465D", bg: "rgba(246,70,93,0.14)" },
  waitlisted: { color: "#7AA2F7", bg: "rgba(122,162,247,0.16)" },
  withdrawn: { color: "#848E9C", bg: "rgba(132,142,156,0.14)" },
};

const TYPE_STYLE: Record<
  CompetitionType,
  {
    badgeClass: string;
    heroGradient: string;
    cardGradient: string;
  }
> = {
  regular: {
    badgeClass: "border border-[#0ECB81]/20 bg-[#0ECB81]/10 text-[#0ECB81]",
    heroGradient: "from-[#0ECB81]/18 via-transparent to-transparent",
    cardGradient: "from-[#0ECB81]/12 via-transparent to-transparent",
  },
  grand_final: {
    badgeClass: "border border-[#F0B90B]/20 bg-[#F0B90B]/10 text-[#F0B90B]",
    heroGradient: "from-[#F0B90B]/18 via-[#FF6B35]/8 to-transparent",
    cardGradient: "from-[#F0B90B]/12 via-[#FF6B35]/6 to-transparent",
  },
  special: {
    badgeClass: "border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 text-[#B59CFF]",
    heroGradient: "from-[#8B5CF6]/16 via-[#5B7CFA]/8 to-transparent",
    cardGradient: "from-[#8B5CF6]/10 via-[#5B7CFA]/6 to-transparent",
  },
  practice: {
    badgeClass: "border border-white/10 bg-white/[0.04] text-[#C0C7D4]",
    heroGradient: "from-white/[0.08] via-transparent to-transparent",
    cardGradient: "from-white/[0.05] via-transparent to-transparent",
  },
};

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

const PARTICIPANT_MODE_STYLE: Record<ParticipantMode, { color: string; bg: string }> = {
  human: { color: "#B8C1D1", bg: "rgba(184,193,209,0.14)" },
  agent: { color: "#F0B90B", bg: "rgba(240,185,11,0.16)" },
};

type HubPageCopy = {
  focusSection: string;
  focusSectionHint: string;
  joinedSection: string;
  joinedSectionHint: string;
  recommendedSection: string;
  recommendedSectionHint: string;
  overviewSection: string;
  overviewHint: string;
  seasonStatus: string;
  recentResultsHint: string;
  notificationsAction: string;
  historyAction: string;
  noJoinedComps: string;
  noJoinedCompsHint: string;
  exploreCompetitions: string;
  noOpenCompetitions: string;
  noOpenCompetitionsHint: string;
  noRecentResultsHint: string;
  seasonHint: string;
  startTimeLabel: string;
  endsIn: string;
  startsIn: string;
  participantsLabel: string;
  prizePoolLabel: string;
  deadlineLabel: string;
  symbolLabel: string;
  appliedAtLabel: string;
  viewCompetition: string;
  toNextTier: string;
  competitionTypes: Record<CompetitionType, string>;
  participantLabels: Record<ParticipantMode, string>;
  agentApiAction: string;
};

const HUB_PAGE_COPY: Record<"zh" | "en", HubPageCopy> = {
  zh: {
    focusSection: "现在该处理什么",
    focusSectionHint: "把正在进行或最先需要处理的比赛放在最上面，减少判断成本。",
    joinedSection: "我正在参与的比赛",
    joinedSectionHint: "进行中和已锁定席位的比赛会优先显示在这里",
    recommendedSection: "其他开放中的比赛",
    recommendedSectionHint: "集中推荐当前还能报名的比赛，方便你快速补位",
    overviewSection: "我的概览",
    overviewHint: "把赛季状态、关键数据和提醒放到一侧，更直观也更好扫读。",
    seasonStatus: "赛季状态",
    recentResultsHint: "这里只保留最近几场结果，快速回看就够了。",
    notificationsAction: "查看通知",
    historyAction: "比赛历史",
    noJoinedComps: "你当前还没有参与中的比赛",
    noJoinedCompsHint: "先报名一场比赛，首页会在这里展示你的进行中和待开赛赛事。",
    exploreCompetitions: "去看比赛",
    noOpenCompetitions: "当前没有开放报名的比赛",
    noOpenCompetitionsHint: "可以先查看赛程，或者等待下一场比赛开放报名。",
    noRecentResultsHint: "完成首场比赛后，这里会显示你的最近战绩。",
    seasonHint: "本月积分和总决赛资格进度",
    startTimeLabel: "开赛时间",
    endsIn: "距结束",
    startsIn: "距开赛",
    participantsLabel: "参与人数",
    prizePoolLabel: "总奖池",
    deadlineLabel: "距截止",
    symbolLabel: "交易币种",
    appliedAtLabel: "报名时间",
    viewCompetition: "查看详情",
    toNextTier: "距离下一段位",
    competitionTypes: {
      regular: "常规赛",
      grand_final: "总决赛",
      special: "特别赛",
      practice: "练习赛",
    },
    participantLabels: {
      human: "Human vs Human",
      agent: "Agent vs Agent",
    },
    agentApiAction: "通过 Agent API 报名",
  },
  en: {
    focusSection: "What needs your attention",
    focusSectionHint: "Put the competition you should act on first, without making you scan the full page.",
    joinedSection: "Competitions You're In",
    joinedSectionHint: "Your live and locked-in competitions are surfaced here first.",
    recommendedSection: "Other Open Competitions",
    recommendedSectionHint: "A focused list of competitions you can still join right now.",
    overviewSection: "Your snapshot",
    overviewHint: "Keep season status, key numbers, and alerts in one compact rail.",
    seasonStatus: "Season status",
    recentResultsHint: "Only the most recent results are kept here for a quick read.",
    notificationsAction: "View notifications",
    historyAction: "Match history",
    noJoinedComps: "You are not in any active competitions yet",
    noJoinedCompsHint:
      "Join a competition first and this area will show your live and upcoming matches.",
    exploreCompetitions: "Browse Competitions",
    noOpenCompetitions: "No competitions are open for registration",
    noOpenCompetitionsHint:
      "Check the schedule page or wait for the next registration window to open.",
    noRecentResultsHint: "Complete your first competition and your recent results will show up here.",
    seasonHint: "Monthly points progress and Grand Final qualification status",
    startTimeLabel: "Start time",
    endsIn: "Ends in",
    startsIn: "Starts in",
    participantsLabel: "Participants",
    prizePoolLabel: "Prize pool",
    deadlineLabel: "Registration closes in",
    symbolLabel: "Trading pair",
    appliedAtLabel: "Applied at",
    viewCompetition: "View details",
    toNextTier: "Points to next tier",
    competitionTypes: {
      regular: "Regular",
      grand_final: "Grand Final",
      special: "Special",
      practice: "Practice",
    },
    participantLabels: {
      human: "Human vs Human",
      agent: "Agent vs Agent",
    },
    agentApiAction: "Register via Agent API",
  },
};

function formatTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

function formatCompactNumber(value: number, locale: string, digits = 0): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatSignedPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function formatCountdown(targetTs: number | null): string {
  if (!targetTs) return "--";
  const seconds = Math.max(0, Math.floor((targetTs - Date.now()) / 1000));
  return formatDuration(seconds);
}

function getCompetitionTypeLabel(type: CompetitionType, copy: HubPageCopy): string {
  return copy.competitionTypes[type] ?? copy.competitionTypes.regular;
}

function getParticipantModeLabel(mode: ParticipantMode, copy: HubPageCopy): string {
  return copy.participantLabels[mode] ?? copy.participantLabels.human;
}

function getCompetitionHref(slug: string | null | undefined): string {
  return slug ? `/competitions/${slug}` : "/competitions";
}

function renderBadge(
  label: string,
  colors: { color: string; bg: string },
  withPulse = false,
) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: colors.color, backgroundColor: colors.bg }}
    >
      {withPulse && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  count,
  linkHref,
  linkLabel,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  count?: number;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[#F0B90B]">
          {icon}
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F0B90B]/80">
            Hub
          </span>
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-white">{title}</h2>
          {description ? <p className="text-sm text-[#8D97A8]">{description}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {typeof count === "number" && (
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-[#DCE2EB]">
            {count}
          </span>
        )}
        {linkHref && linkLabel && (
          <Link
            href={linkHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#AAB4C3] transition-colors hover:text-white"
          >
            {linkLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3">
      <p className="text-[11px] text-[#778296]">{label}</p>
      <p className={`mt-1 text-lg font-display font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function MiniInfoChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-[11px] text-[#AEB7C6]">
      {icon}
      {text}
    </span>
  );
}

function SummaryMetricTile({
  label,
  value,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] text-[#748095]">{label}</p>
      <p className={`mt-2 text-base font-display font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function QuickActionLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-[#C7D0DD] transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {badge ? (
        <span className="rounded-full bg-[#F0B90B]/14 px-2 py-0.5 text-[11px] font-semibold text-[#F0B90B]">
          {badge}
        </span>
      ) : (
        <ArrowUpRight className="h-4 w-4 text-[#7D8898]" />
      )}
    </Link>
  );
}

function LiveCompetitionHero({
  competition,
  t,
  copy,
  locale,
}: {
  competition: ActiveCompetition;
  t: Translator;
  copy: HubPageCopy;
  locale: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#0ECB81]/18 bg-[#161D29] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,203,129,0.18),transparent_48%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {renderBadge(t("common.compStatus.live"), COMPETITION_STATUS_STYLE.live, true)}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  TYPE_STYLE[competition.competitionType].badgeClass
                }`}
              >
                {getCompetitionTypeLabel(competition.competitionType, copy)}
              </span>
              {renderBadge(
                getParticipantModeLabel(competition.participantMode, copy),
                PARTICIPANT_MODE_STYLE[competition.participantMode],
              )}
            </div>

            <div>
              <h3 className="text-[28px] font-display font-bold text-white">
                {competition.title}
              </h3>
              <p className="mt-2 text-sm text-[#97A2B2]">
                {copy.startTimeLabel}: {formatTime(competition.startTime, locale)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-left lg:min-w-[150px] lg:text-right">
            <p className="text-[11px] text-[#7D8899]">{copy.endsIn}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">
              {formatDuration(competition.remainingSeconds)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            label={t("hub.rank")}
            value={
              competition.myRank > 0
                ? `#${competition.myRank} / ${competition.participantCount}`
                : "--"
            }
          />
          <InfoTile
            label={t("hub.returnRate")}
            value={`${competition.myPnlPct >= 0 ? "+" : ""}${competition.myPnlPct.toFixed(2)}%`}
            toneClass={competition.myPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
          />
          <InfoTile
            label={copy.participantsLabel}
            value={formatCompactNumber(competition.participantCount, locale)}
          />
          <InfoTile
            label={copy.prizePoolLabel}
            value={`${formatCompactNumber(competition.prizePool, locale)} USDT`}
            toneClass="text-[#F0B90B]"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <MiniInfoChip
              icon={<Calendar className="h-3.5 w-3.5" />}
              text={`${copy.startTimeLabel} ${formatTime(competition.startTime, locale)}`}
            />
            <MiniInfoChip
              icon={<Trophy className="h-3.5 w-3.5" />}
              text={getCompetitionTypeLabel(competition.competitionType, copy)}
            />
            <MiniInfoChip
              icon={<Users className="h-3.5 w-3.5" />}
              text={getParticipantModeLabel(competition.participantMode, copy)}
            />
          </div>

          <Link
            href={`/arena/${competition.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0ECB81] px-5 py-3 text-sm font-semibold text-[#07120C] transition-colors hover:bg-[#0ECB81]/90"
          >
            {t("hub.enterArena")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function RegisteredCompetitionHero({
  competition,
  t,
  copy,
  locale,
}: {
  competition: JoinedCompetitionCardData;
  t: Translator;
  copy: HubPageCopy;
  locale: string;
}) {
  const typeStyle = TYPE_STYLE[competition.competitionType];
  const registrationStyle = REGISTRATION_STATUS_STYLE[competition.registrationStatus];
  const competitionStyle =
    COMPETITION_STATUS_STYLE[competition.competitionStatus ?? "announced"];
  const countdownTarget = competition.registrationCloseAt ?? competition.startTime;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#161B29] p-6">
      <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.heroGradient}`} />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {renderBadge(
                t(`common.status.${competition.registrationStatus}`),
                registrationStyle,
              )}
              {competition.competitionStatus &&
                renderBadge(
                  t(`common.compStatus.${competition.competitionStatus}`),
                  competitionStyle,
                )}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyle.badgeClass}`}
              >
                {getCompetitionTypeLabel(competition.competitionType, copy)}
              </span>
              {renderBadge(
                getParticipantModeLabel(competition.participantMode, copy),
                PARTICIPANT_MODE_STYLE[competition.participantMode],
              )}
            </div>

            <div>
              <h3 className="text-[28px] font-display font-bold text-white">
                {competition.title}
              </h3>
              <p className="mt-2 text-sm text-[#97A2B2]">
                {copy.startTimeLabel}: {formatTime(competition.startTime, locale)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-left lg:min-w-[150px] lg:text-right">
            <p className="text-[11px] text-[#7D8899]">{copy.startsIn}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">
              {formatCountdown(competition.startTime)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            label={copy.startTimeLabel}
            value={formatTime(competition.startTime, locale)}
          />
          <InfoTile
            label={copy.deadlineLabel}
            value={formatCountdown(countdownTarget)}
          />
          <InfoTile
            label={copy.symbolLabel}
            value={competition.symbol ?? "--"}
          />
          <InfoTile
            label={copy.prizePoolLabel}
            value={
              competition.prizePool
                ? `${formatCompactNumber(competition.prizePool, locale)} USDT`
                : "--"
            }
            toneClass="text-[#F0B90B]"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {competition.registeredCount !== null && competition.maxParticipants !== null && (
              <MiniInfoChip
                icon={<Users className="h-3.5 w-3.5" />}
                text={`${competition.registeredCount}/${competition.maxParticipants}`}
              />
            )}
            <MiniInfoChip
              icon={<Clock className="h-3.5 w-3.5" />}
              text={`${copy.appliedAtLabel} ${formatTime(competition.appliedAt, locale)}`}
            />
            <MiniInfoChip
              icon={<Users className="h-3.5 w-3.5" />}
              text={getParticipantModeLabel(competition.participantMode, copy)}
            />
          </div>

          <Link
            href={getCompetitionHref(competition.slug)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            {copy.viewCompetition}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function JoinedCompetitionListCard({
  competition,
  t,
  copy,
  locale,
}: {
  competition: JoinedCompetitionCardData;
  t: Translator;
  copy: HubPageCopy;
  locale: string;
}) {
  const competitionStyle =
    COMPETITION_STATUS_STYLE[competition.competitionStatus ?? "announced"];
  const registrationStyle = REGISTRATION_STATUS_STYLE[competition.registrationStatus];
  const typeStyle = TYPE_STYLE[competition.competitionType];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171C2A] p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.cardGradient}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {renderBadge(
                t(`common.status.${competition.registrationStatus}`),
                registrationStyle,
              )}
              {competition.competitionStatus &&
                renderBadge(
                  t(`common.compStatus.${competition.competitionStatus}`),
                  competitionStyle,
                )}
            </div>
            <h4 className="line-clamp-2 text-base font-display font-bold text-white">
              {competition.title}
            </h4>
            <p className="mt-1 text-sm text-[#8E98A8]">
              {formatTime(competition.startTime, locale)}
            </p>
          </div>

          <Link
            href={getCompetitionHref(competition.slug)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#B9C1D0] transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label={copy.viewCompetition}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <MiniInfoChip
            icon={<Trophy className="h-3.5 w-3.5" />}
            text={getCompetitionTypeLabel(competition.competitionType, copy)}
          />
          <MiniInfoChip
            icon={<Users className="h-3.5 w-3.5" />}
            text={getParticipantModeLabel(competition.participantMode, copy)}
          />
          {competition.symbol && (
            <MiniInfoChip
              icon={<Coins className="h-3.5 w-3.5" />}
              text={competition.symbol}
            />
          )}
          <MiniInfoChip
            icon={<Clock className="h-3.5 w-3.5" />}
            text={`${copy.startsIn} ${formatCountdown(competition.startTime)}`}
          />
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  competition,
  t,
  copy,
  locale,
  onRegister,
  registerPending,
}: {
  competition: CompetitionSummary;
  t: Translator;
  copy: HubPageCopy;
  locale: string;
  onRegister: (slug: string) => void;
  registerPending: boolean;
}) {
  const typeStyle = TYPE_STYLE[competition.competitionType];
  const closeCountdown = formatCountdown(competition.registrationCloseAt ?? competition.startTime);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#161B29]">
      {competition.coverImageUrl && (
        <img
          src={competition.coverImageUrl}
          alt={competition.title}
          className="absolute inset-y-0 right-0 hidden h-full w-[34%] object-cover opacity-[0.14] lg:block"
        />
      )}
      <div className={`absolute inset-0 bg-gradient-to-r ${typeStyle.heroGradient}`} />

      <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyle.badgeClass}`}
            >
              {getCompetitionTypeLabel(competition.competitionType, copy)}
            </span>
            {renderBadge(
              getParticipantModeLabel(competition.participantMode, copy),
              PARTICIPANT_MODE_STYLE[competition.participantMode],
            )}
            {renderBadge(
              t("common.compStatus.registration_open"),
              COMPETITION_STATUS_STYLE.registration_open,
            )}
          </div>

          <div className="max-w-3xl">
            <h3 className="text-2xl font-display font-bold text-white">{competition.title}</h3>
            <p className="mt-2 text-sm text-[#94A0B1]">
              {copy.startTimeLabel}: {formatTime(competition.startTime, locale)}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile
              label={copy.prizePoolLabel}
              value={`${formatCompactNumber(competition.prizePool, locale)} USDT`}
              toneClass="text-[#F0B90B]"
            />
            <InfoTile label={copy.symbolLabel} value={competition.symbol} />
            <InfoTile
              label={copy.participantsLabel}
              value={`${competition.registeredCount}/${competition.maxParticipants}`}
            />
            <InfoTile label={copy.deadlineLabel} value={closeCountdown} />
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-[180px]">
          {competition.participantMode === "agent" ? (
            <Link
              href="/agents"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
            >
              {copy.agentApiAction}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={() => onRegister(competition.slug)}
              disabled={registerPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-50"
            >
              {registerPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("hub.registerNow")}
            </button>
          )}

          <Link
            href={`/competitions/${competition.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            {copy.viewCompetition}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FocusLiveCard({
  competition,
  t,
  copy,
  locale,
}: {
  competition: ActiveCompetition;
  t: Translator;
  copy: HubPageCopy;
  locale: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#0ECB81]/18 bg-[#161D29] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,203,129,0.18),transparent_48%)]" />
      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {renderBadge(t("common.compStatus.live"), COMPETITION_STATUS_STYLE.live, true)}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                TYPE_STYLE[competition.competitionType].badgeClass
              }`}
            >
              {getCompetitionTypeLabel(competition.competitionType, copy)}
            </span>
            {renderBadge(
              getParticipantModeLabel(competition.participantMode, copy),
              PARTICIPANT_MODE_STYLE[competition.participantMode],
            )}
          </div>

          <div>
            <h3 className="text-[28px] font-display font-bold text-white">
              {competition.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[#97A2B2]">
              {copy.startTimeLabel}: {formatTime(competition.startTime, locale)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MiniInfoChip
              icon={<Users className="h-3.5 w-3.5" />}
              text={`${formatCompactNumber(competition.participantCount, locale)} ${copy.participantsLabel}`}
            />
            <MiniInfoChip
              icon={<Trophy className="h-3.5 w-3.5" />}
              text={getCompetitionTypeLabel(competition.competitionType, copy)}
            />
            <MiniInfoChip
              icon={<Calendar className="h-3.5 w-3.5" />}
              text={`${copy.startTimeLabel} ${formatTime(competition.startTime, locale)}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile
              label={t("hub.rank")}
              value={
                competition.myRank > 0
                  ? `#${competition.myRank} / ${competition.participantCount}`
                  : "--"
              }
            />
            <InfoTile
              label={t("hub.returnRate")}
              value={formatSignedPct(competition.myPnlPct)}
              toneClass={competition.myPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
            />
            <InfoTile
              label={copy.prizePoolLabel}
              value={`${formatCompactNumber(competition.prizePool, locale)} USDT`}
              toneClass="text-[#F0B90B]"
            />
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-3 rounded-[22px] border border-white/[0.08] bg-black/15 p-4">
          <div>
            <p className="text-[11px] text-[#7D8899]">{copy.endsIn}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-white">
              {formatDuration(competition.remainingSeconds)}
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              href={`/arena/${competition.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0ECB81] px-5 py-3 text-sm font-semibold text-[#07120C] transition-colors hover:bg-[#0ECB81]/90"
            >
              {t("hub.enterArena")}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href={getCompetitionHref(competition.slug)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              {copy.viewCompetition}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FocusRegisteredCard({
  competition,
  t,
  copy,
  locale,
}: {
  competition: JoinedCompetitionCardData;
  t: Translator;
  copy: HubPageCopy;
  locale: string;
}) {
  const typeStyle = TYPE_STYLE[competition.competitionType];
  const registrationStyle = REGISTRATION_STATUS_STYLE[competition.registrationStatus];
  const competitionStyle =
    COMPETITION_STATUS_STYLE[competition.competitionStatus ?? "announced"];
  const countdownTarget = competition.registrationCloseAt ?? competition.startTime;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#161B29] p-6">
      <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.heroGradient}`} />
      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {renderBadge(
              t(`common.status.${competition.registrationStatus}`),
              registrationStyle,
            )}
            {competition.competitionStatus &&
              renderBadge(
                t(`common.compStatus.${competition.competitionStatus}`),
                competitionStyle,
              )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyle.badgeClass}`}
            >
              {getCompetitionTypeLabel(competition.competitionType, copy)}
            </span>
            {renderBadge(
              getParticipantModeLabel(competition.participantMode, copy),
              PARTICIPANT_MODE_STYLE[competition.participantMode],
            )}
          </div>

          <div>
            <h3 className="text-[28px] font-display font-bold text-white">
              {competition.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[#97A2B2]">
              {copy.startTimeLabel}: {formatTime(competition.startTime, locale)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {competition.symbol && (
              <MiniInfoChip
                icon={<Coins className="h-3.5 w-3.5" />}
                text={competition.symbol}
              />
            )}
            {competition.registeredCount !== null && competition.maxParticipants !== null && (
              <MiniInfoChip
                icon={<Users className="h-3.5 w-3.5" />}
                text={`${competition.registeredCount}/${competition.maxParticipants}`}
              />
            )}
            <MiniInfoChip
              icon={<Clock className="h-3.5 w-3.5" />}
              text={`${copy.appliedAtLabel} ${formatTime(competition.appliedAt, locale)}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile
              label={copy.startTimeLabel}
              value={formatTime(competition.startTime, locale)}
            />
            <InfoTile
              label={copy.deadlineLabel}
              value={formatCountdown(countdownTarget)}
            />
            <InfoTile
              label={copy.prizePoolLabel}
              value={
                competition.prizePool
                  ? `${formatCompactNumber(competition.prizePool, locale)} USDT`
                  : "--"
              }
              toneClass="text-[#F0B90B]"
            />
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-3 rounded-[22px] border border-white/[0.08] bg-black/15 p-4">
          <div>
            <p className="text-[11px] text-[#7D8899]">{copy.startsIn}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-white">
              {formatCountdown(competition.startTime)}
            </p>
          </div>

          <Link
            href={getCompetitionHref(competition.slug)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            {copy.viewCompetition}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompactRecommendationCard({
  competition,
  t,
  copy,
  locale,
  onRegister,
  registerPending,
}: {
  competition: CompetitionSummary;
  t: Translator;
  copy: HubPageCopy;
  locale: string;
  onRegister: (slug: string) => void;
  registerPending: boolean;
}) {
  const typeStyle = TYPE_STYLE[competition.competitionType];
  const closeCountdown = formatCountdown(competition.registrationCloseAt ?? competition.startTime);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#161B29] p-5">
      <div className={`absolute inset-0 bg-gradient-to-r ${typeStyle.cardGradient}`} />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyle.badgeClass}`}
            >
              {getCompetitionTypeLabel(competition.competitionType, copy)}
            </span>
            {renderBadge(
              getParticipantModeLabel(competition.participantMode, copy),
              PARTICIPANT_MODE_STYLE[competition.participantMode],
            )}
          </div>

          <h3 className="text-lg font-display font-bold text-white">{competition.title}</h3>
          <p className="mt-1.5 text-sm text-[#94A0B1]">
            {copy.startTimeLabel}: {formatTime(competition.startTime, locale)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <MiniInfoChip
              icon={<Coins className="h-3.5 w-3.5" />}
              text={competition.symbol}
            />
            <MiniInfoChip
              icon={<Users className="h-3.5 w-3.5" />}
              text={`${competition.registeredCount}/${competition.maxParticipants}`}
            />
            <MiniInfoChip
              icon={<Clock className="h-3.5 w-3.5" />}
              text={`${copy.deadlineLabel} ${closeCountdown}`}
            />
            <MiniInfoChip
              icon={<Trophy className="h-3.5 w-3.5" />}
              text={`${formatCompactNumber(competition.prizePool, locale)} USDT`}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 lg:w-[180px]">
          {competition.participantMode === "agent" ? (
            <Link
              href="/agents"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
            >
              {copy.agentApiAction}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={() => onRegister(competition.slug)}
              disabled={registerPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-50"
            >
              {registerPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("hub.registerNow")}
            </button>
          )}

          <Link
            href={`/competitions/${competition.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            {copy.viewCompetition}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function OverviewRail({
  season,
  quickStats,
  recentResults,
  unreadNotificationCount,
  locale,
  t,
  copy,
}: {
  season: HubData["season"];
  quickStats: HubData["quickStats"];
  recentResults: HubData["recentResults"];
  unreadNotificationCount: number;
  locale: string;
  t: Translator;
  copy: HubPageCopy;
}) {
  return (
    <div className="space-y-6">
      <section className={`${SECTION_CLASS} p-5`}>
        <div className="space-y-1.5">
          <h2 className="text-xl font-display font-bold text-white">{copy.overviewSection}</h2>
          <p className="text-sm text-[#8D97A8]">{copy.overviewHint}</p>
        </div>

        {season && (
          <div className="mt-5 rounded-[22px] border border-white/[0.08] bg-[#171B29] p-4">
            {(() => {
              const currentTier = getRankTier(season.mySeasonPoints);
              const tierColor = TIER_COLORS[season.myRankTier] ?? "#5E6673";
              const nextTierInfo = RANK_TIERS.find((tier) => tier.minPoints > season.mySeasonPoints);
              const progressMax = nextTierInfo ? nextTierInfo.minPoints : currentTier.maxPoints;
              const progressMin = currentTier.minPoints;
              const progressPct =
                progressMax === Infinity
                  ? 100
                  : Math.min(
                      100,
                      ((season.mySeasonPoints - progressMin) / (progressMax - progressMin)) * 100,
                    );

              return (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7B8697]">
                        {copy.seasonStatus}
                      </p>
                      <p className="mt-2 text-3xl font-display font-bold text-white">
                        {formatCompactNumber(season.mySeasonPoints, locale)} pts
                      </p>
                      <p className="mt-1 text-sm text-[#97A2B2]">{season.name}</p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{
                        color: tierColor,
                        backgroundColor: `${tierColor}20`,
                      }}
                    >
                      {currentTier.icon} {currentTier.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#7E8898]">
                      <span>{t("hub.matchProgress", { done: season.matchesCompleted, total: season.matchesTotal })}</span>
                      {nextTierInfo ? (
                        <span>
                          {copy.toNextTier} {formatCompactNumber(season.pointsToNextTier, locale)}
                        </span>
                      ) : (
                        <span>Top tier</span>
                      )}
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%`, backgroundColor: tierColor }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryMetricTile
                      label={t("hub.totalComps")}
                      value={formatCompactNumber(quickStats.totalCompetitions, locale)}
                    />
                    <SummaryMetricTile
                      label={t("hub.winRate")}
                      value={`${quickStats.winRate.toFixed(0)}%`}
                    />
                    <SummaryMetricTile
                      label={t("hub.avgPnl")}
                      value={formatSignedPct(quickStats.avgPnlPct)}
                      toneClass={quickStats.avgPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
                    />
                    <SummaryMetricTile
                      label={t("hub.totalPrize")}
                      value={`${formatCompactNumber(quickStats.totalPrizeWon, locale)} USDT`}
                      toneClass="text-[#F0B90B]"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3">
                    <p className="text-[11px] text-[#748095]">{t("hub.bestRank")}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-base font-display font-bold text-white">
                        {quickStats.bestRank > 0 ? `#${quickStats.bestRank}` : "--"}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          color: season.grandFinalQualified ? "#0ECB81" : "#F6465D",
                          backgroundColor: season.grandFinalQualified
                            ? "rgba(14,203,129,0.12)"
                            : "rgba(246,70,93,0.12)",
                        }}
                      >
                        {season.grandFinalQualified
                          ? t("hub.gfQualified")
                          : t("hub.gfNotQualified", { pts: season.grandFinalLine })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <QuickActionLink
            href="/notifications"
            icon={<Bell className="h-4 w-4 text-[#F0B90B]" />}
            label={copy.notificationsAction}
            badge={unreadNotificationCount > 0 ? String(unreadNotificationCount) : null}
          />
          <QuickActionLink
            href="/leaderboard"
            icon={<BarChart3 className="h-4 w-4 text-[#0ECB81]" />}
            label={t("nav.leaderboard")}
          />
          <QuickActionLink
            href="/history"
            icon={<History className="h-4 w-4 text-[#7AA2F7]" />}
            label={copy.historyAction}
          />
        </div>
      </section>

      <section className={`${SECTION_CLASS} p-5`}>
        <div className="space-y-1.5">
          <h2 className="text-xl font-display font-bold text-white">{t("hub.recentResults")}</h2>
          <p className="text-sm text-[#8D97A8]">{copy.recentResultsHint}</p>
        </div>

        <div className="mt-5 space-y-3">
          {recentResults.length > 0 ? (
            recentResults.slice(0, 4).map((result) => (
              <Link
                key={result.competitionId}
                href={`/results/${result.competitionId}`}
                className="block rounded-[20px] border border-white/[0.06] bg-[#171B29] p-4 transition-colors hover:bg-[#1B2132]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-[#9BA6B7]">
                        #{result.competitionNumber}
                      </span>
                      {result.prizeWon > 0 && (
                        <span className="rounded-full bg-[#F0B90B]/14 px-2 py-0.5 text-[10px] font-semibold text-[#F0B90B]">
                          {formatCompactNumber(result.prizeWon, locale)} USDT
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white">
                      {result.competitionTitle}
                    </h3>
                    <p className="mt-1 text-xs text-[#8E98A8]">
                      {formatTime(result.createdAt, locale)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white">
                      <Medal className="h-3.5 w-3.5 text-[#F0B90B]" />
                      #{result.finalRank}
                    </div>
                    <p
                      className={`mt-2 text-sm font-display font-bold ${
                        result.totalPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"
                      }`}
                    >
                      {formatSignedPct(result.totalPnlPct)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center">
              <Trophy className="mx-auto h-8 w-8 text-[#7D8899]" />
              <p className="mt-3 text-sm text-[#8F98A8]">{copy.noRecentResultsHint}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function HubPage() {
  const { username } = useAuth();
  const { lang, t } = useT();
  const { data: hub, isLoading: loading, error: queryError } = useHubData();
  const registerMutation = useRegister();
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const copy = HUB_PAGE_COPY[lang === "en" ? "en" : "zh"];
  const error = queryError ? (queryError as Error).message : null;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  if (error || !hub) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1C2030] p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#F6465D]" />
          <p className="text-sm text-[#D1D4DC]">{error ?? t("common.loadFailed")}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-[#F0B90B] px-4 py-2 text-xs font-bold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const {
    activeCompetition,
    myRegistrations,
    upcomingCompetitions,
    season,
    quickStats,
    recentResults,
    unreadNotificationCount,
  } = hub;
  const now = Date.now();
  const upcomingMap = new Map<number, CompetitionSummary>(
    upcomingCompetitions.map((competition) => [competition.id, competition]),
  );

  const joinedUpcoming = myRegistrations
    .filter(
      (registration) =>
        registration.competitionId !== activeCompetition?.id && registration.startTime >= now,
    )
    .sort((a, b) => a.startTime - b.startTime)
    .map((registration): JoinedCompetitionCardData => {
      const summary = upcomingMap.get(registration.competitionId);

      return {
        competitionId: registration.competitionId,
        title: registration.competitionTitle,
        competitionType: registration.competitionType,
        participantMode: registration.participantMode,
        registrationStatus: registration.status,
        competitionStatus: summary?.status ?? null,
        startTime: registration.startTime,
        appliedAt: registration.appliedAt,
        slug: summary?.slug ?? null,
        prizePool: summary?.prizePool ?? null,
        symbol: summary?.symbol ?? null,
        registeredCount: summary?.registeredCount ?? null,
        maxParticipants: summary?.maxParticipants ?? null,
        registrationCloseAt: summary?.registrationCloseAt ?? null,
      };
    });

  const primaryJoined = activeCompetition ? null : joinedUpcoming[0] ?? null;
  const additionalJoined = activeCompetition ? joinedUpcoming : joinedUpcoming.slice(1);
  const joinedCount = (activeCompetition ? 1 : 0) + joinedUpcoming.length;
  const joinedIds = new Set<number>([
    ...myRegistrations.map((registration) => registration.competitionId),
    ...(activeCompetition ? [activeCompetition.id] : []),
  ]);

  const recommendedCompetitions = upcomingCompetitions
    .filter(
      (competition) =>
        competition.status === "registration_open" && !joinedIds.has(competition.id),
    )
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            {t("hub.welcome", { name: username })}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {joinedCount > 0 && (
            <MiniInfoChip
              icon={<Trophy className="h-3.5 w-3.5" />}
              text={`${copy.joinedSection} · ${joinedCount}`}
            />
          )}
          {recommendedCompetitions.length > 0 && (
            <MiniInfoChip
              icon={<Sparkles className="h-3.5 w-3.5" />}
              text={`${copy.recommendedSection} · ${recommendedCompetitions.length}`}
            />
          )}
          <MiniInfoChip
            icon={<Bell className="h-3.5 w-3.5" />}
            text={`${copy.notificationsAction} · ${unreadNotificationCount}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/competitions"
          className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-4 py-2.5 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
        >
          {lang === "zh" ? "去看比赛" : "Browse competitions"}
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#D1D4DC] transition-colors hover:bg-white/[0.04]"
        >
          {lang === "zh" ? "完善资料" : "Update profile"}
        </Link>
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#D1D4DC] transition-colors hover:bg-white/[0.04]"
        >
          {lang === "zh" ? "打开AI管理中心" : "Open Agent Center"}
        </Link>
      </div>

      <AgentSpectatorSection embedded />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="space-y-6">
          <section className={`${SECTION_CLASS} p-6 md:p-7`}>
            <SectionHeader
              icon={<Trophy className="h-4 w-4" />}
              title={copy.focusSection}
              count={joinedCount}
              linkHref="/competitions"
              linkLabel={t("hub.browseSchedule")}
            />

            <div className="mt-6">
              {activeCompetition || primaryJoined ? (
                <div
                  className={
                    additionalJoined.length > 0
                      ? "grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]"
                      : "space-y-4"
                  }
                >
                  <div>
                    {activeCompetition ? (
                      <FocusLiveCard
                        competition={activeCompetition}
                        t={t}
                        copy={copy}
                        locale={locale}
                      />
                    ) : primaryJoined ? (
                      <FocusRegisteredCard
                        competition={primaryJoined}
                        t={t}
                        copy={copy}
                        locale={locale}
                      />
                    ) : null}
                  </div>

                  {additionalJoined.length > 0 && (
                    <div className="space-y-4">
                      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                        <p className="text-sm font-semibold text-white">{copy.joinedSection}</p>
                      </div>
                      {additionalJoined.slice(0, 3).map((competition) => (
                        <JoinedCompetitionListCard
                          key={competition.competitionId}
                          competition={competition}
                          t={t}
                          copy={copy}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-[radial-gradient(circle_at_top,rgba(240,185,11,0.08),transparent_45%)] px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#F0B90B]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-display font-bold text-white">
                    {copy.noJoinedComps}
                  </h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-[#8F98A8]">
                    {copy.noJoinedCompsHint}
                  </p>
                  <Link
                    href="/competitions"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
                  >
                    {copy.exploreCompetitions}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className={`${SECTION_CLASS} p-6 md:p-7`}>
            <SectionHeader
              icon={<Sparkles className="h-4 w-4" />}
              title={copy.recommendedSection}
              count={recommendedCompetitions.length}
              linkHref="/competitions"
              linkLabel={t("hub.browseSchedule")}
            />

            <div className="mt-6 grid gap-4">
              {recommendedCompetitions.length > 0 ? (
                recommendedCompetitions.map((competition) => (
                  <CompactRecommendationCard
                    key={competition.id}
                    competition={competition}
                    t={t}
                    copy={copy}
                    locale={locale}
                    onRegister={(slug) => registerMutation.mutate(slug)}
                    registerPending={registerMutation.isPending}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-[#7E8897]" />
                  <h3 className="mt-4 text-xl font-display font-bold text-white">
                    {copy.noOpenCompetitions}
                  </h3>
                  <p className="mt-2 text-sm text-[#8F98A8]">{copy.noOpenCompetitionsHint}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <OverviewRail
          season={season}
          quickStats={quickStats}
          recentResults={recentResults}
          unreadNotificationCount={unreadNotificationCount}
          locale={locale}
          t={t}
          copy={copy}
        />
      </div>
    </div>
  );
}
