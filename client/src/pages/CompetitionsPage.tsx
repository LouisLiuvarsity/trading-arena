import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { useCompetitions, useRegister, useWithdraw } from "@/hooks/useCompetitionData";
import type { CompetitionStatus, CompetitionSummary, CompetitionType } from "@shared/competitionTypes";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  ClipboardList,
  Loader2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

type FilterTab = "all" | "registration_open" | "live" | "completed";
type Translator = (key: string, vars?: Record<string, string | number>) => string;

const FILTER_KEYS: FilterTab[] = ["all", "registration_open", "live", "completed"];
const PAGE_CLASS =
  "rounded-[28px] border border-white/[0.08] bg-[#141826] shadow-[0_18px_60px_rgba(0,0,0,0.28)]";

const STATUS_STYLE: Record<
  CompetitionStatus,
  { color: string; bg: string; icon: typeof CircleDot | typeof Clock | typeof CheckCircle2 | typeof AlertCircle }
> = {
  draft: { color: "#848E9C", bg: "rgba(132,142,156,0.14)", icon: ClipboardList },
  announced: { color: "#7AA2F7", bg: "rgba(122,162,247,0.16)", icon: ClipboardList },
  registration_open: { color: "#F0B90B", bg: "rgba(240,185,11,0.16)", icon: ClipboardList },
  registration_closed: { color: "#848E9C", bg: "rgba(132,142,156,0.14)", icon: Clock },
  live: { color: "#0ECB81", bg: "rgba(14,203,129,0.16)", icon: CircleDot },
  settling: { color: "#F0B90B", bg: "rgba(240,185,11,0.16)", icon: Clock },
  completed: { color: "#848E9C", bg: "rgba(132,142,156,0.14)", icon: CheckCircle2 },
  ended_early: { color: "#FF6B35", bg: "rgba(255,107,53,0.14)", icon: CheckCircle2 },
  cancelled: { color: "#F6465D", bg: "rgba(246,70,93,0.14)", icon: AlertCircle },
};

const REG_STATUS_COLOR: Record<string, string> = {
  pending: "#F0B90B",
  accepted: "#0ECB81",
  rejected: "#F6465D",
  withdrawn: "#5E6673",
  waitlisted: "#7AA2F7",
};

const TYPE_STYLE: Record<
  CompetitionType,
  { badgeClass: string; gradient: string }
> = {
  regular: {
    badgeClass: "border border-[#0ECB81]/20 bg-[#0ECB81]/10 text-[#0ECB81]",
    gradient: "from-[#0ECB81]/12 via-transparent to-transparent",
  },
  grand_final: {
    badgeClass: "border border-[#F0B90B]/20 bg-[#F0B90B]/10 text-[#F0B90B]",
    gradient: "from-[#F0B90B]/12 via-[#FF6B35]/6 to-transparent",
  },
  special: {
    badgeClass: "border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 text-[#B59CFF]",
    gradient: "from-[#8B5CF6]/12 via-[#5B7CFA]/6 to-transparent",
  },
  practice: {
    badgeClass: "border border-white/10 bg-white/[0.04] text-[#C0C7D4]",
    gradient: "from-white/[0.06] via-transparent to-transparent",
  },
};

type ScheduleCopy = {
  title: string;
  subtitle: string;
  overviewAll: string;
  overviewUpcoming: string;
  overviewLive: string;
  overviewDone: string;
  filterLabels: Record<FilterTab, string>;
  sectionLabels: {
    live: string;
    open: string;
    done: string;
    draft: string;
  };
  startTimeLabel: string;
  countdownLabel: string;
  participantsLabel: string;
  prizePoolLabel: string;
  symbolLabel: string;
  viewCompetition: string;
  noMatches: string;
  noMatchesHint: string;
  acceptedLabel: string;
  registeredLabel: string;
  typeLabels: Record<CompetitionType, string>;
};

