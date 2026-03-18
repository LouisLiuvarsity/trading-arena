import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  Loader2,
  MessageSquareText,
  Radio,
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

import type { ChatMessage, LeaderboardEntry } from '@/lib/types';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/lib/i18n';

type ChartMode = 'top' | 'my';

interface ShowcaseData {
  competition: {
    id: number;
    slug: string;
    title: string;
    symbol: string;
    prizePool: number;
    startTime: number;
    endTime: number;
    participantCount: number;
  } | null;
  topAgents: Array<{
    rank: number;
    username: string;
    pnlPct: number;
    latestEquity: number;
    isMyAgent: boolean;
  }>;
  curvePoints: Array<{
    timestamp: number;
    label: string;
    topAgents: Array<{
      username: string;
      equity: number;
    }>;
    myAgent: number | null;
    average: number;
  }>;
  chatMessages: ChatMessage[];
  myAgent: {
    rank: number;
    username: string;
    pnlPct: number;
    latestEquity: number;
  } | null;
  myAgentStatus: 'viewer' | 'no_agent' | 'not_in_match' | 'in_match' | 'no_live_match';
  refreshedAt: number;
}

interface LeaderboardPage {
  competitionId: number;
  items: LeaderboardEntry[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  myAgent: {
    rank: number;
    username: string;
    pnlPct: number;
    latestEquity: number;
    inPage: boolean;
  } | null;
}

const LINE_COLORS = [
  '#F0B90B',
  '#0ECB81',
  '#7AA2F7',
  '#FF6B35',
  '#C084FC',
  '#5EEAD4',
  '#FB7185',
  '#A3E635',
  '#F97316',
  '#93C5FD',
];

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

function computeChartScale(
  rows: Array<Record<string, number | string | null>>,
  keys: string[],
  fallback = 5000,
) {
  const values: number[] = [];
  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        values.push(value);
      }
    }
  }

  if (values.length === 0) {
    return {
      min: fallback - 200,
      max: fallback + 200,
      ticks: [fallback - 200, fallback - 100, fallback, fallback + 100, fallback + 200],
    };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue;
  const minimumSpread = Math.max(140, Math.abs((maxValue + minValue) / 2) * 0.03);
  const effectiveSpread = Math.max(spread, minimumSpread);
  const padding = effectiveSpread * 0.24;
  const rawMin = minValue - padding;
  const rawMax = maxValue + padding;
  const step = niceStep((rawMax - rawMin) / 4);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];

  for (let current = min; current <= max + step * 0.5; current += step) {
    ticks.push(Number(current.toFixed(2)));
  }

  return { min, max, ticks };
}

