import { useState } from "react";
import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { useCompetitions, useWithdraw } from "@/hooks/useCompetitionData";
import type { CompetitionSummary } from "@shared/competitionTypes";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  Users,
  Clock,
  Trophy,
  CircleDot,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";

type FilterTab = "all" | "registration_open" | "live" | "completed";

const FILTER_KEYS: FilterTab[] = ["all", "registration_open", "live", "completed"];

const FILTER_I18N: Record<FilterTab, string> = {
  all: "comp.filterAll",
  registration_open: "comp.filterOpen",
  live: "comp.filterLive",
  completed: "comp.filterDone",
};

const STATUS_STYLE: Record<string, { color: string; bg: string; icon: typeof CircleDot }> = {
  draft: { color: "#848E9C", bg: "rgba(132,142,156,0.12)", icon: ClipboardList },
  announced: { color: "#F0B90B", bg: "rgba(240,185,11,0.12)", icon: ClipboardList },
  registration_open: { color: "#F0B90B", bg: "rgba(240,185,11,0.12)", icon: ClipboardList },
  registration_closed: { color: "#848E9C", bg: "rgba(132,142,156,0.12)", icon: Clock },
  live: { color: "#0ECB81", bg: "rgba(14,203,129,0.12)", icon: CircleDot },
  settling: { color: "#F0B90B", bg: "rgba(240,185,11,0.12)", icon: Clock },
  completed: { color: "#848E9C", bg: "rgba(132,142,156,0.12)", icon: CheckCircle2 },
  ended_early: { color: "#FF6B35", bg: "rgba(255,107,53,0.12)", icon: CheckCircle2 },
  cancelled: { color: "#F6465D", bg: "rgba(246,70,93,0.12)", icon: AlertCircle },
};

const REG_STATUS_COLOR: Record<string, string> = {
  pending: "#F0B90B",
  accepted: "#0ECB81",
  rejected: "#F6465D",
  withdrawn: "#5E6673",
  waitlisted: "#848E9C",
};

function matchesFilter(comp: CompetitionSummary, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "live") return comp.status === "live" || comp.status === "settling";
  if (filter === "completed") return comp.status === "completed" || comp.status === "ended_early" || comp.status === "cancelled";
  if (filter === "registration_open") return comp.status === "registration_open" || comp.status === "announced";
  return comp.status === filter;
}

