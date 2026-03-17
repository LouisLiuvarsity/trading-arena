import { useState } from "react";
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
  Crown,
  Loader2,
  Medal,
  Star,
  Trophy,
  Users,
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
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
  youLabel: string;
  notEligibleLabel: string;
}) {
  const tierColor = TIER_COLORS[entry.rankTier] ?? "#5E6673";
  const tierInfo = RANK_TIERS.find((item) => item.tier === entry.rankTier);
  const pnlUp = entry.pnlPct >= 0;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
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

  const { data: compsData, isLoading: compsLoading, error: compsError } = useCompetitions();
  const liveComp =
    ((compsData as { items?: CompetitionSummary[] } | undefined)?.items ?? []).find(
      (item) => item.status === "live" || item.status === "settling",
    ) ?? null;

  const { data: leaderboardData = [], isLoading: lbLoading } = useCompetitionLeaderboard(
    liveComp?.slug ?? "",
    tab === "current" && !!liveComp,
  );

  const leaderboard = leaderboardData as LeaderboardEntry[];
  const loading = tab === "current" && (compsLoading || lbLoading);
  const error = compsError ? (compsError as Error).message ?? t("common.loadFailed") : null;
  const topThree = leaderboard.slice(0, 3);
  const myEntry = leaderboard.find((entry) => entry.username === username || !!entry.isYou);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className={`${PAGE_CLASS} p-6 md:p-7`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#F0B90B]">
              {lang === "zh" ? "排行榜" : "Leaderboard"}
            </p>
            <h1 className="mt-3 text-3xl font-display font-bold text-white">{t("lbpage.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#8E98A8]">
              {lang === "zh"
                ? "把当前直播榜和赛季榜分开，先看正在打的比赛，再看长期成绩。"
                : "Current live standings and season standings stay separate, so the active match is always the first thing you see."}
            </p>
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
        ) : !liveComp ? (
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
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0ECB81]/12 px-3 py-1 text-xs font-semibold text-[#0ECB81]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                    LIVE
                  </div>
                  <h2 className="mt-4 text-2xl font-display font-bold text-white">{liveComp.title}</h2>
                  <p className="mt-2 text-sm text-[#8E98A8]">
                    {liveComp.participantMode === "agent"
                      ? lang === "zh"
                        ? "Agent vs Agent 只读观战榜单"
                        : "Read-only Agent vs Agent spectator standings"
                      : lang === "zh"
                        ? "Human vs Human 实时比赛榜单"
                        : "Live Human vs Human competition standings"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={liveComp.participantMode === "agent" ? `/watch/${liveComp.slug}` : `/competitions/${liveComp.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-4 py-2.5 text-sm font-semibold text-[#0B0E11] hover:bg-[#F0B90B]/90"
                  >
                    {lang === "zh" ? "查看比赛" : "Open match"}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile
                  label={lang === "zh" ? "参赛人数" : "Accepted"}
                  value={String(liveComp.acceptedCount)}
                />
                <SummaryTile
                  label={lang === "zh" ? "奖金池" : "Prize pool"}
                  value={`${liveComp.prizePool}U`}
                  toneClass="text-[#F0B90B]"
                />
                <SummaryTile
                  label={lang === "zh" ? "交易对" : "Trading pair"}
                  value={liveComp.symbol}
                />
                <SummaryTile
                  label={lang === "zh" ? "我的当前名次" : "Your live rank"}
                  value={myEntry ? `#${myEntry.rank}` : "--"}
                  toneClass={myEntry ? "text-[#0ECB81]" : "text-white"}
                />
              </div>
            </section>

            {topThree.length > 0 ? (
              <section className={`${PAGE_CLASS} p-6`}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                      {lang === "zh" ? "领先选手" : "Top performers"}
                    </p>
                    <h2 className="mt-2 text-xl font-display font-bold text-white">
                      {lang === "zh" ? "先看前三名" : "Start with the podium"}
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {topThree.map((entry) => {
                    const tierInfo = RANK_TIERS.find((item) => item.tier === entry.rankTier);
                    const tierColor = TIER_COLORS[entry.rankTier] ?? "#5E6673";
                    return (
                      <div
                        key={entry.rank}
                        className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#D1D4DC]">
                            {getRankIcon(entry.rank) ?? `#${entry.rank}`}
                          </span>
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                            style={{ color: tierColor, backgroundColor: `${tierColor}1a` }}
                          >
                            {tierInfo?.icon ?? ""} {tierInfo?.label ?? entry.rankTier}
                          </span>
                        </div>
                        <p className="mt-4 truncate text-lg font-display font-bold text-white">{entry.username}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">PnL%</p>
                            <p className={`mt-2 font-mono font-semibold ${entry.pnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                              {entry.pnlPct >= 0 ? "+" : ""}
                              {entry.pnlPct.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">Points</p>
                            <p className="mt-2 font-mono font-semibold text-[#F0B90B]">{entry.matchPoints}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className={`${PAGE_CLASS} p-6`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                    {lang === "zh" ? "完整榜单" : "Full standings"}
                  </p>
                  <h2 className="mt-2 text-xl font-display font-bold text-white">
                    {lang === "zh" ? "按人查看，不用读表格" : "A ranking list instead of a dense table"}
                  </h2>
                </div>
                <p className="text-sm text-[#8E98A8]">
                  {lang === "zh"
                    ? "每行只保留用户名、收益、积分和奖金，方便快速扫榜。"
                    : "Each row keeps only the name, PnL, points, and prize for faster scanning."}
                </p>
              </div>

              {leaderboard.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-10 text-center text-sm text-[#848E9C]">
                  {t("lbpage.noData")}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {leaderboard.map((entry) => (
                    <LeaderRow
                      key={entry.rank}
                      entry={entry}
                      isYou={entry.username === username || !!entry.isYou}
                      youLabel={t("lbpage.you")}
                      notEligibleLabel={t("lbpage.notEligible")}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )
      ) : (
        <section className={`${PAGE_CLASS} p-8 text-center`}>
          <Star className="mx-auto h-8 w-8 text-[#848E9C]" />
          <h2 className="mt-4 text-xl font-display font-bold text-white">{t("lbpage.seasonTitle")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#8E98A8]">{t("lbpage.seasonComingSoon")}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/competitions"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-[#D1D4DC] hover:bg-white/[0.04]"
            >
              <Users className="h-4 w-4" />
              {lang === "zh" ? "查看当前比赛" : "See current competitions"}
            </Link>
            <Link
              href="/stats"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-4 py-2 text-sm font-semibold text-[#0B0E11] hover:bg-[#F0B90B]/90"
            >
              {lang === "zh" ? "查看总体数据" : "Open overall stats"}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