const SCHEDULE_COPY: Record<"zh" | "en", ScheduleCopy> = {
  zh: {
    title: "赛程",
    subtitle: "按比赛阶段浏览，当前开放、进行中和已结束的比赛一眼看清。",
    overviewAll: "全部比赛",
    overviewUpcoming: "待开赛",
    overviewLive: "进行中",
    overviewDone: "已结束",
    filterLabels: {
      all: "全部",
      registration_open: "待开赛",
      live: "进行中",
      completed: "已结束",
    },
    sectionLabels: {
      live: "进行中的比赛",
      open: "报名与待开赛",
      done: "已结束的比赛",
      draft: "草稿",
    },
    startTimeLabel: "开赛时间",
    countdownLabel: "时间状态",
    participantsLabel: "报名 / 名额",
    prizePoolLabel: "奖池",
    symbolLabel: "交易币种",
    viewCompetition: "查看详情",
    noMatches: "当前筛选下没有比赛",
    noMatchesHint: "切换筛选条件，或者等待下一场比赛创建。",
    acceptedLabel: "已通过",
    registeredLabel: "已报名",
    typeLabels: {
      regular: "常规赛",
      grand_final: "总决赛",
      special: "特别赛",
      practice: "练习赛",
    },
  },
  en: {
    title: "Schedule",
    subtitle: "Browse competitions by stage so open, live, and completed matches are obvious at a glance.",
    overviewAll: "All matches",
    overviewUpcoming: "Upcoming",
    overviewLive: "Live",
    overviewDone: "Completed",
    filterLabels: {
      all: "All",
      registration_open: "Upcoming",
      live: "Live",
      completed: "Completed",
    },
    sectionLabels: {
      live: "Live matches",
      open: "Registration and upcoming",
      done: "Completed matches",
      draft: "Drafts",
    },
    startTimeLabel: "Start time",
    countdownLabel: "Time status",
    participantsLabel: "Registrations / capacity",
    prizePoolLabel: "Prize pool",
    symbolLabel: "Trading pair",
    viewCompetition: "View details",
    noMatches: "No competitions for this filter",
    noMatchesHint: "Try another filter or wait for the next competition to be created.",
    acceptedLabel: "accepted",
    registeredLabel: "registered",
    typeLabels: {
      regular: "Regular",
      grand_final: "Grand Final",
      special: "Special",
      practice: "Practice",
    },
  },
};

function matchesFilter(comp: CompetitionSummary, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "live") return comp.status === "live" || comp.status === "settling";
  if (filter === "completed") {
    return (
      comp.status === "completed" ||
      comp.status === "ended_early" ||
      comp.status === "cancelled"
    );
  }
  if (filter === "registration_open") {
    return (
      comp.status === "announced" ||
      comp.status === "registration_open" ||
      comp.status === "registration_closed"
    );
  }
  return comp.status === filter;
}

function formatTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

function formatCountdown(
  startTime: number,
  endTime: number,
  now: number,
  t: Translator,
): string {
  if (now < startTime) {
    const diff = Math.floor((startTime - now) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return h > 0 ? t("comp.startIn", { h, m }) : t("comp.startInM", { m });
  }

  if (now < endTime) {
    const diff = Math.floor((endTime - now) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return h > 0 ? t("comp.remaining", { h, m }) : t("comp.remainingM", { m });
  }

  return t("common.ended");
}

function renderBadge(label: string, colors: { color: string; bg: string }, pulse = false) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: colors.color, backgroundColor: colors.bg }}
    >
      {pulse && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}

