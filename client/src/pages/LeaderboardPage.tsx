import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useCompetitionLeaderboard, useCompetitions } from "@/hooks/useCompetitionData";
import type { CompetitionSummary } from "@shared/competitionTypes";
import type { LeaderboardEntry } from "@/lib/types";
import { RANK_TIERS } from "@/lib/types";
import {
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  Crown,
  Loader2,
  Medal,
  Star,
  Trophy,
} from "lucide-react";

type TabKey = "current" | "season";

const PAGE_CLASS =
  "rounded-[28px] border border-white/[0.08] bg-[#151A24] shadow-[0_18px_60px_rgba(0,0,0,0.28)]";

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-[#F0B90B]" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-[#C0C0C0]" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-[#CD7F32]" />;
  return null;
}

function SummaryTile({
  label,
  value,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7E899B]">{label}</p>
      <p className={`mt-3 text-2xl font-display font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function LeaderRow({
  entry,
  isYou,
  youLabel,
  notEligibleLabel,
  rowRef,
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
  youLabel: string;
  notEligibleLabel: string;
  rowRef?: React.Ref<HTMLDivElement>;
}) {
  const tierColor = TIER_COLORS[entry.rankTier] ?? "#5E6673";
  const tierInfo = RANK_TIERS.find((item) => item.tier === entry.rankTier);
  const pnlUp = entry.pnlPct >= 0;

  return (
    <div
      ref={rowRef}
      className={`rounded-2xl border p-4 transition-all ${
        isYou
          ? "border-[#F0B90B]/30 bg-[#F0B90B]/8"
          : "border-white/[0.08] bg-black/20"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-w-[58px] items-center gap-1 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#D1D4DC]">
              {getRankIcon(entry.rank) ?? `#${entry.rank}`}
            </span>
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{ color: tierColor, backgroundColor: `${tierColor}1a` }}
            >
              {tierInfo?.icon ?? ""} {tierInfo?.label ?? entry.rankTier}
            </span>
            {isYou ? (
              <span className="inline-flex rounded-full bg-[#F0B90B]/12 px-3 py-1 text-xs font-semibold text-[#F0B90B]">
                {youLabel}
              </span>
            ) : null}
            {!entry.prizeEligible ? (
              <span className="inline-flex rounded-full bg-[#F6465D]/12 px-3 py-1 text-xs font-semibold text-[#F6465D]">
                {notEligibleLabel}
              </span>
            ) : null}
          </div>
          <p className={`mt-3 truncate text-lg font-display font-bold ${isYou ? "text-[#F0B90B]" : "text-white"}`}>
            {entry.username}
          </p>
          <p className="mt-1 text-sm text-[#8E98A8]">
            wPnL {entry.weightedPnl >= 0 ? "+" : ""}
            {entry.weightedPnl.toFixed(1)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 md:min-w-[300px]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">PnL%</p>
            <p className={`mt-2 font-mono text-lg font-semibold ${pnlUp ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
              {pnlUp ? "+" : ""}
              {entry.pnlPct.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">Points</p>
            <p className="mt-2 font-mono text-lg font-semibold text-[#F0B90B]">{entry.matchPoints}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">Prize</p>
            <p className="mt-2 font-mono text-lg font-semibold text-white">
              {entry.prizeAmount > 0 ? `${entry.prizeAmount}U` : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { username } = useAuth();
  const { t, lang } = useT();
  const [tab, setTab] = useState<TabKey>("current");
  const [selectorOpen, setSelectorOpen] = useState(false);

  const { data: compsData, isLoading: compsLoading, error: compsError } = useCompetitions();
  const allComps = (compsData as { items?: CompetitionSummary[] } | undefined)?.items ?? [];

  // Find live competitions (may be multiple)
  const liveComps = useMemo(
    () => allComps.filter((item) => item.status === "live" || item.status === "settling"),
    [allComps],
  );

  // Find last completed competition as fallback
  const lastCompleted = useMemo(
    () =>
      allComps
        .filter((item) => item.status === "completed" || item.status === "ended_early")
        .sort((a, b) => b.endTime - a.endTime)[0] ?? null,
    [allComps],
  );

  // Selected competition: default to first live, or fallback to last completed
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const activeComp = useMemo(() => {
    if (selectedSlug) {
      return allComps.find((c) => c.slug === selectedSlug) ?? liveComps[0] ?? lastCompleted;
    }
    return liveComps[0] ?? lastCompleted;
  }, [selectedSlug, allComps, liveComps, lastCompleted]);

  const isLive = activeComp ? (activeComp.status === "live" || activeComp.status === "settling") : false;
  const hasMultipleOptions = liveComps.length > 1 || (liveComps.length >= 1 && lastCompleted);

  // Selectable competitions for the dropdown
  const selectableComps = useMemo(() => {
    const comps: CompetitionSummary[] = [...liveComps];
    if (lastCompleted && !liveComps.find((c) => c.id === lastCompleted.id)) {
      comps.push(lastCompleted);
    }
    return comps;
  }, [liveComps, lastCompleted]);

  const { data: leaderboardData = [], isLoading: lbLoading } = useCompetitionLeaderboard(
    activeComp?.slug ?? "",
    tab === "current" && !!activeComp,
  );

  const leaderboard = leaderboardData as LeaderboardEntry[];
  const loading = tab === "current" && (compsLoading || lbLoading);
  const error = compsError ? (compsError as Error).message ?? t("common.loadFailed") : null;
  const myEntry = leaderboard.find((entry) => entry.username === username || !!entry.isYou);
  const myRowRef = useRef<HTMLDivElement>(null);

  const scrollToMe = useCallback(() => {
    myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    myRowRef.current?.classList.add("ring-2", "ring-[#F0B90B]");
    setTimeout(() => myRowRef.current?.classList.remove("ring-2", "ring-[#F0B90B]"), 2000);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className={`${PAGE_CLASS} p-6 md:p-7`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#F0B90B]">
              {lang === "zh" ? "排行榜" : "Leaderboard"}
            </p>
            <h1 className="mt-3 text-3xl font-display font-bold text-white">{t("lbpage.title")}</h1>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5">
            <button
              onClick={() => setTab("current")}
              className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition-colors ${
                tab === "current" ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#9CA6B7] hover:text-white"
              }`}
            >
              {t("lbpage.currentTab")}
            </button>
            <button
              onClick={() => setTab("season")}
              className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition-colors ${
                tab === "season" ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#9CA6B7] hover:text-white"
              }`}
            >
              {t("lbpage.seasonTab")}
            </button>
          </div>
        </div>
      </section>

      {tab === "current" ? (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
          </div>
        ) : error ? (
          <div className={`${PAGE_CLASS} p-8 text-center`}>
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#F6465D]" />
            <p className="text-sm text-[#D1D4DC]">{error}</p>
          </div>
        ) : !activeComp ? (
          <div className={`${PAGE_CLASS} p-8 text-center`}>
            <Trophy className="mx-auto mb-3 h-8 w-8 text-[#848E9C]" />
            <p className="text-sm font-semibold text-[#D1D4DC]">{t("lbpage.noLive")}</p>
            <p className="mt-2 text-xs text-[#848E9C]">{t("lbpage.noLiveHint")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className={`${PAGE_CLASS} p-6`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#0ECB81]/12 px-3 py-1 text-xs font-semibold text-[#0ECB81]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                        LIVE
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#848E9C]/12 px-3 py-1 text-xs font-semibold text-[#848E9C]">
                        {lang === "zh" ? "已结束" : "Completed"}
                      </div>
                    )}
                    {!isLive && (
                      <span className="text-xs text-[#8E98A8]">
                        {lang === "zh" ? "（最近一场比赛的最终排名）" : "(Final standings from last match)"}
                      </span>
                    )}
                  </div>

                  {/* Competition selector */}
                  {hasMultipleOptions ? (
                    <div className="relative mt-4">
                      <button
                        onClick={() => setSelectorOpen(!selectorOpen)}
                        className="inline-flex items-center gap-2 text-2xl font-display font-bold text-white hover:text-[#F0B90B] transition-colors"
                      >
                        {activeComp.title}
                        <ChevronDown className={`h-5 w-5 transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
                      </button>
                      {selectorOpen && (
                        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-2xl border border-white/[0.08] bg-[#1C2030] p-2 shadow-xl">
                          {selectableComps.map((comp) => {
                            const isActive = comp.slug === activeComp.slug;
                            const compIsLive = comp.status === "live" || comp.status === "settling";
                            return (
                              <button
                                key={comp.slug}
                                onClick={() => {
                                  setSelectedSlug(comp.slug);
                                  setSelectorOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                  isActive ? "bg-[#F0B90B]/10" : "hover:bg-white/[0.04]"
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${compIsLive ? "bg-[#0ECB81] animate-pulse" : "bg-[#848E9C]"}`} />
                                <div className="min-w-0 flex-1">
                                  <p className={`truncate text-sm font-semibold ${isActive ? "text-[#F0B90B]" : "text-white"}`}>
                                    {comp.title}
                                  </p>
                                  <p className="text-xs text-[#8E98A8]">
                                    {comp.symbol} · {comp.registeredCount} {lang === "zh" ? "人" : "players"}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <h2 className="mt-4 text-2xl font-display font-bold text-white">{activeComp.title}</h2>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={
                      isLive
                        ? activeComp.participantMode === "agent"
                          ? `/watch/${activeComp.slug}`
                          : `/competitions/${activeComp.slug}`
                        : `/results/${activeComp.id}`
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-4 py-2.5 text-sm font-semibold text-[#0B0E11] hover:bg-[#F0B90B]/90"
                  >
                    {isLive
                      ? lang === "zh" ? "查看比赛" : "Open match"
                      : lang === "zh" ? "查看结果" : "View results"}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile
                  label={lang === "zh" ? "参赛人数" : "Participants"}
                  value={String(activeComp.acceptedCount || activeComp.registeredCount)}
                />
                <SummaryTile
                  label={lang === "zh" ? "奖金池" : "Prize pool"}
                  value={`${activeComp.prizePool}U`}
                  toneClass="text-[#F0B90B]"
                />
                <SummaryTile
                  label={lang === "zh" ? "交易对" : "Trading pair"}
                  value={activeComp.symbol}
                />
                <SummaryTile
                  label={lang === "zh" ? "我的当前名次" : "Your rank"}
                  value={myEntry ? `#${myEntry.rank}` : "--"}
                  toneClass={myEntry ? "text-[#0ECB81]" : "text-white"}
                />
              </div>
            </section>

            <section className={`${PAGE_CLASS} p-6`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                    {lang === "zh" ? "完整榜单" : "Full standings"}
                  </p>
                  <h2 className="mt-2 text-xl font-display font-bold text-white">
                    {isLive
                      ? lang === "zh" ? "实时排名" : "Live standings"
                      : lang === "zh" ? "最终排名" : "Final standings"}
                  </h2>
                </div>
                {myEntry && (
                  <button
                    onClick={scrollToMe}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0B90B]/25 bg-[#F0B90B]/10 px-3 py-2 text-[12px] font-medium text-[#F0B90B] transition-colors hover:bg-[#F0B90B]/15"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {lang === "zh" ? `跳转到我 (#${myEntry.rank})` : `Jump to me (#${myEntry.rank})`}
                  </button>
                )}
              </div>

              {leaderboard.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-10 text-center text-sm text-[#848E9C]">
                  {t("lbpage.noData")}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {leaderboard.map((entry) => {
                    const isMe = entry.username === username || !!entry.isYou;
                    return (
                      <LeaderRow
                        key={entry.rank}
                        entry={entry}
                        isYou={isMe}
                        youLabel={t("lbpage.you")}
                        notEligibleLabel={t("lbpage.notEligible")}
                        rowRef={isMe ? myRowRef : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )
      ) : (
        /* Season tab — Coming soon with better messaging */
        <section className={`${PAGE_CLASS} p-8 text-center`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/8">
            <Trophy className="h-7 w-7 text-[#F0B90B]" />
          </div>
          <h2 className="mt-5 text-xl font-display font-bold text-white">{t("lbpage.seasonTitle")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#8E98A8]">
            {lang === "zh"
              ? "赛季积分排名正在开发中。每场比赛的积分将累计到赛季总分，赛季结束时根据总积分发放额外奖励。"
              : "Season rankings are under development. Points from each match will accumulate into a season total, with bonus rewards distributed at the end of each season."}
          </p>
          <div className="mt-6">
            <Link
              href="/competitions"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-2.5 text-sm font-semibold text-[#0B0E11] hover:bg-[#F0B90B]/90"
            >
              {lang === "zh" ? "查看当前比赛" : "Browse competitions"}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