function groupByStatus(
  comps: CompetitionSummary[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): { label: string; icon: typeof CircleDot; comps: CompetitionSummary[]; colorKey: string }[] {
  const live = comps.filter((c) => c.status === "live" || c.status === "settling");
  const regOpen = comps.filter((c) => c.status === "registration_open" || c.status === "announced" || c.status === "registration_closed");
  const completed = comps.filter((c) => c.status === "completed" || c.status === "ended_early" || c.status === "cancelled");
  const draft = comps.filter((c) => c.status === "draft");

  const groups: { label: string; icon: typeof CircleDot; comps: CompetitionSummary[]; colorKey: string }[] = [];
  if (live.length > 0) groups.push({ label: "LIVE", icon: CircleDot, comps: live, colorKey: "live" });
  if (regOpen.length > 0) groups.push({ label: t("comp.filterOpen"), icon: ClipboardList, comps: regOpen, colorKey: "open" });
  if (draft.length > 0) groups.push({ label: t("common.compStatus.draft"), icon: ClipboardList, comps: draft, colorKey: "draft" });
  if (completed.length > 0) groups.push({ label: t("comp.filterDone"), icon: CheckCircle2, comps: completed, colorKey: "done" });
  return groups;
}

function getGroupIconColor(colorKey: string): string {
  if (colorKey === "live") return "#0ECB81";
  if (colorKey === "open") return "#F0B90B";
  return "#848E9C";
}

export default function CompetitionsPage() {
  const { t, lang } = useT();
  const [filter, setFilter] = useState<FilterTab>("all");

  // React Query: competitions list
  const { data: compData, isLoading: loading, error: queryError } = useCompetitions();
  const competitions = compData?.items ?? [];
  const error = queryError ? (queryError as Error).message : null;

  // React Query: withdraw mutation
  const withdrawMutation = useWithdraw();

  const handleWithdraw = (slug: string) => {
    withdrawMutation.mutate(slug, {
      onSuccess: () => {
        toast.success(t("comp.withdrawSuccess"));
      },
      onError: (err: any) => {
        toast.error(err.message ?? t("comp.withdrawFailed"));
      },
    });
  };

  const filtered = competitions.filter((c) => matchesFilter(c, filter));
  const groups = groupByStatus(filtered, t);

  const locale = lang === "en" ? "en-US" : "zh-CN";

  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleString(locale, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCountdown = (startTime: number, endTime: number): string => {
    const now = Date.now();
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
    return "";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-display font-bold text-white mb-1">{t("comp.title")}</h1>
      <p className="text-[#848E9C] text-[11px] mb-5">{t("comp.subtitle")}</p>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-white/[0.03] rounded-lg p-1 w-fit">
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
              filter === key
                ? "bg-[#F0B90B] text-[#0B0E11]"
                : "text-[#848E9C] hover:text-[#D1D4DC]"
            }`}
          >
            {t(FILTER_I18N[key])}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#848E9C] text-sm">{t("comp.noComps")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.colorKey}>
                <div className="flex items-center gap-2 mb-3">
                  <GroupIcon className="w-4 h-4" style={{ color: getGroupIconColor(group.colorKey) }} />
                  <h2 className="text-xs font-display font-bold text-[#D1D4DC]">{group.label}</h2>
                  <span className="text-[10px] text-[#848E9C]">({group.comps.length})</span>
                </div>
                <div className="space-y-3">
                  {group.comps.map((comp) => (
                    <CompetitionCard
                      key={comp.id}
                      comp={comp}
                      t={t}
                      formatTime={formatTime}
                      formatCountdown={formatCountdown}
                      onWithdraw={handleWithdraw}
                      withdrawingSlug={withdrawMutation.isPending ? (withdrawMutation.variables as string) : null}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({
  comp,
  t,
  formatTime,
  formatCountdown,
  onWithdraw,
  withdrawingSlug,
}: {
  comp: CompetitionSummary;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatTime: (ts: number) => string;
  formatCountdown: (startTime: number, endTime: number) => string;
  onWithdraw: (slug: string) => void;
  withdrawingSlug: string | null;
}) {
  const statusCfg = STATUS_STYLE[comp.status] ?? STATUS_STYLE.draft;
  const statusLabel = t(`common.compStatus.${comp.status}`);
  const regColor = comp.myRegistrationStatus ? REG_STATUS_COLOR[comp.myRegistrationStatus] : null;
  const regLabel = comp.myRegistrationStatus ? t(`common.status.${comp.myRegistrationStatus}`) : null;
  const isWithdrawing = withdrawingSlug === comp.slug;

  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden hover:border-[rgba(255,255,255,0.15)] transition-colors">
      {/* Cover image (if available) */}
      {(comp as any).coverImageUrl && (
        <div className="h-32 overflow-hidden">
          <img src={(comp as any).coverImageUrl} alt={comp.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title + Status */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[#D1D4DC] text-sm font-display font-bold truncate">{comp.title}</span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
            >
              {comp.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />}
              {statusLabel}
            </span>
          </div>

          {/* Info line */}
          <div className="flex items-center gap-3 text-[11px] text-[#848E9C] flex-wrap">
            {comp.startTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(comp.startTime)}
                {(comp.status === "live" || comp.status === "registration_open") &&
                  ` \u00B7 ${formatCountdown(comp.startTime, comp.endTime)}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {comp.status === "completed" || comp.status === "ended_early"
                ? t("common.people", { n: comp.acceptedCount })
                : t("common.people", { n: `${comp.registeredCount}/${comp.maxParticipants}` })}
            </span>
            {comp.prizePool > 0 && (
              <span className="flex items-center gap-1 text-[#F0B90B]">
                <Trophy className="w-3 h-3" />
                {comp.prizePool}U
              </span>
            )}
            {comp.symbol && (
              <span className="font-mono">{comp.symbol}</span>
            )}
          </div>

          {/* Registration status */}
          {regColor && regLabel && comp.status !== "completed" && comp.status !== "ended_early" && (
            <div className="mt-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${regColor}20`, color: regColor }}
              >
                {t("comp.myStatus")}{regLabel}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-2">
          {comp.status === "live" && comp.myRegistrationStatus === "accepted" && (
            <Link
              href={`/arena/${comp.id}`}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#0ECB81] text-[#0B0E11] text-[11px] font-bold rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
            >
              {t("comp.enterArena")} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {comp.status === "registration_open" && !comp.myRegistrationStatus && (
            <Link
              href={`/competitions/${comp.slug}`}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#F0B90B] text-[#0B0E11] text-[11px] font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
            >
              {t("comp.register")} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {comp.status === "registration_open" &&
            comp.myRegistrationStatus &&
            comp.myRegistrationStatus !== "withdrawn" &&
            comp.myRegistrationStatus !== "rejected" && (
              <button
                onClick={() => onWithdraw(comp.slug)}
                disabled={isWithdrawing}
                className="px-3 py-2 text-[11px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
              >
                {isWithdrawing ? t("comp.withdrawing") : t("comp.withdraw")}
              </button>
            )}
          {(comp.status === "completed" || comp.status === "ended_early") && (
            <Link
              href={`/results/${comp.id}`}
              className="inline-flex items-center gap-1 px-4 py-2 text-[11px] font-bold text-[#D1D4DC] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors"
            >
              {t("comp.viewResults")} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {comp.status !== "live" && comp.status !== "completed" && comp.status !== "ended_early" && comp.status !== "registration_open" && (
            <Link
              href={`/competitions/${comp.slug}`}
              className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
            >
              {t("comp.details")} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