function getTypeLabel(type: CompetitionType, copy: ScheduleCopy): string {
  return copy.typeLabels[type] ?? copy.typeLabels.regular;
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-[#F0B90B]">{icon}</span>
      <h2 className="text-sm font-display font-bold text-white">{title}</h2>
      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#9BA5B5]">
        {count}
      </span>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: number;
  accentClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#171B29] px-4 py-4">
      <p className="text-[11px] text-[#7D8798]">{label}</p>
      <p className={`mt-2 text-2xl font-display font-bold ${accentClass}`}>{value}</p>
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
      <p className={`mt-1 text-base font-display font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function getActionHref(comp: CompetitionSummary): string {
  if (comp.status === "live" && comp.myRegistrationStatus === "accepted") {
    return `/arena/${comp.id}`;
  }
  if (comp.status === "completed" || comp.status === "ended_early") {
    return `/results/${comp.id}`;
  }
  return `/competitions/${comp.slug}`;
}

function getPrimaryActionLabel(comp: CompetitionSummary, t: Translator): string {
  if (comp.status === "live" && comp.myRegistrationStatus === "accepted") {
    return t("comp.enterArena");
  }
  if (comp.status === "completed" || comp.status === "ended_early") {
    return t("comp.viewResults");
  }
  if (comp.status === "registration_open" && !comp.myRegistrationStatus) {
    return t("comp.register");
  }
  return t("comp.details");
}

function groupByStatus(
  competitions: CompetitionSummary[],
  copy: ScheduleCopy,
): Array<{
  key: string;
  label: string;
  icon: typeof CircleDot | typeof ClipboardList | typeof CheckCircle2;
  items: CompetitionSummary[];
}> {
  const live = competitions.filter((competition) =>
    competition.status === "live" || competition.status === "settling",
  );
  const open = competitions.filter((competition) =>
    competition.status === "announced" ||
    competition.status === "registration_open" ||
    competition.status === "registration_closed",
  );
  const done = competitions.filter((competition) =>
    competition.status === "completed" ||
    competition.status === "ended_early" ||
    competition.status === "cancelled",
  );
  const drafts = competitions.filter((competition) => competition.status === "draft");

  const groups = [];
  if (live.length) groups.push({ key: "live", label: copy.sectionLabels.live, icon: CircleDot, items: live });
  if (open.length) groups.push({ key: "open", label: copy.sectionLabels.open, icon: ClipboardList, items: open });
  if (drafts.length) groups.push({ key: "draft", label: copy.sectionLabels.draft, icon: ClipboardList, items: drafts });
  if (done.length) groups.push({ key: "done", label: copy.sectionLabels.done, icon: CheckCircle2, items: done });
  return groups;
}

function CompetitionCard({
  comp,
  t,
  copy,
  locale,
  now,
  onRegister,
  registeringSlug,
  onWithdraw,
  withdrawingSlug,
}: {
  comp: CompetitionSummary;
  t: Translator;
  copy: ScheduleCopy;
  locale: string;
  now: number;
  onRegister: (slug: string) => void;
  registeringSlug: string | null;
  onWithdraw: (slug: string) => void;
  withdrawingSlug: string | null;
}) {
  const statusCfg = STATUS_STYLE[comp.status] ?? STATUS_STYLE.draft;
  const regColor = comp.myRegistrationStatus ? REG_STATUS_COLOR[comp.myRegistrationStatus] : null;
  const typeCfg = TYPE_STYLE[comp.competitionType] ?? TYPE_STYLE.regular;
  const isRegistering = registeringSlug === comp.slug;
  const isWithdrawing = withdrawingSlug === comp.slug;
  const countdown = formatCountdown(comp.startTime, comp.endTime, now, t);
  const primaryActionLabel = getPrimaryActionLabel(comp, t);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#161B29]">
      {comp.coverImageUrl && (
        <img
          src={comp.coverImageUrl}
          alt={comp.title}
          className="absolute inset-y-0 right-0 hidden h-full w-[32%] object-cover opacity-[0.14] lg:block"
        />
      )}
      <div className={`absolute inset-0 bg-gradient-to-r ${typeCfg.gradient}`} />

      <div className="relative flex flex-col gap-6 p-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeCfg.badgeClass}`}
            >
              {getTypeLabel(comp.competitionType, copy)}
            </span>
            {renderBadge(
              t(`common.compStatus.${comp.status}`),
              statusCfg,
              comp.status === "live",
            )}
            {regColor && comp.myRegistrationStatus && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ color: regColor, backgroundColor: `${regColor}20` }}
              >
                {t("comp.myStatus")}
                {t(`common.status.${comp.myRegistrationStatus}`)}
              </span>
            )}
          </div>

          <h3 className="text-2xl font-display font-bold text-white">{comp.title}</h3>
          <p className="mt-2 text-sm text-[#94A0B1]">
            {copy.startTimeLabel}: {formatTime(comp.startTime, locale)}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile
              label={copy.startTimeLabel}
              value={formatTime(comp.startTime, locale)}
            />
            <InfoTile label={copy.countdownLabel} value={countdown} />
            <InfoTile
              label={copy.participantsLabel}
              value={`${comp.registeredCount}/${comp.maxParticipants}`}
            />
            <InfoTile
              label={copy.prizePoolLabel}
              value={`${comp.prizePool.toLocaleString(locale)} USDT`}
              toneClass="text-[#F0B90B]"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[#AEB7C6]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5">
              <Clock className="h-3.5 w-3.5" />
              {countdown}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5">
              <Users className="h-3.5 w-3.5" />
              {comp.acceptedCount > 0
                ? `${comp.acceptedCount} ${copy.acceptedLabel}`
                : `${comp.registeredCount} ${copy.registeredLabel}`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5" />
              {copy.symbolLabel}: {comp.symbol}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-[220px]">
          {comp.status === "registration_open" && !comp.myRegistrationStatus ? (
            <button
              onClick={() => onRegister(comp.slug)}
              disabled={isRegistering}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-50"
            >
              {isRegistering && <Loader2 className="h-4 w-4 animate-spin" />}
              {primaryActionLabel}
            </button>
          ) : (
            <Link
              href={getActionHref(comp)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.10]"
            >
              {primaryActionLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}

          {comp.status === "registration_open" &&
          comp.myRegistrationStatus &&
          comp.myRegistrationStatus !== "withdrawn" &&
          comp.myRegistrationStatus !== "rejected" ? (
            <button
              onClick={() => onWithdraw(comp.slug)}
              disabled={isWithdrawing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F6465D]/30 bg-transparent px-5 py-3 text-sm font-semibold text-[#F6465D] transition-colors hover:bg-[#F6465D]/10 disabled:opacity-50"
            >
              {isWithdrawing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isWithdrawing ? t("comp.withdrawing") : t("comp.withdraw")}
            </button>
          ) : (
            <Link
              href={`/competitions/${comp.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              {copy.viewCompetition}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompetitionsPage() {
  const { t, lang } = useT();
  const [filter, setFilter] = useState<FilterTab>("all");
  const { data: compData, isLoading: loading, error: queryError } = useCompetitions();
  const registerMutation = useRegister();
  const withdrawMutation = useWithdraw();
  const competitions = compData?.items ?? [];
  const error = queryError ? (queryError as Error).message : null;
  const locale = lang === "en" ? "en-US" : "zh-CN";
  const copy = SCHEDULE_COPY[lang === "en" ? "en" : "zh"];
  const now = Date.now();

  const handleRegister = (slug: string) => {
    registerMutation.mutate(slug, {
      onSuccess: () => toast.success(t("compDetail.registerSuccess")),
      onError: (err: any) => toast.error(err.message ?? t("compDetail.registerFailed")),
    });
  };

  const handleWithdraw = (slug: string) => {
    withdrawMutation.mutate(slug, {
      onSuccess: () => toast.success(t("comp.withdrawSuccess")),
      onError: (err: any) => toast.error(err.message ?? t("comp.withdrawFailed")),
    });
  };

  const filtered = competitions.filter((competition) => matchesFilter(competition, filter));
  const groups = groupByStatus(filtered, copy);
  const overview = {
    all: competitions.length,
    upcoming: competitions.filter((competition) => matchesFilter(competition, "registration_open")).length,
    live: competitions.filter((competition) => matchesFilter(competition, "live")).length,
    done: competitions.filter((competition) => matchesFilter(competition, "completed")).length,
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1C2030] p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#F6465D]" />
          <p className="text-sm text-[#D1D4DC]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="mb-1">
        <h1 className="text-3xl font-display font-bold text-white">{copy.title}</h1>
        <p className="mt-2 text-sm text-[#8F98A8]">{copy.subtitle}</p>
      </div>

      <section className={`${PAGE_CLASS} p-6 md:p-7`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#F0B90B]">
              <Calendar className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F0B90B]/80">
                Schedule
              </span>
            </div>
            <h2 className="text-xl font-display font-bold text-white">{copy.title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5">
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition-colors ${
                  filter === key
                    ? "bg-[#F0B90B] text-[#0B0E11]"
                    : "text-[#9CA6B7] hover:text-white"
                }`}
              >
                {copy.filterLabels[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard label={copy.overviewAll} value={overview.all} accentClass="text-white" />
          <OverviewCard
            label={copy.overviewUpcoming}
            value={overview.upcoming}
            accentClass="text-[#F0B90B]"
          />
          <OverviewCard label={copy.overviewLive} value={overview.live} accentClass="text-[#0ECB81]" />
          <OverviewCard label={copy.overviewDone} value={overview.done} accentClass="text-[#AAB4C3]" />
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className={`${PAGE_CLASS} px-6 py-14 text-center`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#F0B90B]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-xl font-display font-bold text-white">{copy.noMatches}</h3>
          <p className="mt-2 text-sm text-[#8F98A8]">{copy.noMatchesHint}</p>
        </section>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <section key={group.key} className={`${PAGE_CLASS} p-6 md:p-7`}>
                <SectionHeader
                  icon={<GroupIcon className="h-4 w-4" />}
                  title={group.label}
                  count={group.items.length}
                />
                <div className="space-y-4">
                  {group.items.map((competition) => (
                    <CompetitionCard
                      key={competition.id}
                      comp={competition}
                      t={t}
                      copy={copy}
                      locale={locale}
                      now={now}
                      onRegister={handleRegister}
                      registeringSlug={
                        registerMutation.isPending ? (registerMutation.variables as string) : null
                      }
                      onWithdraw={handleWithdraw}
                      withdrawingSlug={
                        withdrawMutation.isPending ? (withdrawMutation.variables as string) : null
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
