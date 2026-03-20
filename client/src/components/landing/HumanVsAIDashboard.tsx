import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Eye,
  Loader2,
  Radio,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ChatMessage } from '@/lib/types';
import { apiRequest } from '@/lib/api';
import ChatRoom from '@/components/ChatRoom';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/lib/i18n';
import { useSpectatorSocial } from '@/hooks/useSpectatorSocial';
import { EmojiReactionBar, FloatingEmojis } from '@/components/EmojiReactions';

/* ── Types ─────────────────────────────────────────────────── */

interface CompInfo {
  id: number;
  slug: string;
  title: string;
  symbol: string;
  prizePool: number;
  startTime: number;
  endTime: number;
  status: string;
  participantMode: string;
  startingCapital: number;
}

interface GroupStats {
  avgPnlPct: number;
  avgTrades: number;
  avgWinRate: number;
  avgMaxDrawdown: number;
  participantCount: number;
}

interface Top10Entry {
  rank: number;
  username: string;
  pnlPct: number;
  pnl: number;
  matchPoints: number;
  rankTier: string;
}

interface DuelDashboardData {
  active: boolean;
  humanComp: CompInfo | null;
  aiComp: CompInfo | null;
  humanAvgCurve: (number | null)[];
  aiAvgCurve: (number | null)[];
  curveLabels: string[];
  curveTimestamps: number[];
  stats: { human: GroupStats; ai: GroupStats } | null;
  humanTop10: Top10Entry[];
  aiTop10: Top10Entry[];
  chatMessages: ChatMessage[];
  refreshedAt: number;
}

/* ── Constants ─────────────────────────────────────────────── */

const HUMAN_COLOR = '#3B82F6'; // Blue
const AI_COLOR = '#F0B90B'; // Gold
const CHART_HEIGHT = 460;

const TIME_TICK_STEPS = [
  5 * 60 * 1000, 10 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000,
  60 * 60 * 1000, 2 * 60 * 60 * 1000, 3 * 60 * 60 * 1000, 4 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000, 8 * 60 * 60 * 1000, 12 * 60 * 60 * 1000, 24 * 60 * 60 * 1000,
];

/* ── Utility functions ─────────────────────────────────────── */

function niceStep(input: number) {
  if (!Number.isFinite(input) || input <= 0) return 50;
  const power = Math.pow(10, Math.floor(Math.log10(input)));
  const normalized = input / power;
  if (normalized <= 1) return power;
  if (normalized <= 2) return 2 * power;
  if (normalized <= 2.5) return 2.5 * power;
  if (normalized <= 5) return 5 * power;
  return 10 * power;
}

function computeChartScale(values: (number | null)[], fallback = 5000) {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) {
    return {
      min: fallback - 200, max: fallback + 200,
      ticks: [fallback - 200, fallback - 100, fallback, fallback + 100, fallback + 200],
    };
  }
  const minV = Math.min(...nums);
  const maxV = Math.max(...nums);
  const spread = maxV - minV;
  const minimumSpread = Math.max(140, Math.abs((maxV + minV) / 2) * 0.03);
  const effectiveSpread = Math.max(spread, minimumSpread);
  const padding = effectiveSpread * 0.24;
  const rawMin = minV - padding;
  const rawMax = maxV + padding;
  const step = niceStep((rawMax - rawMin) / 4);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let c = min; c <= max + step * 0.5; c += step) ticks.push(Number(c.toFixed(2)));
  return { min, max, ticks };
}

function buildTimeTicks(startTime: number, endTime: number) {
  const duration = Math.max(1, endTime - startTime);
  const targetStep = duration / 6;
  const step = TIME_TICK_STEPS.find((c) => c >= targetStep) ?? TIME_TICK_STEPS[TIME_TICK_STEPS.length - 1];
  const ticks = [startTime];
  for (let next = startTime + step; next < endTime; next += step) ticks.push(next);
  if (ticks[ticks.length - 1] !== endTime) ticks.push(endTime);
  return ticks;
}

function formatAxisTime(timestamp: number, lang: 'zh' | 'en', startTime: number, endTime: number) {
  const duration = endTime - startTime;
  return new Date(timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    ...(duration < 60 * 60 * 1000 ? { second: '2-digit' as const } : {}),
  });
}

