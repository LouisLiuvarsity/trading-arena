import { type ReactNode, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { useMatchHistory, useProfile, useAnalytics, useAchievementsQuery, useSaveProfile } from "@/hooks/useCompetitionData";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { useSearch } from "wouter";
import {
  Award,
  BarChart3,
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trophy,
  User,
  Wallet,
  Clock,
  Check,
  Inbox,
  Target,
} from "lucide-react";
import { getRankTier } from "@/lib/types";
import { ACHIEVEMENT_CATALOG, type AchievementDef } from "@shared/achievements";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, Legend,
} from "recharts";
import { toast } from "sonner";
import type { MatchResultSummary } from "@shared/competitionTypes";

// ─── Types ──────────────────────────────────────────────────
interface ProfileData {
  arenaAccountId: number;
  username: string;
  seasonPoints: number;
  capital: number;
  displayName: string | null;
  bio: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  institutionName: string | null;
  institutionId: number | null;
  department: string | null;
  graduationYear: number | null;
  participantType: string;
  walletAddress: string | null;
  walletNetwork: string | null;
}

interface MatchResult {
  id: number;
  competitionId: number;
  competitionNumber?: number;
  competitionTitle?: string;
  finalRank: number;
  participantCount?: number;
  totalPnl: number;
  totalPnlPct: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  pointsEarned: number;
  prizeWon: number;
  avgHoldDuration: number | null;
  createdAt: number;
  trades?: TradeDetail[];
}

interface TradeDetail {
  id: string;
  tradeNumber: number;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  holdDuration: number;
  closeReason: "tp" | "sl" | "manual" | "match_end" | "time_limit";
}

interface AnalyticsData {
  summary: { totalTrades: number; winRate: number; avgPnlPerTrade: number; avgHoldDuration: number; avgHoldWeight: number; profitFactor: number };
  pnlDistribution: Array<{ bucket: string; count: number; avgPnl: number }>;
  byDirection: { long: DirStats; short: DirStats };
  byCloseReason: Record<string, { count: number; avgPnl: number }>;
  holdDurationVsPnl: Array<{ holdSeconds: number; pnlPct: number; holdWeight: number; direction: string }>;
  equityCurve: Array<{ tradeIndex: number; equity: number; timestamp: number }>;
  streaks: { currentStreak: number; longestWinStreak: number; longestLossStreak: number };
  byHour: Array<{ hour: number; count: number; avgPnl: number; winRate: number }>;
}

interface DirStats {
  count: number; wins: number; losses: number; totalPnl: number; avgPnl: number; avgHoldDuration: number;
}

interface UserAchievement {
  achievementKey: string;
  unlockedAt: number;
  competitionId: number | null;
}

interface Institution {
  id: number;
  name: string;
  nameEn: string | null;
  shortName: string | null;
  type: string;
  country: string;
  region: string | null;
  city: string | null;
}

// ─── Constants ──────────────────────────────────────────────
const PAGE_CLASS = "rounded-2xl border border-white/[0.08] bg-[#151A24]";
const CHART_COLORS = { green: "#0ECB81", red: "#F6465D", gold: "#F0B90B", purple: "#8B5CF6", blue: "#3B82F6" };
const PIE_COLORS = ["#0ECB81", "#F6465D", "#F0B90B", "#8B5CF6", "#3B82F6"];
const TOOLTIP_STYLE = { background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#D1D4DC" };

const COUNTRIES = [
  { code: "CN" }, { code: "US" }, { code: "JP" }, { code: "KR" },
  { code: "HK" }, { code: "TW" }, { code: "SG" }, { code: "GB" },
  { code: "DE" }, { code: "FR" }, { code: "CA" }, { code: "AU" },
];
const PARTICIPANT_TYPES = [
  { value: "student" }, { value: "professional" }, { value: "independent" },
];
const WALLET_NETWORKS = [
  { value: "base", label: "Base" },
  { value: "eth", label: "Ethereum (ERC-20)" },
  { value: "sol", label: "Solana" },
  { value: "bnb", label: "BNB Smart Chain (BEP-20)" },
  { value: "trx", label: "Tron (TRC-20)" },
];
const CATEGORY_ORDER = ["trading", "ranking", "tier", "milestone", "special"];

type TabId = "overview" | "history" | "analytics" | "achievements" | "settings";

// ─── Helpers ────────────────────────────────────────────────
function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset);
}

function formatDate(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(ts);
}