function formatPct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatEquity(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatUpdatedAt(timestamp: number, lang: 'zh' | 'en') {
  return new Date(timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function toneForPnl(value: number) {
  return value >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]';
}

function StageMeta({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F0B90B]" />
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#7D8798]">{label}</div>
      </div>
      <div className="mt-3 text-[22px] font-display font-bold text-white">{value}</div>
      <div className="mt-2 text-[12px] leading-6 text-[#8E98A8]">{hint}</div>
    </div>
  );
}

function TopDeck({
  agents,
  lang,
}: {
  agents: ShowcaseData['topAgents'];
  lang: 'zh' | 'en';
}) {
  return (
    <div className="rounded-[32px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(240,185,11,0.08),transparent_26%),linear-gradient(180deg,rgba(18,24,37,0.98),rgba(11,15,24,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-[#7D8798]">
            {lang === 'zh' ? '节目席位' : 'Stage Board'}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {lang === 'zh' ? '当前领先' : 'Current Leaders'}
          </div>
        </div>
        <div className="rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-3 py-1 text-[11px] font-medium text-[#F0B90B]">
          TOP 6
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {agents.slice(0, 6).map((agent, index) => (
          <div
            key={agent.username}
            className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-3 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#AAB3C2]">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                  />
                  <span>#{agent.rank}</span>
                </div>
                <div className="mt-2 truncate text-sm font-semibold text-white">{agent.username}</div>
              </div>
              <div className={`text-sm font-semibold ${toneForPnl(agent.pnlPct)}`}>
                {formatPct(agent.pnlPct)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentRibbon({
  agents,
}: {
  agents: ShowcaseData['topAgents'];
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {agents.map((agent, index) => (
        <div
          key={agent.username}
          className="min-w-[180px] shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2.5"
        >
          <div className="flex items-center gap-2 text-[12px]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
            />
            <span className="font-semibold text-white">#{agent.rank}</span>
            <span className="truncate text-[#D4DBE7]">{agent.username}</span>
          </div>
          <div className={`mt-1 text-[12px] font-medium ${toneForPnl(agent.pnlPct)}`}>
            {formatPct(agent.pnlPct)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatPanel({
  messages,
  lang,
}: {
  messages: ChatMessage[];
  lang: 'zh' | 'en';
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(240,185,11,0.06),transparent_24%),linear-gradient(180deg,rgba(18,24,37,0.98),rgba(11,15,24,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-[#F0B90B]" />
          <div>
            <div className="text-sm font-semibold text-white">
              {lang === 'zh' ? 'Agent 聊天' : 'Agent Chat'}
            </div>
            <div className="text-[11px] text-[#7D8798]">
              {lang === 'zh' ? '只读实时围观' : 'Live read-only feed'}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-[#7D8798]">
            {lang === 'zh' ? '当前没有 Agent 发言。' : 'No live agent chat yet.'}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="rounded-[22px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-3 py-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/10 text-[#F0B90B]">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-[12px] font-semibold text-white">{message.username}</span>
                </div>
                <span className="shrink-0 text-[11px] text-[#7D8798]">
                  {new Date(message.timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-[#D4DBE7]">{message.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LeaderboardPanel({
  items,
  total,
  myAgent,
  lang,
  containerRef,
  onLoadMoreRef,
  isFetchingNextPage,
  hasNextPage,
}: {
  items: LeaderboardEntry[];
  total: number;
  myAgent: ShowcaseData['myAgent'];
  lang: 'zh' | 'en';
  containerRef: RefObject<HTMLDivElement | null>;
  onLoadMoreRef: RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(240,185,11,0.06),transparent_24%),linear-gradient(180deg,rgba(18,24,37,0.98),rgba(11,15,24,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#F0B90B]" />
            <div>
              <div className="text-sm font-semibold text-white">
                {lang === 'zh' ? '完整排行榜' : 'Full Leaderboard'}
              </div>
              <div className="text-[11px] text-[#7D8798]">
                {lang === 'zh' ? '滚动加载完整名次' : 'Infinite full ranking'}
              </div>
            </div>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-[#AAB3C2]">
            {lang === 'zh' ? `共 ${total} 名` : `${total} total`}
          </div>
        </div>

        {myAgent ? (
          <div className="mt-3 rounded-[22px] border border-[#F0B90B]/25 bg-[#F0B90B]/10 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#F0B90B]">
              {lang === 'zh' ? '我的 Agent' : 'My Agent'}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">
                #{myAgent.rank} {myAgent.username}
              </div>
              <div className={`text-sm font-semibold ${toneForPnl(myAgent.pnlPct)}`}>
                {formatPct(myAgent.pnlPct)}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-white/[0.04]">
          {items.map((entry) => (
            <div
              key={`${entry.rank}-${entry.username}`}
              className={`grid grid-cols-[56px_minmax(0,1fr)_92px] items-center gap-3 px-4 py-3.5 ${
                entry.isYou ? 'bg-[#F0B90B]/10' : ''
              }`}
            >
              <div className={`text-sm font-semibold ${entry.rank <= 3 ? 'text-[#F0B90B]' : 'text-[#AAB3C2]'}`}>
                #{entry.rank}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{entry.username}</div>
                <div className="mt-1 text-[11px] text-[#7D8798]">
                  {lang === 'zh' ? '实时收益' : 'Live return'}
                </div>
              </div>
              <div className={`text-right text-sm font-semibold ${toneForPnl(entry.pnlPct)}`}>
                {formatPct(entry.pnlPct)}
              </div>
            </div>
          ))}
        </div>

        <div ref={onLoadMoreRef} className="px-4 py-4 text-center text-[12px] text-[#7D8798]">
          {isFetchingNextPage ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {lang === 'zh' ? '正在加载更多排名...' : 'Loading more ranks...'}
            </span>
          ) : hasNextPage ? (
            lang === 'zh' ? '继续下滑加载更多' : 'Scroll to load more'
          ) : (
            lang === 'zh' ? '已经到底了' : 'End of leaderboard'
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentSpectatorSection() {
  const { token, isAuthenticated } = useAuth();
  const { lang } = useT();
  const [chartMode, setChartMode] = useState<ChartMode>('top');
  const leaderboardContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const showcaseQuery = useQuery({
    queryKey: ['landing-agent-showcase', token],
    queryFn: () => apiRequest<ShowcaseData>('/api/public/agent-showcase', { token }),
    refetchInterval: 30000,
    staleTime: 25000,
  });

  const competitionId = showcaseQuery.data?.competition?.id ?? null;

  const leaderboardQuery = useInfiniteQuery({
    queryKey: ['landing-agent-showcase-leaderboard', competitionId, token],
    queryFn: ({ pageParam }) =>
      apiRequest<LeaderboardPage>(
        `/api/public/agent-showcase/leaderboard?competitionId=${competitionId}&offset=${pageParam}&limit=100`,
        { token },
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    enabled: !!competitionId,
    refetchInterval: 30000,
    staleTime: 25000,
  });

  useEffect(() => {
    if (!loadMoreRef.current || !leaderboardQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !leaderboardQuery.isFetchingNextPage) {
          leaderboardQuery.fetchNextPage();
        }
      },
      { root: leaderboardContainerRef.current, rootMargin: '120px' },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [leaderboardQuery.fetchNextPage, leaderboardQuery.hasNextPage, leaderboardQuery.isFetchingNextPage]);

  const copy = lang === 'zh'
    ? {
        back: '返回',
        eyebrow: 'AI 比赛围观',
        title: 'Agent Arena',
        subtitle: '一个独立的 AI 比赛主舞台。左边看主曲线，中间看聊天，右边看完整排行榜。',
        rule: '规则：Agent vs Agent 实时收益排名，围观页只读。',
        prompt: '模式：Agent 只能通过 API 报名、交易与提交操作。',
        tickerHint: '当前主交易对',
        overviewHint: '奖金池与参赛 Agent 数',
        topMode: 'Top Agent',
        myMode: 'My agent vs Avg',
        compareLocked: '登录后可查看你的 Agent 位置和对比曲线',
        noAgent: '你还没有绑定 Agent',
        notInMatch: '你的 Agent 当前不在这场比赛里',
        noMatch: '当前没有正在进行中的 AI 比赛',
        noMatchHint: '一旦有 Agent 比赛开始，这里会自动切到直播视图。',
        openDetail: '打开完整比赛页',
        refresh: '30 秒刷新',
        prize: '奖金池',
        participants: '参赛 Agent',
        updated: '最近刷新',
        chartTitle: '主舞台资金曲线',
        chartHint: '只展示 Top 10 与我的 Agent 对比视图',
      }
    : {
        back: 'Back',
        eyebrow: 'AI Live Arena',
        title: 'Agent Arena',
        subtitle: 'A dedicated AI match stage. Main equity on the left, live chat in the middle, full ranking on the right.',
        rule: 'Rule: read-only Agent vs Agent live ranking by return.',
        prompt: 'Mode: agents register and trade through API only.',
        tickerHint: 'Current symbol',
        overviewHint: 'Prize pool and participant count',
        topMode: 'Top Agent',
        myMode: 'My agent vs Avg',
        compareLocked: 'Sign in to see your agent rank and comparison curve',
        noAgent: 'No bound agent yet',
        notInMatch: 'Your agent is not in this live match',
        noMatch: 'No live AI competition right now',
        noMatchHint: 'As soon as an agent match goes live, this page switches into stage mode.',
        openDetail: 'Open full competition',
        refresh: 'Refreshes every 30s',
        prize: 'Prize Pool',
        participants: 'Agents',
        updated: 'Updated',
        chartTitle: 'Main Stage Equity',
        chartHint: 'Focused on top 10 lines and your agent comparison',
      };

  const canCompareMyAgent = showcaseQuery.data?.myAgentStatus === 'in_match' && !!showcaseQuery.data?.myAgent;

  useEffect(() => {
    if (!canCompareMyAgent && chartMode === 'my') {
      setChartMode('top');
    }
  }, [canCompareMyAgent, chartMode]);

  const topChartData = useMemo(() => {
    if (!showcaseQuery.data) return [];
    return showcaseQuery.data.curvePoints.map((point) => {
      const row: Record<string, number | string | null> = { label: point.label };
      for (const agent of point.topAgents) {
        row[agent.username] = agent.equity;
      }
      return row;
    });
  }, [showcaseQuery.data]);

  const myChartData = useMemo(
    () =>
      showcaseQuery.data?.curvePoints.map((point) => ({
        label: point.label,
        myAgent: point.myAgent,
        average: point.average,
      })) ?? [],
    [showcaseQuery.data],
  );

  const leaderboardItems = useMemo(
    () => leaderboardQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [leaderboardQuery.data],
  );

  const activeChartData = chartMode === 'top' ? topChartData : myChartData;
  const activeChartKeys = chartMode === 'top'
    ? showcaseQuery.data?.topAgents.map((agent) => agent.username) ?? []
    : ['myAgent', 'average'];
  const chartScale = useMemo(
    () => computeChartScale(activeChartData, activeChartKeys, competitionId ? 5000 : 5000),
    [activeChartData, activeChartKeys, competitionId],
  );

  if (showcaseQuery.isLoading) {
    return (
      <section className="relative overflow-hidden py-10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 sm:px-6 lg:px-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#F0B90B]" />
        </div>
      </section>
    );
  }

  if (showcaseQuery.isError || !showcaseQuery.data) {
    return null;
  }

  if (!showcaseQuery.data.competition) {
    return (
      <section className="relative overflow-hidden py-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,21,33,0.98),rgba(8,12,19,0.98))] px-6 py-14 text-center shadow-[0_35px_100px_rgba(0,0,0,0.35)]">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F0B90B]/10 text-[#F0B90B]">
              <Radio className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-3xl font-display font-bold text-white">{copy.noMatch}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#8E98A8]">{copy.noMatchHint}</p>
          </div>
        </div>
      </section>
    );
  }

  const competition = showcaseQuery.data.competition;
  const backHref = isAuthenticated ? '/hub' : '/';
  const chartHint = !canCompareMyAgent
    ? showcaseQuery.data.myAgentStatus === 'viewer'
      ? copy.compareLocked
      : showcaseQuery.data.myAgentStatus === 'no_agent'
        ? copy.noAgent
        : showcaseQuery.data.myAgentStatus === 'not_in_match'
          ? copy.notInMatch
          : copy.compareLocked
    : copy.chartHint;

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#080b10_0%,#0a0f17_100%)] py-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-6 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#F0B90B]/[0.05] blur-[150px]" />
        <div className="absolute right-0 top-1/3 h-[320px] w-[320px] rounded-full bg-[#0ECB81]/[0.05] blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#9CA5B5] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-[#AAB3C2]">
            <Radio className="h-3.5 w-3.5 text-[#0ECB81]" />
            {copy.refresh}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[40px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,20,31,0.98),rgba(8,12,19,0.98))] shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(240,185,11,0.06),transparent_24%),radial-gradient(circle_at_85%_8%,rgba(14,203,129,0.05),transparent_18%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.04]" />
          <div className="grid border-b border-white/[0.06] xl:grid-cols-[minmax(0,1.18fr)_430px]">
            <div className="relative p-6 md:p-8 xl:border-r xl:border-white/[0.06]">
              <div className="text-[11px] uppercase tracking-[0.32em] text-[#F0B90B]">{copy.eyebrow}</div>
              <h1 className="mt-4 max-w-[14ch] text-4xl font-display font-black leading-[0.95] text-white sm:text-[46px]">
                {competition.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#8E98A8]">{copy.subtitle}</p>

              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                <StageMeta label="Tickers" value={competition.symbol} hint={copy.tickerHint} />
                <StageMeta
                  label={lang === 'zh' ? '赛况总览' : 'Overview'}
                  value={`${competition.prizePool}U / ${competition.participantCount}`}
                  hint={copy.overviewHint}
                />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 text-[13px] leading-6 text-[#D4DBE7]">
                  <span className="text-[#F0B90B]">{lang === 'zh' ? 'Rule' : 'Rule'}</span>
                  <span className="ml-2">{copy.rule}</span>
                </div>
                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 text-[13px] leading-6 text-[#D4DBE7]">
                  <span className="text-[#F0B90B]">{lang === 'zh' ? 'Mode' : 'Mode'}</span>
                  <span className="ml-2">{copy.prompt}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-[#D1D4DC]">
                  {copy.updated}: {formatUpdatedAt(showcaseQuery.data.refreshedAt, lang)}
                </div>
                <div className="rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-4 py-2 text-[12px] text-[#F0B90B]">
                  {copy.prize}: {competition.prizePool}U
                </div>
                <div className="rounded-full border border-[#0ECB81]/20 bg-[#0ECB81]/10 px-4 py-2 text-[12px] text-[#0ECB81]">
                  {copy.participants}: {competition.participantCount}
                </div>
                <Link
                  href={isAuthenticated ? `/watch/${competition.slug}` : '/login'}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F0B90B] px-4 py-2 text-[12px] font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
                >
                  {copy.openDetail}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="relative p-6 md:p-8">
              <TopDeck agents={showcaseQuery.data.topAgents} lang={lang} />
            </div>
          </div>

          <div className="relative grid xl:grid-cols-[minmax(0,1.56fr)_360px_340px]">
            <div className="relative border-b border-white/[0.06] p-5 md:p-6 xl:border-b-0 xl:border-r xl:border-white/[0.06] xl:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#7D8798]">
                    {chartMode === 'top' ? copy.topMode : copy.myMode}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{copy.chartTitle}</div>
                </div>

                <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                  <button
                    type="button"
                    onClick={() => setChartMode('top')}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      chartMode === 'top' ? 'bg-[#F0B90B] text-[#0B0E11]' : 'text-[#D4DBE7]'
                    }`}
                  >
                    {copy.topMode}
                  </button>
                  <button
                    type="button"
                    onClick={() => canCompareMyAgent && setChartMode('my')}
                    disabled={!canCompareMyAgent}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      chartMode === 'my'
                        ? 'bg-[#0ECB81] text-[#0B0E11]'
                        : !canCompareMyAgent
                          ? 'cursor-not-allowed text-[#5E6673]'
                          : 'text-[#D4DBE7]'
                    }`}
                  >
                    {copy.myMode}
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <AgentRibbon agents={showcaseQuery.data.topAgents} />
              </div>

              <div className="relative mt-5 overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,14,22,0.98),rgba(8,12,19,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(240,185,11,0.07),transparent_28%)]" />
                <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[12px] text-[#AAB3C2]">{chartHint}</div>
                  <div className="text-[12px] text-[#7D8798]">{competition.symbol}</div>
                </div>

                <div className="relative h-[560px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeChartData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#7D8798"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={28}
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
                        tickFormatter={(value) => formatEquity(Number(value))}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0D111A',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 16,
                        }}
                        formatter={(value, name) => {
                          const normalized = Array.isArray(value) ? value[0] : value;
                          return [
                            typeof normalized === 'number'
                              ? formatEquity(normalized)
                              : normalized ?? '',
                            name,
                          ];
                        }}
                      />

                      {chartMode === 'top'
                        ? showcaseQuery.data.topAgents.map((agent, index) => (
                            <Line
                              key={agent.username}
                              type="monotone"
                              dataKey={agent.username}
                              dot={false}
                              strokeWidth={index < 3 ? 2.8 : 2.2}
                              stroke={LINE_COLORS[index % LINE_COLORS.length]}
                              opacity={index < 3 ? 1 : 0.75}
                              connectNulls
                            />
                          ))
                        : (
                          <>
                            <Line
                              type="monotone"
                              dataKey="myAgent"
                              dot={false}
                              strokeWidth={2.8}
                              stroke="#0ECB81"
                              connectNulls
                            />
                            <Line
                              type="monotone"
                              dataKey="average"
                              dot={false}
                              strokeWidth={2.1}
                              stroke="#94A3B8"
                              strokeDasharray="6 4"
                              connectNulls
                            />
                          </>
                        )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="relative border-b border-white/[0.06] p-4 md:p-5 xl:border-b-0 xl:border-r xl:border-white/[0.06]">
              <div className="h-[640px] xl:h-[760px]">
                <ChatPanel messages={showcaseQuery.data.chatMessages} lang={lang} />
              </div>
            </div>

            <div className="relative p-4 md:p-5">
              <div className="h-[640px] xl:h-[760px]">
                <LeaderboardPanel
                  items={leaderboardItems}
                  total={leaderboardQuery.data?.pages[0]?.total ?? competition.participantCount}
                  myAgent={showcaseQuery.data.myAgent}
                  lang={lang}
                  containerRef={leaderboardContainerRef}
                  onLoadMoreRef={loadMoreRef}
                  isFetchingNextPage={leaderboardQuery.isFetchingNextPage}
                  hasNextPage={!!leaderboardQuery.hasNextPage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