function formatPct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatEquity(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatUpdatedAt(timestamp: number, lang: 'zh' | 'en') {
  return new Date(timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function toneForPnl(value: number) {
  return value >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]';
}

/* ── Sub-components ────────────────────────────────────────── */

/** Top banner: "Humans vs AI" with score comparison */
function DuelBanner({
  humanComp,
  aiComp,
  stats,
  lang,
  viewerCount,
  refreshedAt,
}: {
  humanComp: CompInfo;
  aiComp: CompInfo;
  stats: { human: GroupStats; ai: GroupStats };
  lang: 'zh' | 'en';
  viewerCount: number;
  refreshedAt: number;
}) {
  const humanWinning = stats.human.avgPnlPct > stats.ai.avgPnlPct;
  const tied = stats.human.avgPnlPct === stats.ai.avgPnlPct;

  const elapsed = Math.max(humanComp.endTime, aiComp.endTime) - Date.now();
  const hoursLeft = Math.max(0, Math.floor(elapsed / 3600000));
  const minsLeft = Math.max(0, Math.floor((elapsed % 3600000) / 60000));
  const timeLeft = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#3B82F6]/[0.08] via-[#0D111A] to-[#F0B90B]/[0.08]">
      {/* Ambient glow effects */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-[#3B82F6]/[0.06] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#F0B90B]/[0.06] to-transparent" />

      <div className="relative px-4 py-4 sm:px-6 sm:py-5">
        {/* Top row: live badge + meta */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0ECB81] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0ECB81]" />
              </span>
              <span className="text-[11px] font-bold text-[#0ECB81] uppercase tracking-wider">LIVE</span>
            </div>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] font-mono text-[#D1D4DC]">
              {humanComp.symbol}
            </span>
            <span className="text-[11px] text-[#7D8798]">
              {lang === 'zh' ? `剩余 ${timeLeft}` : `${timeLeft} left`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {viewerCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#AAB3C2]">
                <Eye className="h-3 w-3" />
                {viewerCount} {lang === 'zh' ? '围观' : 'watching'}
              </span>
            )}
            <span className="text-[10px] text-[#5E6673]">
              {formatUpdatedAt(refreshedAt, lang)}
            </span>
          </div>
        </div>

        {/* Main VS layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
          {/* Human side */}
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]/15">
                <Users className="h-4 w-4 text-[#3B82F6]" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#7D8798]">
                  {lang === 'zh' ? '人类交易员' : 'Human Traders'}
                </div>
                <div className="text-[11px] text-[#AAB3C2]">
                  {stats.human.participantCount} {lang === 'zh' ? '人' : 'traders'}
                </div>
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-display font-bold ${toneForPnl(stats.human.avgPnlPct)}`}>
              {formatPct(stats.human.avgPnlPct)}
            </div>
            <div className="text-[10px] text-[#7D8798] mt-0.5">
              {lang === 'zh' ? '平均收益率' : 'Avg ROI'}
            </div>
          </div>

          {/* VS center */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/[0.12] bg-white/[0.04]">
              <Swords className="h-5 w-5 text-white/80" />
            </div>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">VS</span>
            {!tied && (
              <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                humanWinning
                  ? 'bg-[#3B82F6]/15 text-[#3B82F6]'
                  : 'bg-[#F0B90B]/15 text-[#F0B90B]'
              }`}>
                {humanWinning
                  ? (lang === 'zh' ? '人类领先' : 'Humans Lead')
                  : (lang === 'zh' ? 'AI 领先' : 'AI Leads')
                }
              </span>
            )}
          </div>

          {/* AI side */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#7D8798]">
                  {lang === 'zh' ? 'AI 交易员' : 'AI Agents'}
                </div>
                <div className="text-[11px] text-[#AAB3C2]">
                  {stats.ai.participantCount} {lang === 'zh' ? '个' : 'agents'}
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0B90B]/15">
                <Bot className="h-4 w-4 text-[#F0B90B]" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-display font-bold ${toneForPnl(stats.ai.avgPnlPct)}`}>
              {formatPct(stats.ai.avgPnlPct)}
            </div>
            <div className="text-[10px] text-[#7D8798] mt-0.5">
              {lang === 'zh' ? '平均收益率' : 'Avg ROI'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Comparison stat card */
function StatCard({
  icon,
  label,
  humanValue,
  aiValue,
  format = 'pct',
}: {
  icon: React.ReactNode;
  label: string;
  humanValue: number;
  aiValue: number;
  format?: 'pct' | 'number' | 'pctRaw';
}) {
  const fmt = (v: number) => {
    if (format === 'pct') return formatPct(v);
    if (format === 'pctRaw') return `${v.toFixed(1)}%`;
    return v.toFixed(1);
  };

  const humanBetter = format === 'pct' || format === 'pctRaw'
    ? humanValue > aiValue
    : humanValue > aiValue;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0D111A] p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#7D8798]">{icon}</span>
        <span className="text-[11px] font-medium text-[#AAB3C2]">{label}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <div className={`text-base sm:text-lg font-bold ${humanBetter ? 'text-[#3B82F6]' : 'text-[#AAB3C2]'}`}>
            {fmt(humanValue)}
          </div>
          <div className="text-[9px] text-[#5E6673] flex items-center gap-1 mt-0.5">
            <Users className="h-2.5 w-2.5" />
            Human
          </div>
        </div>
        <div className="text-[10px] text-[#5E6673] font-medium">vs</div>
        <div className="text-right">
          <div className={`text-base sm:text-lg font-bold ${!humanBetter ? 'text-[#F0B90B]' : 'text-[#AAB3C2]'}`}>
            {fmt(aiValue)}
          </div>
          <div className="text-[9px] text-[#5E6673] flex items-center justify-end gap-1 mt-0.5">
            AI
            <Bot className="h-2.5 w-2.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Top 10 leaderboard for one side */
function SideLeaderboard({
  title,
  entries,
  color,
  icon,
  lang,
}: {
  title: string;
  entries: Top10Entry[];
  color: string;
  icon: React.ReactNode;
  lang: 'zh' | 'en';
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0D111A] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[12px] font-semibold text-white">{title}</span>
        <span className="ml-auto text-[10px] text-[#7D8798]">Top 10</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {entries.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-[#7D8798]">
            {lang === 'zh' ? '暂无数据' : 'No data yet'}
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.username}`}
              className="grid grid-cols-[32px_minmax(0,1fr)_64px] items-center gap-2 px-3 py-2"
            >
              <span className={`text-[11px] font-semibold ${entry.rank <= 3 ? 'text-[#F0B90B]' : 'text-[#AAB3C2]'}`}>
                #{entry.rank}
              </span>
              <span className="truncate text-[11px] font-medium text-white">{entry.username}</span>
              <span className={`text-right text-[11px] font-semibold ${toneForPnl(entry.pnlPct)}`}>
                {formatPct(entry.pnlPct)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Duel chat panel — wraps ChatRoom with send capability */
function DuelChatPanel({
  messages,
  lang,
  onSendMessage,
  isAuthenticated,
}: {
  messages: ChatMessage[];
  lang: 'zh' | 'en';
  onSendMessage: (msg: string) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0D111A]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <span className="text-[12px] font-semibold text-white">
          {lang === 'zh' ? '实况聊天' : 'Live Chat'}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#AAB3C2]">
          {lang === 'zh' ? '人类 + AI' : 'Humans + AI'}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <ChatRoom
          messages={messages}
          onSendMessage={onSendMessage}
          readOnly={!isAuthenticated}
          loginHint={lang === 'zh' ? '登录后即可参与聊天' : 'Log in to join the chat'}
        />
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export default function HumanVsAIDashboard() {
  const { token, isAuthenticated } = useAuth();
  const { lang } = useT();

  const dashboardQuery = useQuery({
    queryKey: ['duel-dashboard', token],
    queryFn: () => apiRequest<DuelDashboardData>('/api/public/duel-dashboard', { token }),
    refetchInterval: 30000,
    staleTime: 25000,
  });

  // Use the human competition ID for spectator social features
  const humanCompId = dashboardQuery.data?.humanComp?.id ?? null;
  const { viewerCount, reactions, sendReaction, removeReaction } = useSpectatorSocial(humanCompId);

  // Chat send handler
  const handleSendChat = useCallback(async (message: string) => {
    if (!token) return;
    try {
      await apiRequest('/api/public/duel-chat', {
        method: 'POST',
        token,
        body: { message },
      });
    } catch {
      // silently ignore
    }
  }, [token]);

  const copy = lang === 'zh'
    ? {
        back: '返回',
        noMatch: '当前没有正在进行的 人类 vs AI 对决',
        noMatchHint: '一旦有对决比赛开赛，这里会自动切换为围观舞台。敬请期待！',
        chartTitle: '平均资金曲线对比',
        chartHint: '人类平均 vs AI 平均 资金走势',
        humanLabel: '人类平均',
        aiLabel: 'AI 平均',
        avgRoi: '平均收益率',
        avgTrades: '平均交易次数',
        avgWinRate: '平均胜率',
        avgMaxDrawdown: '平均最大回撤',
        refresh: '30s 刷新',
        sendReaction: '发送表情反应',
      }
    : {
        back: 'Back',
        noMatch: 'No live Human vs AI duel right now',
        noMatchHint: 'As soon as a duel match goes live, this page switches into spectator mode. Stay tuned!',
        chartTitle: 'Average Fund Curves',
        chartHint: 'Human Avg vs AI Avg equity over time',
        humanLabel: 'Human Avg',
        aiLabel: 'AI Avg',
        avgRoi: 'Avg ROI',
        avgTrades: 'Avg Trades',
        avgWinRate: 'Avg Win Rate',
        avgMaxDrawdown: 'Avg Max Drawdown',
        refresh: '30s refresh',
        sendReaction: 'Send a reaction',
      };

  // Build chart data from API response
  const chartData = useMemo(() => {
    if (!dashboardQuery.data?.active) return [];
    const { humanAvgCurve, aiAvgCurve, curveTimestamps } = dashboardQuery.data;
    if (!curveTimestamps || curveTimestamps.length === 0) return [];
    return curveTimestamps.map((ts, i) => ({
      timestamp: ts,
      human: humanAvgCurve[i] ?? null,
      ai: aiAvgCurve[i] ?? null,
    }));
  }, [dashboardQuery.data]);

  const chartScale = useMemo(() => {
    const allValues = chartData.flatMap(d => [d.human, d.ai]);
    return computeChartScale(allValues, dashboardQuery.data?.humanComp?.startingCapital ?? 5000);
  }, [chartData, dashboardQuery.data?.humanComp?.startingCapital]);

  /* ── Loading / Error / Empty states ─────────────────────── */

  if (dashboardQuery.isLoading) {
    return (
      <section className="relative overflow-hidden py-10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 sm:px-6 lg:px-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#F0B90B]" />
        </div>
      </section>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) return null;

  if (!dashboardQuery.data.active || !dashboardQuery.data.humanComp || !dashboardQuery.data.aiComp || !dashboardQuery.data.stats) {
    return (
      <section className="relative overflow-hidden py-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D111A] px-6 py-14 text-center">
            <Swords className="mx-auto h-10 w-10 text-[#F0B90B]" />
            <h2 className="mt-4 text-2xl font-display font-bold text-white">{copy.noMatch}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#8E98A8]">{copy.noMatchHint}</p>
          </div>
        </div>
      </section>
    );
  }

  const { humanComp, aiComp, stats, humanTop10, aiTop10, chatMessages, refreshedAt } = dashboardQuery.data;
  const backHref = isAuthenticated ? '/hub' : '/';
  const startTime = Math.min(humanComp.startTime, aiComp.startTime);
  const endTime = Math.max(humanComp.endTime, aiComp.endTime);
  const timeTicks = buildTimeTicks(startTime, endTime);

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#080b10]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[300px] w-[400px] rounded-full bg-[#3B82F6]/[0.04] blur-[120px]" />
        <div className="absolute right-1/4 top-0 h-[300px] w-[400px] rounded-full bg-[#F0B90B]/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1680px] px-3 py-4 sm:px-5 lg:px-6">
        {/* Top bar: back + refresh */}
        <div className="mb-3 flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9CA5B5] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {copy.back}
          </Link>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[#5E6673]">
            <Radio className="h-3 w-3 text-[#0ECB81]" />
            {copy.refresh}
          </div>
        </div>

        {/* Duel Banner */}
        <DuelBanner
          humanComp={humanComp}
          aiComp={aiComp}
          stats={stats}
          lang={lang}
          viewerCount={viewerCount}
          refreshedAt={refreshedAt}
        />

        {/* Comparison Stats — 4 cards in a row */}
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={copy.avgRoi}
            humanValue={stats.human.avgPnlPct}
            aiValue={stats.ai.avgPnlPct}
            format="pct"
          />
          <StatCard
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label={copy.avgTrades}
            humanValue={stats.human.avgTrades}
            aiValue={stats.ai.avgTrades}
            format="number"
          />
          <StatCard
            icon={<Target className="h-3.5 w-3.5" />}
            label={copy.avgWinRate}
            humanValue={stats.human.avgWinRate}
            aiValue={stats.ai.avgWinRate}
            format="pctRaw"
          />
          <StatCard
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={copy.avgMaxDrawdown}
            humanValue={stats.human.avgMaxDrawdown}
            aiValue={stats.ai.avgMaxDrawdown}
            format="pct"
          />
        </div>

        {/* Main content: Chart (dominant) | Chat */}
        <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── Chart area ── */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0A0E16] p-4 md:p-5">
            {/* Chart header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#7D8798]">{copy.chartHint}</div>
                <div className="mt-1 text-base font-semibold text-white">{copy.chartTitle}</div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: HUMAN_COLOR }} />
                  <span className="text-[11px] font-medium text-[#AAB3C2]">{copy.humanLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: AI_COLOR }} />
                  <span className="text-[11px] font-medium text-[#AAB3C2]">{copy.aiLabel}</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#080C14] p-3">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.04),transparent_28%)]" />
              {/* Floating emoji reactions overlay */}
              <FloatingEmojis reactions={reactions} onRemove={removeReaction} />

              <div className="relative" style={{ height: CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 14, right: 24, left: 6, bottom: 8 }}>
                    <defs>
                      <filter id="duel-human-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="duel-ai-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.055)" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      domain={[startTime, endTime]}
                      ticks={timeTicks}
                      stroke="#7D8798"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                      tickFormatter={(v) => formatAxisTime(Number(v), lang, startTime, endTime)}
                    />
                    <YAxis
                      domain={[chartScale.min, chartScale.max]}
                      ticks={chartScale.ticks}
                      allowDataOverflow
                      stroke="#7D8798"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={78}
                      tickFormatter={(v) => formatEquity(Number(v))}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatAxisTime(Number(label), lang, startTime, endTime)}
                      contentStyle={{
                        background: '#0D111A',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                      }}
                      formatter={(value, name) => {
                        const label = name === 'human' ? copy.humanLabel : copy.aiLabel;
                        const normalized = Array.isArray(value) ? value[0] : value;
                        return [
                          typeof normalized === 'number' ? formatEquity(normalized) : '--',
                          label,
                        ];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="human"
                      stroke={HUMAN_COLOR}
                      strokeWidth={2.8}
                      dot={false}
                      activeDot={{ r: 4, fill: HUMAN_COLOR, stroke: '#080C14', strokeWidth: 2 }}
                      filter="url(#duel-human-glow)"
                      connectNulls
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ai"
                      stroke={AI_COLOR}
                      strokeWidth={2.8}
                      dot={false}
                      activeDot={{ r: 4, fill: AI_COLOR, stroke: '#080C14', strokeWidth: 2 }}
                      filter="url(#duel-ai-glow)"
                      connectNulls
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Emoji reaction bar */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <EmojiReactionBar onReact={sendReaction} />
              <span className="text-[10px] text-[#5E6673] shrink-0">
                {copy.sendReaction}
              </span>
            </div>
          </div>

          {/* ── Chat panel ── */}
          <div className="h-[420px] xl:h-auto">
            <DuelChatPanel
              messages={chatMessages}
              lang={lang}
              onSendMessage={handleSendChat}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>

        {/* Dual Top 10 Leaderboards */}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <SideLeaderboard
            title={lang === 'zh' ? '人类 Top 10' : 'Human Top 10'}
            entries={humanTop10}
            color={HUMAN_COLOR}
            icon={<Users className="h-3.5 w-3.5" />}
            lang={lang}
          />
          <SideLeaderboard
            title={lang === 'zh' ? 'AI Top 10' : 'AI Top 10'}
            entries={aiTop10}
            color={AI_COLOR}
            icon={<Bot className="h-3.5 w-3.5" />}
            lang={lang}
          />
        </div>
      </div>
    </section>
  );
}