function formatDuration(seconds: number): string {
  if (!seconds) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h${rem > 0 ? `${rem}m` : ""}`;
}

function formatSigned(value: number, digits = 0): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatPnl(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function pnlColor(pct: number): string {
  return pct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]";
}

function pnlBgColor(pct: number): string {
  return pct >= 0 ? "bg-[#0ECB81]/10" : "bg-[#F6465D]/10";
}

function formatHoldTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatDateShort(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ─── Shared Sub-Components ──────────────────────────────────
function InsightCard({ label, value, hint, toneClass = "text-white" }: {
  label: string; value: string; hint?: string; toneClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7E899B]">{label}</p>
      <p className={`mt-2 text-xl font-display font-bold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1.5 text-[11px] text-[#8E98A8]">{hint}</p> : null}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-center">
      <div className="text-[#848E9C] text-[10px] mb-0.5">{label}</div>
      <div className="text-white font-mono text-sm font-bold">{value}</div>
      {sub && <div className="text-[#848E9C] text-[9px] mt-0.5">{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 1: Overview
// ═══════════════════════════════════════════════════════════
function OverviewTab({ profile, history, locale, t, lang }: {
  profile: ProfileData;
  history: MatchResult[];
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
}) {
  const p = profile;
  const tier = getRankTier(p.seasonPoints);
  const totalPnl = history.reduce((sum, item) => sum + item.totalPnl, 0);
  const totalWins = history.reduce((sum, item) => sum + (item.winCount ?? 0), 0);
  const totalLosses = history.reduce((sum, item) => sum + (item.lossCount ?? 0), 0);
  const winRate = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0;
  const totalPrize = history.reduce((sum, item) => sum + (item.prizeWon ?? 0), 0);
  const bestRank = history.length > 0 ? Math.min(...history.map((item) => item.finalRank)) : null;
  const avgHoldDuration = history.length > 0
    ? history.reduce((sum, item) => sum + (item.avgHoldDuration ?? 0), 0) / history.length
    : 0;

  const locationParts: string[] = [];
  if (p.country) locationParts.push(t(`profileEdit.country.${p.country}`));
  if (p.region) locationParts.push(p.region);
  if (p.city) locationParts.push(p.city);

  const institutionParts: string[] = [];
  if (p.institutionName) institutionParts.push(p.institutionName);
  if (p.department) institutionParts.push(p.department);

  const participantLabel = lang === "zh" ? "Human 账号" : "Human account";

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: `${tier.color}33`, color: tier.color, backgroundColor: `${tier.color}14` }}
            >
              <span>{tier.icon}</span>
              {tier.label}
            </span>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D1D4DC]">
              {participantLabel}
            </span>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D1D4DC]">
              {Math.round(p.seasonPoints)} pts
            </span>
          </div>

          {locationParts.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-[#D1D4DC]">
              <MapPin className="h-4 w-4 text-[#7E899B]" />
              <span>{countryFlag(p.country)} {locationParts.join(" · ")}</span>
            </div>
          )}

          {institutionParts.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[#D1D4DC]">
              <Shield className="h-4 w-4 text-[#7E899B]" />
              <span>{institutionParts.join(" · ")}</span>
            </div>
          )}

          {p.bio && <p className="mt-4 max-w-2xl text-sm leading-6 text-[#8E98A8]">{p.bio}</p>}
        </div>

        <div className="grid gap-3 grid-cols-2">
          <InsightCard
            label={lang === "zh" ? "赛季积分" : "Season points"}
            value={`${Math.round(p.seasonPoints)}`}
            hint={`${tier.icon} ${tier.label}`}
            toneClass="text-[#F0B90B]"
          />
          <InsightCard
            label={lang === "zh" ? "账户资金" : "Capital"}
            value={`${p.capital.toFixed(0)}U`}
            toneClass="text-[#0ECB81]"
          />
          <InsightCard
            label={t("profile.winRate")}
            value={`${winRate.toFixed(1)}%`}
            hint={`${totalWins}W-${totalLosses}L`}
            toneClass="text-[#0ECB81]"
          />
          <InsightCard
            label={lang === "zh" ? "累计奖金" : "Prize won"}
            value={`${totalPrize.toFixed(0)}U`}
            hint={bestRank ? `Best #${bestRank}` : undefined}
            toneClass="text-white"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className={`${PAGE_CLASS} p-5`}>
        <h3 className="text-sm font-semibold text-[#D1D4DC] mb-4">
          {lang === "zh" ? "关键指标" : "Key Numbers"}
        </h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <InsightCard
            label={t("profile.totalPnl")}
            value={formatSigned(totalPnl, 0)}
            toneClass={totalPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
          />
          <InsightCard
            label={t("profile.avgHold")}
            value={formatDuration(avgHoldDuration)}
          />
          <InsightCard
            label={t("profile.best")}
            value={bestRank ? `#${bestRank}` : "--"}
            toneClass="text-[#F0B90B]"
          />
          <InsightCard
            label={lang === "zh" ? "杠杆上限" : "Max Leverage"}
            value={`${tier.leverage}x`}
          />
        </div>
      </div>

      {/* Recent Results (compact, max 3) */}
      <div className={`${PAGE_CLASS} p-5`}>
        <h3 className="text-sm font-semibold text-[#D1D4DC] mb-4">
          {lang === "zh" ? "最近比赛" : "Recent Matches"}
        </h3>
        {history.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#848E9C]">{t("profile.noRecords")}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.slice(0, 3).map((match) => {
              const pnlUp = match.totalPnl >= 0;
              return (
                <div key={match.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-[#D1D4DC] shrink-0">
                      #{match.competitionId}
                    </span>
                    <span className="rounded-full bg-[#F0B90B]/12 px-2 py-0.5 text-[10px] font-semibold text-[#F0B90B] shrink-0">
                      #{match.finalRank}
                    </span>
                    <span className="text-[11px] text-[#848E9C] truncate">
                      {match.tradesCount} {lang === "zh" ? "笔" : "trades"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-mono font-semibold ${pnlUp ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                      {formatSigned(match.totalPnlPct, 1)}%
                    </span>
                    <span className="text-[10px] text-[#848E9C]">{formatDate(match.createdAt, locale)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 2: History
// ═══════════════════════════════════════════════════════════
function HistoryTab({ t, lang }: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
}) {
  const { data: historyData, isLoading: loading, error: queryError, refetch } = useMatchHistory();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "profit" | "loss">("all");

  const rawResults = (historyData as any)?.results ?? historyData ?? [];
  const allMatches: MatchResult[] = [...rawResults].sort((a: MatchResult, b: MatchResult) => b.createdAt - a.createdAt);

  const matches = useMemo(() => {
    if (filter === "profit") return allMatches.filter(m => m.totalPnlPct > 0);
    if (filter === "loss") return allMatches.filter(m => m.totalPnlPct <= 0);
    return allMatches;
  }, [allMatches, filter]);

  const error = queryError ? (queryError as Error).message ?? t("common.loadFailed") : null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const toggleExpand = useCallback((competitionId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(competitionId) ? next.delete(competitionId) : next.add(competitionId);
      return next;
    });
  }, []);

  const CLOSE_REASON_ICONS: Record<string, { icon: string; label: string }> = {
    tp: { icon: "🎯", label: "TP" },
    sl: { icon: "🛑", label: "SL" },
    manual: { icon: "✋", label: lang === "zh" ? "手动" : "Manual" },
    match_end: { icon: "⏰", label: lang === "zh" ? "比赛结束" : "Match End" },
    time_limit: { icon: "⏰", label: lang === "zh" ? "超时" : "Timeout" },
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1C2030] border border-[#F6465D]/20 rounded-xl p-6 text-center">
        <p className="text-[#F6465D] text-sm mb-2">{error}</p>
        <button onClick={handleRefresh} className="text-[#848E9C] hover:text-[#D1D4DC] text-xs underline">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  // Summary stats
  const totalMatches = allMatches.length;
  const totalPrize = allMatches.reduce((s, m) => s + (m.prizeWon ?? 0), 0);
  const totalPoints = allMatches.reduce((s, m) => s + (m.pointsEarned ?? 0), 0);
  const avgPnl = totalMatches > 0 ? allMatches.reduce((s, m) => s + m.totalPnlPct, 0) / totalMatches : 0;
  const bestRank = totalMatches > 0 ? Math.min(...allMatches.map((m) => m.finalRank)) : 0;
  const winCount = allMatches.filter((m) => m.totalPnlPct > 0).length;
  const winRate = totalMatches > 0 ? (winCount / totalMatches) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header with filter + refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(["all", "profit", "loss"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                filter === f
                  ? "bg-[#F0B90B]/10 text-[#F0B90B] border border-[#F0B90B]/25"
                  : "text-[#848E9C] border border-white/[0.06] hover:bg-white/[0.03]"
              }`}
            >
              {f === "all" ? (lang === "zh" ? "全部" : "All") :
               f === "profit" ? (lang === "zh" ? "盈利" : "Profit") :
               (lang === "zh" ? "亏损" : "Loss")}
              {f === "all" && ` (${totalMatches})`}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-1 text-[11px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {lang === "zh" ? "刷新" : "Refresh"}
        </button>
      </div>

      {/* Summary stats */}
      {totalMatches > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: lang === "zh" ? "总场次" : "Matches", value: String(totalMatches), color: "text-[#D1D4DC]" },
            { label: lang === "zh" ? "总奖金" : "Prize", value: `${totalPrize}U`, color: totalPrize > 0 ? "text-[#F0B90B]" : "text-[#848E9C]" },
            { label: lang === "zh" ? "总积分" : "Points", value: `+${totalPoints}`, color: "text-[#F0B90B]" },
            { label: lang === "zh" ? "均收益" : "Avg PnL", value: formatPnl(avgPnl), color: pnlColor(avgPnl) },
            { label: lang === "zh" ? "最佳" : "Best", value: `#${bestRank}`, color: "text-[#D1D4DC]" },
            { label: lang === "zh" ? "胜率" : "Win Rate", value: `${winRate.toFixed(0)}%`, color: "text-[#D1D4DC]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-lg p-2.5 text-center">
              <p className="text-[9px] text-[#848E9C] uppercase mb-0.5">{label}</p>
              <p className={`text-sm font-mono font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Match list */}
      {matches.length === 0 ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-10 text-center">
          <Inbox className="w-10 h-10 text-[#5E6673] mx-auto mb-3" />
          <p className="text-[#848E9C] text-sm font-display font-bold mb-1">
            {filter !== "all" ? (lang === "zh" ? "没有符合筛选条件的比赛" : "No matches match the filter") : t("profile.noRecords")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const isExpanded = expandedIds.has(match.competitionId);
            const wr = match.tradesCount > 0 ? ((match.winCount / match.tradesCount) * 100).toFixed(1) : "0.0";
            return (
              <motion.div
                key={match.competitionId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-[#848E9C] bg-white/5 px-2 py-0.5 rounded">
                        #{match.competitionNumber ?? match.competitionId}
                      </span>
                      <span className="text-[11px] text-[#D1D4DC] font-mono">
                        Rank <span className="font-bold">#{match.finalRank}</span>
                        {match.participantCount && <span className="text-[#848E9C]">/{match.participantCount}</span>}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5E6673] ml-auto shrink-0">
                      {formatDateShort(match.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-[11px]">
                    <span className={`font-mono font-bold ${pnlColor(match.totalPnlPct)} ${pnlBgColor(match.totalPnlPct)} px-2 py-0.5 rounded`}>
                      {formatPnl(match.totalPnlPct)}
                    </span>
                    {match.pointsEarned > 0 && (
                      <span className="font-mono text-[#F0B90B] flex items-center gap-0.5">
                        <Target className="w-3 h-3" />+{match.pointsEarned}pts
                      </span>
                    )}
                    {match.prizeWon > 0 && (
                      <span className="font-mono text-[#F0B90B] font-semibold flex items-center gap-0.5">
                        <Trophy className="w-3 h-3" />{match.prizeWon}U
                      </span>
                    )}
                    <span className="text-[#848E9C] font-mono">{match.tradesCount} {lang === "zh" ? "笔" : "trades"}</span>
                    <span className="text-[#848E9C] font-mono">WR {wr}%</span>
                  </div>
                </div>

                <button
                  onClick={() => toggleExpand(match.competitionId)}
                  className="w-full flex items-center justify-center gap-1 px-4 py-2 border-t border-[rgba(255,255,255,0.05)] text-[10px] text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.02] transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {isExpanded ? (lang === "zh" ? "收起详情" : "Collapse") : (lang === "zh" ? "展开交易详情" : "Expand trades")}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-1.5">
                        {match.trades && match.trades.length > 0 ? (
                          match.trades.map((trade) => {
                            const closeInfo = CLOSE_REASON_ICONS[trade.closeReason] ?? CLOSE_REASON_ICONS.manual;
                            return (
                              <div key={trade.id} className="flex items-center gap-2 px-3 py-2 text-[11px] font-mono bg-[#0B0E11] rounded-lg">
                                <span className="text-[#5E6673] w-6 shrink-0">#{trade.tradeNumber}</span>
                                <span className={`w-12 shrink-0 font-semibold ${trade.direction === "long" ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                                  {trade.direction === "long" ? "LONG" : "SHORT"}
                                </span>
                                <span className="text-[#D1D4DC] shrink-0">
                                  {trade.entryPrice.toFixed(2)} → {trade.exitPrice.toFixed(2)}
                                </span>
                                <span className={`font-semibold shrink-0 ${pnlColor(trade.pnlPct)}`}>{formatPnl(trade.pnlPct)}</span>
                                <span className="text-[#848E9C] shrink-0">{formatHoldTime(trade.holdDuration)}</span>
                                <span className="ml-auto shrink-0" title={closeInfo.label}>
                                  {closeInfo.icon} <span className="text-[#848E9C] text-[9px]">{closeInfo.label}</span>
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-4 text-[#5E6673] text-[11px]">
                            {lang === "zh" ? "暂无交易详情" : "No trade details available"}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 3: Analytics
// ═══════════════════════════════════════════════════════════
function AnalyticsTab({ t, lang }: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
}) {
  const { data, isLoading: loading, error } = useAnalytics();

  const CLOSE_REASON_LABELS: Record<string, string> = {
    manual: t("analytics.closeManual"),
    tp: t("analytics.closeTp"),
    sl: t("analytics.closeSl"),
    match_end: t("analytics.closeEnd"),
    time_limit: t("analytics.closeTimeout"),
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <p className="text-[#F6465D] text-sm">{(error as Error)?.message ?? t("analytics.noData")}</p>
      </div>
    );
  }

  const d = data as AnalyticsData;

  if (d.summary.totalTrades === 0) {
    return (
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
        <p className="text-[#848E9C] text-sm">{t("analytics.empty")}</p>
        <p className="text-[#5E6673] text-xs mt-1">{t("analytics.emptyHint")}</p>
      </div>
    );
  }

  const { summary, pnlDistribution, byDirection, byCloseReason, equityCurve, streaks, byHour, holdDurationVsPnl } = d;
  const closeReasonPieData = Object.entries(byCloseReason).map(([key, val]) => ({
    name: CLOSE_REASON_LABELS[key] ?? key,
    value: val.count,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label={t("analytics.totalTrades")} value={summary.totalTrades} />
        <StatCard label={t("analytics.winRate")} value={`${summary.winRate}%`} />
        <StatCard label={t("analytics.avgPnl")} value={`${summary.avgPnlPerTrade > 0 ? "+" : ""}${summary.avgPnlPerTrade}`} />
        <StatCard label={t("analytics.avgHold")} value={`${Math.round(summary.avgHoldDuration / 60)}min`} />
        <StatCard label={t("analytics.avgWeight")} value={`${summary.avgHoldWeight}x`} />
        <StatCard label={t("analytics.profitFactor")} value={summary.profitFactor === Infinity ? "∞" : summary.profitFactor} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("analytics.currentStreak")} value={streaks.currentStreak > 0 ? `+${streaks.currentStreak}${t("analytics.winSuffix")}` : streaks.currentStreak < 0 ? `${streaks.currentStreak}${t("analytics.lossSuffix")}` : "—"} />
        <StatCard label={t("analytics.longestWin")} value={t("analytics.streakWin", { n: streaks.longestWinStreak })} />
        <StatCard label={t("analytics.longestLoss")} value={t("analytics.streakLoss", { n: streaks.longestLossStreak })} />
      </div>

      {equityCurve.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t("analytics.equityCurve")}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="tradeIndex" tick={{ fill: "#848E9C", fontSize: 10 }} />
              <YAxis tick={{ fill: "#848E9C", fontSize: 10 }} domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="equity" stroke={CHART_COLORS.gold} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t("analytics.pnlDist")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pnlDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="bucket" tick={{ fill: "#848E9C", fontSize: 9 }} />
              <YAxis tick={{ fill: "#848E9C", fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t("analytics.dirAnalysis")}</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-[#0ECB81]">LONG ({byDirection.long.count})</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#0ECB81] rounded-full" style={{ width: `${summary.totalTrades ? (byDirection.long.count / summary.totalTrades) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-[#F6465D]">SHORT ({byDirection.short.count})</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#F6465D] rounded-full" style={{ width: `${summary.totalTrades ? (byDirection.short.count / summary.totalTrades) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="text-center">
              <div className="text-[#848E9C]">{t("analytics.longWR")}</div>
              <div className="text-[#0ECB81] font-mono font-bold">{byDirection.long.count ? Math.round((byDirection.long.wins / byDirection.long.count) * 100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">{t("analytics.shortWR")}</div>
              <div className="text-[#F6465D] font-mono font-bold">{byDirection.short.count ? Math.round((byDirection.short.wins / byDirection.short.count) * 100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">{t("analytics.longAvgPnl")}</div>
              <div className={`font-mono font-bold ${byDirection.long.avgPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{byDirection.long.avgPnl > 0 ? "+" : ""}{byDirection.long.avgPnl}</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">{t("analytics.shortAvgPnl")}</div>
              <div className={`font-mono font-bold ${byDirection.short.avgPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{byDirection.short.avgPnl > 0 ? "+" : ""}{byDirection.short.avgPnl}</div>
            </div>
          </div>
        </div>

        {closeReasonPieData.length > 0 && (
          <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t("analytics.closeReason")}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={closeReasonPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {closeReasonPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend formatter={(value) => <span className="text-[10px] text-[#848E9C]">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t("analytics.tradeHours")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: "#848E9C", fontSize: 9 }} />
              <YAxis tick={{ fill: "#848E9C", fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill={CHART_COLORS.blue} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {holdDurationVsPnl.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t("analytics.holdVsPnl")}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="holdSeconds" name={t("analytics.holdVsPnl")} tick={{ fill: "#848E9C", fontSize: 10 }} />
              <YAxis dataKey="pnlPct" name="PnL%" tick={{ fill: "#848E9C", fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Scatter data={holdDurationVsPnl.filter((d) => d.pnlPct > 0)} fill={CHART_COLORS.green} opacity={0.6} />
              <Scatter data={holdDurationVsPnl.filter((d) => d.pnlPct <= 0)} fill={CHART_COLORS.red} opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 4: Achievements
// ═══════════════════════════════════════════════════════════
function AchievementsTab({ t, lang }: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
}) {
  const { data: achievementsData, isLoading: loading } = useAchievementsQuery();

  const unlocked = new Map<string, UserAchievement>();
  if (achievementsData) {
    for (const a of achievementsData as UserAchievement[]) {
      unlocked.set(a.achievementKey, a);
    }
  }

  const unlockedCount = unlocked.size;
  const totalCount = ACHIEVEMENT_CATALOG.length;
  const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const grouped = new Map<string, AchievementDef[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const ach of ACHIEVEMENT_CATALOG) {
    const list = grouped.get(ach.category) ?? [];
    list.push(ach);
    grouped.set(ach.category, list);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    trading: t("achieve.cat.trading"),
    ranking: t("achieve.cat.ranking"),
    tier: t("achieve.cat.tier"),
    milestone: t("achieve.cat.milestone"),
    special: t("achieve.cat.special"),
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#D1D4DC] text-sm font-semibold">{t("achieve.progress")}</span>
          <span className="text-[#F0B90B] font-mono text-sm font-bold">{progress}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/60 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-[#848E9C]">
          {t("achieve.unlocked", { done: unlockedCount, total: totalCount })}
        </p>
      </div>

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const achievements = grouped.get(cat) ?? [];
        if (achievements.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-[#D1D4DC] mb-3">{CATEGORY_LABELS[cat] ?? cat}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {achievements.map((ach) => {
                const isUnlocked = unlocked.has(ach.key);
                const data = unlocked.get(ach.key);
                return (
                  <div
                    key={ach.key}
                    className={`relative rounded-xl border p-4 transition-all ${
                      isUnlocked
                        ? "bg-[#1C2030] border-[#F0B90B]/30 shadow-[0_0_12px_rgba(240,185,11,0.1)]"
                        : "bg-[#1C2030]/50 border-[rgba(255,255,255,0.06)] opacity-50"
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {isUnlocked ? ach.icon : <Lock className="w-6 h-6 text-[#5E6673]" />}
                    </div>
                    <div className={`text-xs font-semibold mb-0.5 ${isUnlocked ? "text-[#D1D4DC]" : "text-[#5E6673]"}`}>
                      {ach.name}
                    </div>
                    <div className={`text-[10px] ${isUnlocked ? "text-[#848E9C]" : "text-[#5E6673]"}`}>
                      {ach.description}
                    </div>
                    {isUnlocked && data && (
                      <div className="mt-2 text-[9px] text-[#F0B90B]">
                        {t("achieve.unlockedAt", { date: new Date(data.unlockedAt).toLocaleDateString("zh-CN") })}
                      </div>
                    )}
                    {isUnlocked && data && Date.now() - data.unlockedAt < 7 * 24 * 60 * 60 * 1000 && (
                      <span className="absolute top-2 right-2 rounded-full bg-[#F6465D] px-1.5 py-0.5 text-[8px] font-bold text-white animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 5: Settings (Profile Edit)
// ═══════════════════════════════════════════════════════════
function SettingsTab({ t, lang }: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
}) {
  const { token } = useAuth();
  const { data: profileData, isLoading: profileLoading, error: profileError } = useProfile();
  const saveProfileMutation = useSaveProfile();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [participantType, setParticipantType] = useState("independent");
  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [institutionName, setInstitutionName] = useState("");
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");

  const [instSearchQuery, setInstSearchQuery] = useState("");
  const [instSearchResults, setInstSearchResults] = useState<Institution[]>([]);
  const [instSearchOpen, setInstSearchOpen] = useState(false);
  const [instSearchLoading, setInstSearchLoading] = useState(false);
  const instSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instDropdownRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profileData && !initialized) {
      const data = profileData as ProfileData;
      setDisplayName(data.displayName ?? "");
      setBio(data.bio ?? "");
      setCountry(data.country ?? "");
      setRegion(data.region ?? "");
      setCity(data.city ?? "");
      setParticipantType(data.participantType ?? "independent");
      setInstitutionId(data.institutionId ?? null);
      setInstitutionName(data.institutionName ?? "");
      setInstSearchQuery(data.institutionName ?? "");
      setDepartment(data.department ?? "");
      setGraduationYear(data.graduationYear ? String(data.graduationYear) : "");
      setWalletAddress(data.walletAddress ?? "");
      setWalletNetwork(data.walletNetwork ?? "");
      setInitialized(true);
    }
  }, [profileData, initialized]);

  const searchInstitutions = useCallback(async (query: string) => {
    if (query.trim().length < 1) { setInstSearchResults([]); return; }
    setInstSearchLoading(true);
    try {
      const results = await apiRequest<Institution[]>(`/api/institutions/search?q=${encodeURIComponent(query)}&limit=10`, { token });
      setInstSearchResults(results);
    } catch { setInstSearchResults([]); }
    finally { setInstSearchLoading(false); }
  }, [token]);

  function handleInstSearchChange(value: string) {
    setInstSearchQuery(value);
    setInstSearchOpen(true);
    setInstitutionId(null);
    setInstitutionName(value);
    if (instSearchTimeoutRef.current) clearTimeout(instSearchTimeoutRef.current);
    instSearchTimeoutRef.current = setTimeout(() => searchInstitutions(value), 300);
  }

  function selectInstitution(inst: Institution) {
    setInstitutionId(inst.id);
    setInstitutionName(inst.name);
    setInstSearchQuery(inst.name);
    setInstSearchOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (instDropdownRef.current && !instDropdownRef.current.contains(e.target as Node)) setInstSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      await saveProfileMutation.mutateAsync({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        country: country || null,
        region: region.trim() || null,
        city: city.trim() || null,
        participantType,
        institutionId: institutionId ?? null,
        institutionName: institutionName.trim() || null,
        department: department.trim() || null,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        walletAddress: walletAddress.trim() || null,
        walletNetwork: walletNetwork || null,
      });
      toast.success(t("profileEdit.saved"));
    } catch (err) {
      toast.error((err as Error).message || t("profileEdit.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="text-center py-8">
        <p className="text-[#F6465D] text-sm">{t("common.loadFailed")}</p>
      </div>
    );
  }

  const inputCls = "w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#D1D4DC] placeholder-[#848E9C]/50 focus:outline-none focus:border-[#F0B90B]/40 transition-colors";
  const labelCls = "block text-[11px] text-[#848E9C] mb-1.5 font-medium";

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Basic Info */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-display font-bold text-[#D1D4DC]">{lang === "zh" ? "基本信息" : "Basic Info"}</h3>

        <div>
          <label className={labelCls}>{t("profileEdit.displayName")}</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("profileEdit.displayNamePh")} maxLength={64} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>{t("profileEdit.bio")} <span className="ml-2 text-[9px] text-[#848E9C]/60">{bio.length}/280</span></label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} placeholder={t("profileEdit.bioPh")} maxLength={280} rows={3} className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls}>{t("profileEdit.country")}</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
            <option value="">{t("profileEdit.countryPh")}</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{t("profileEdit.country." + c.code)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("profileEdit.region")}</label>
            <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t("profileEdit.regionPh")} maxLength={64} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("profileEdit.city")}</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("profileEdit.cityPh")} maxLength={64} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t("profileEdit.participantType")}</label>
          <div className="flex gap-3">
            {PARTICIPANT_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setParticipantType(pt.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-[11px] font-medium transition-colors ${
                  participantType === pt.value
                    ? "border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]"
                    : "border-[rgba(255,255,255,0.08)] text-[#848E9C] hover:border-[rgba(255,255,255,0.15)]"
                }`}
              >
                {participantType === pt.value && <Check className="w-3 h-3 inline mr-1" />}
                {t("profileEdit." + pt.value)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative" ref={instDropdownRef}>
          <label className={labelCls}>{t("profileEdit.institution")}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848E9C]" />
            <input
              type="text"
              value={instSearchQuery}
              onChange={(e) => handleInstSearchChange(e.target.value)}
              onFocus={() => { if (instSearchQuery.trim().length > 0) { setInstSearchOpen(true); searchInstitutions(instSearchQuery); } }}
              placeholder={t("profileEdit.institutionPh")}
              className={`${inputCls} pl-9`}
            />
            {instSearchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848E9C] animate-spin" />}
          </div>
          {instSearchOpen && instSearchResults.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-[#1C2030] border border-[rgba(255,255,255,0.12)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {instSearchResults.map((inst) => (
                <button key={inst.id} onClick={() => selectInstitution(inst)} className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <div className="text-[11px] text-[#D1D4DC]">{inst.name}</div>
                  {inst.nameEn && <div className="text-[9px] text-[#848E9C]">{inst.nameEn}</div>}
                  <div className="text-[9px] text-[#848E9C]">{inst.city ?? inst.region ?? ""} · {inst.type}</div>
                </button>
              ))}
            </div>
          )}
          {instSearchOpen && instSearchQuery.trim().length > 0 && instSearchResults.length === 0 && !instSearchLoading && (
            <div className="absolute z-20 top-full mt-1 w-full bg-[#1C2030] border border-[rgba(255,255,255,0.12)] rounded-lg shadow-xl p-3 text-center">
              <p className="text-[10px] text-[#848E9C]">{t("profileEdit.noInstitution")}</p>
              <p className="text-[9px] text-[#848E9C]/60 mt-1">{t("profileEdit.manualInput")}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("profileEdit.department")}</label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t("profileEdit.departmentPh")} maxLength={128} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("profileEdit.gradYear")}</label>
            <input type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder={t("profileEdit.gradYearPh")} min={1990} max={2040} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-[#F0B90B]" />
          <h3 className="text-sm font-display font-bold text-[#D1D4DC]">{t("profileEdit.walletTitle")}</h3>
        </div>
        <p className="text-[11px] text-[#848E9C] leading-relaxed">{t("profileEdit.walletDesc")}</p>

        <div>
          <label className={labelCls}>{t("profileEdit.walletNetwork")}</label>
          <select value={walletNetwork} onChange={(e) => setWalletNetwork(e.target.value)} className={inputCls}>
            <option value="">{t("profileEdit.walletNetworkPh")}</option>
            {WALLET_NETWORKS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>{t("profileEdit.walletAddress")}</label>
          <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder={t("profileEdit.walletAddressPh")} className={`${inputCls} font-mono text-[12px]`} />
        </div>

        <p className="text-[10px] text-[#F0B90B]/70 leading-relaxed">{t("profileEdit.walletEligibility")}</p>

        <div className="border-t border-white/[0.06] pt-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-[#7AA2F7]" />
            <h4 className="text-[11px] font-semibold text-[#D1D4DC]">{t("profileEdit.withdrawHistory")}</h4>
          </div>
          <div className="rounded-lg border border-dashed border-white/[0.08] bg-[#0B0E11]/60 px-4 py-6 text-center">
            <Wallet className="mx-auto h-6 w-6 text-[#7D8899]/60" />
            <p className="mt-2 text-[11px] text-[#848E9C]">{t("profileEdit.noWithdrawals")}</p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-lg bg-[#F0B90B] text-[#0B0E11] text-sm font-bold hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("common.saving")}
          </span>
        ) : (
          t("common.save")
        )}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN: Profile Page with Tabs
// ═══════════════════════════════════════════════════════════
const TABS: { id: TabId; icon: typeof User; labelZh: string; labelEn: string }[] = [
  { id: "overview", icon: User, labelZh: "概览", labelEn: "Overview" },
  { id: "history", icon: History, labelZh: "比赛历史", labelEn: "History" },
  { id: "analytics", icon: BarChart3, labelZh: "交易分析", labelEn: "Analytics" },
  { id: "achievements", icon: Award, labelZh: "成就", labelEn: "Achievements" },
  { id: "settings", icon: Settings, labelZh: "设置", labelEn: "Settings" },
];

export default function ProfilePage() {
  const { t, lang } = useT();
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: historyData, isLoading: historyLoading } = useMatchHistory(5);
  const locale = lang === "zh" ? "zh-CN" : "en-US";

  // Parse tab from URL search params
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const tabFromUrl = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : "overview");

  // Update URL when tab changes
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const loading = profileLoading || (activeTab === "overview" && historyLoading);
  const historyResponse = historyData as { results?: MatchResult[] } | MatchResult[] | undefined;
  const history: MatchResult[] = Array.isArray(historyResponse) ? historyResponse : historyResponse?.results ?? [];

  if (loading && !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className={`${PAGE_CLASS} p-8 text-center`}>
          <p className="text-sm text-[#F6465D]">{t("common.loadFailed")}</p>
          <p className="mt-2 text-xs text-[#848E9C]">{(profileError as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const p = profile as ProfileData;
  const tier = getRankTier(p.seasonPoints);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      {/* Profile Header */}
      <div className={`${PAGE_CLASS} p-5 md:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#F0B90B]">
              {lang === "zh" ? "个人中心" : "Profile"}
            </p>
            <h1 className="mt-2 text-2xl font-display font-bold text-white">
              {p.displayName || p.username}
            </h1>
            {p.displayName && <p className="mt-0.5 text-sm text-[#8E98A8]">@{p.username}</p>}
          </div>
          <button
            onClick={() => handleTabChange("settings")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-[#D1D4DC] transition-colors hover:bg-white/[0.04]"
          >
            <Pencil className="h-4 w-4" />
            {t("profile.editProfile")}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[12px] font-medium transition-all ${
                isActive
                  ? "bg-[#F0B90B]/10 text-[#F0B90B] border border-[#F0B90B]/25"
                  : "text-[#848E9C] border border-transparent hover:bg-white/[0.03] hover:text-[#D1D4DC]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {lang === "zh" ? tab.labelZh : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab profile={p} history={history} locale={locale} t={t} lang={lang} />
        )}
        {activeTab === "history" && (
          <HistoryTab t={t} lang={lang} />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab t={t} lang={lang} />
        )}
        {activeTab === "achievements" && (
          <AchievementsTab t={t} lang={lang} />
        )}
        {activeTab === "settings" && (
          <SettingsTab t={t} lang={lang} />
        )}
      </div>
    </div>
  );
}
