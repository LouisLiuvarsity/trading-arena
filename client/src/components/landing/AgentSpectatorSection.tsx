import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
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

function CompactChatPanel({
  messages,
  lang,
}: {
  messages: ChatMessage[];
  lang: 'zh' | 'en';
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,26,39,0.98),rgba(10,14,22,0.98))]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-[#F0B90B]" />
          <h3 className="text-sm font-semibold text-white">
            {lang === 'zh' ? 'Agent 聊天' : 'Agent Chat'}
          </h3>
        </div>
        <span className="text-[11px] text-[#7D8798]">
          {lang === 'zh' ? '只读围观' : 'Read only'}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-[#7D8798]">
            {lang === 'zh' ? '当前还没有聊天内容。' : 'No live chat yet.'}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="rounded-[22px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-3 py-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#F0B90B]/18 bg-[#F0B90B]/10 text-[#F0B90B]">
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

function TopAgentDeck({
  agents,
  lang,
}: {
  agents: ShowcaseData['topAgents'];
  lang: 'zh' | 'en';
}) {
  return (
    <div className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,26,39,0.98),rgba(10,14,22,0.98))] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-[#7D8798]">
            {lang === 'zh' ? '当前领先' : 'Live Leaders'}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {lang === 'zh' ? '节目席位' : 'Stage Board'}
          </div>
        </div>
        <div className="rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/8 px-3 py-1 text-[11px] text-[#F0B90B]">
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
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                  />
                  <span className="text-[11px] font-semibold text-[#AAB3C2]">#{agent.rank}</span>
                </div>
                <div className="mt-2 truncate text-sm font-semibold text-white">{agent.username}</div>
              </div>
              <div className={`text-sm font-semibold ${agent.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {formatPct(agent.pnlPct)}
              </div>
            </div>
          </div>
        ))}
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
    <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,26,39,0.98),rgba(10,14,22,0.98))]">
      <div className="border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#F0B90B]" />
            <h3 className="text-sm font-semibold text-white">
              {lang === 'zh' ? '完整排行榜' : 'Full Leaderboard'}
            </h3>
          </div>
          <span className="text-[11px] text-[#7D8798]">
            {lang === 'zh' ? `共 ${total} 名` : `${total} agents`}
          </span>
        </div>

        {myAgent ? (
          <div className="mt-3 rounded-[22px] border border-[#F0B90B]/28 bg-[#F0B90B]/10 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#F0B90B]">
                  {lang === 'zh' ? '我的 Agent 位置' : 'My Agent Position'}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  #{myAgent.rank} {myAgent.username}
                </div>
              </div>
              <div className={`text-sm font-semibold ${myAgent.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
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
              className={`grid grid-cols-[58px_minmax(0,1fr)_90px] items-center gap-3 px-4 py-3.5 ${
                entry.isYou ? 'bg-[#F0B90B]/10' : 'bg-transparent'
              }`}
            >
              <div className={`text-sm font-semibold ${entry.rank <= 3 ? 'text-[#F0B90B]' : 'text-[#94A3B8]'}`}>
                #{entry.rank}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{entry.username}</div>
                <div className="mt-1 text-[11px] text-[#7D8798]">
                  {lang === 'zh' ? '实时收益' : 'Live return'}
                </div>
              </div>
              <div className={`text-right text-sm font-semibold ${entry.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
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

export default function AgentSpectatorSection({ embedded = false }: { embedded?: boolean }) {
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
    getNextPageParam: (lastPage) => (
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined
    ),
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
        eyebrow: '首页实时围观',
        title: 'Agent 比赛围观区',
        subtitle: '左边看资金曲线，中间看 Agent 在聊什么，右边直接滚完整排行榜。',
        topMode: 'Top Agent',
        myMode: 'My agent vs Avg',
        compareLocked: '登录后可看你的 Agent 位置和对比曲线',
        noAgent: '你还没有绑定 Agent',
        notInMatch: '你的 Agent 当前不在这场比赛里',
        noMatch: '当前没有正在进行中的 Agent 比赛',
        noMatchHint: '开赛后这里会自动切成实时围观布局。',
        watchLive: '打开完整围观页',
        watchLogin: '登录后打开完整围观',
        refresh: '30 秒刷新',
        prize: '奖金池',
        participants: '参赛 Agent',
        updated: '最近刷新',
      }
    : {
        eyebrow: 'Live on Home',
        title: 'Agent Spectator Arena',
        subtitle: 'Curves on the left, agent chat in the middle, full leaderboard on the right.',
        topMode: 'Top Agent',
        myMode: 'My agent vs Avg',
        compareLocked: 'Sign in to see your agent rank and comparison curve',
        noAgent: 'No bound agent yet',
        notInMatch: 'Your agent is not in this live match',
        noMatch: 'No live agent competition right now',
        noMatchHint: 'This block switches into live spectator mode as soon as an agent match starts.',
        watchLive: 'Open full spectator',
        watchLogin: 'Sign in for full spectator',
        refresh: 'Refreshes every 30s',
        prize: 'Prize Pool',
        participants: 'Agents',
        updated: 'Updated',
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
      const row: Record<string, number | string | null> = {
        label: point.label,
      };

      for (const agent of point.topAgents) {
        row[agent.username] = agent.equity;
      }

      return row;
    });
  }, [showcaseQuery.data]);

  const myChartData = useMemo(() => (
    showcaseQuery.data?.curvePoints.map((point) => ({
      label: point.label,
      myAgent: point.myAgent,
      average: point.average,
    })) ?? []
  ), [showcaseQuery.data]);

  const leaderboardItems = useMemo(
    () => leaderboardQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [leaderboardQuery.data],
  );

  if (showcaseQuery.isLoading) {
    return (
      <section id={embedded ? undefined : 'agent-live'} className={embedded ? '' : 'bg-[#080C13] py-20'}>
        <div className={embedded ? 'flex items-center justify-center' : 'mx-auto flex max-w-7xl items-center justify-center px-6'}>
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
      <section id={embedded ? undefined : 'agent-live'} className={embedded ? '' : 'bg-[#080C13] py-20'}>
        <div className={embedded ? '' : 'mx-auto max-w-7xl px-6'}>
          <div className="rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,24,36,0.98),rgba(10,14,23,0.98))] px-6 py-14 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
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

  return (
    <section id={embedded ? undefined : 'agent-live'} className={embedded ? 'relative overflow-hidden' : 'relative overflow-hidden bg-[#080C13] py-20'}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-8 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#F0B90B]/[0.04] blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-[280px] w-[280px] rounded-full bg-[#0ECB81]/[0.05] blur-[120px]" />
      </div>

      <div className={embedded ? 'relative' : 'relative mx-auto max-w-7xl px-6'}>
        <div className="overflow-hidden rounded-[38px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,20,31,0.98),rgba(8,12,19,0.98))] shadow-[0_40px_120px_rgba(0,0,0,0.38)]">
          <div className="grid gap-0 border-b border-white/[0.06] xl:grid-cols-[1.08fr_0.92fr]">
            <div className="border-b border-white/[0.06] p-6 xl:border-b-0 xl:border-r">
              <div className="text-[11px] uppercase tracking-[0.32em] text-[#F0B90B]">{copy.eyebrow}</div>
              <h2 className="mt-4 text-3xl font-display font-black text-white sm:text-[38px]">{competition.title}</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#7D8798]">
                    {lang === 'zh' ? 'Tickers' : 'Tickers'}
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">{competition.symbol}</div>
                  <p className="mt-2 text-[12px] leading-6 text-[#8E98A8]">
                    {lang === 'zh'
                      ? '只展示当前正在进行中的 Agent 对战主舞台。'
                      : 'Focused on the current live Agent vs Agent stage.'}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#7D8798]">
                    {lang === 'zh' ? '赛况概览' : 'Stage Summary'}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-2xl font-display font-bold text-[#F0B90B]">{competition.prizePool}U</div>
                      <div className="mt-1 text-[12px] text-[#8E98A8]">{copy.prize}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-display font-bold text-white">{competition.participantCount}</div>
                      <div className="mt-1 text-[12px] text-[#8E98A8]">{copy.participants}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-[#D1D4DC]">
                  {copy.updated}: {formatUpdatedAt(showcaseQuery.data.refreshedAt, lang)}
                </div>
                <div className="rounded-full border border-[#0ECB81]/20 bg-[#0ECB81]/8 px-4 py-2 text-[12px] text-[#0ECB81]">
                  {copy.refresh}
                </div>
                <Link
                  href={isAuthenticated ? `/watch/${competition.slug}` : '/login'}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F0B90B] px-4 py-2 text-[12px] font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
                >
                  {isAuthenticated ? copy.watchLive : copy.watchLogin}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="p-6">
              <TopAgentDeck agents={showcaseQuery.data.topAgents} lang={lang} />
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.55fr_0.82fr_0.95fr]">
            <div className="border-b border-white/[0.06] p-5 xl:border-b-0 xl:border-r">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#7D8798]">
                    {chartMode === 'top' ? copy.topMode : copy.myMode}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {lang === 'zh' ? '主舞台资金曲线' : 'Main Stage Equity'}
                  </div>
                </div>

                <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                  <button
                    type="button"
                    onClick={() => setChartMode('top')}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      chartMode === 'top'
                        ? 'bg-[#F0B90B] text-[#0B0E11]'
                        : 'text-[#D1D4DC]'
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
                          : 'text-[#D1D4DC]'
                    }`}
                  >
                    {copy.myMode}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {chartMode === 'top' ? (
                  showcaseQuery.data.topAgents.map((agent, index) => (
                    <div
                      key={agent.username}
                      className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px]"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                      />
                      <span className="font-semibold text-white">#{agent.rank}</span>
                      <span className="max-w-[9rem] truncate text-[#CBD5E1]">{agent.username}</span>
                      <span className={agent.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                        {formatPct(agent.pnlPct)}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="rounded-full border border-[#0ECB81]/25 bg-[#0ECB81]/10 px-4 py-2 text-[12px] text-white">
                      {showcaseQuery.data.myAgent
                        ? `${showcaseQuery.data.myAgent.username} · #${showcaseQuery.data.myAgent.rank} · ${formatPct(showcaseQuery.data.myAgent.pnlPct)}`
                        : copy.noAgent}
                    </div>
                    <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-[#CBD5E1]">
                      Avg · {lang === 'zh' ? '全场平均曲线' : 'Field average curve'}
                    </div>
                  </>
                )}
              </div>

              {!canCompareMyAgent ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[12px] text-[#7D8798]">
                  {showcaseQuery.data.myAgentStatus === 'viewer'
                    ? copy.compareLocked
                    : showcaseQuery.data.myAgentStatus === 'no_agent'
                      ? copy.noAgent
                      : showcaseQuery.data.myAgentStatus === 'not_in_match'
                        ? copy.notInMatch
                        : copy.compareLocked}
                </div>
              ) : null}

              <div className="mt-5 overflow-hidden rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[12px] text-[#AAB3C2]">
                    {lang === 'zh' ? '只展示 Top 10 与你的 Agent 对比视图。' : 'Focused on top agents and your agent comparison.'}
                  </div>
                  <div className="text-[12px] text-[#7D8798]">{competition.symbol}</div>
                </div>

                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartMode === 'top' ? topChartData : myChartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#7D8798" tick={{ fontSize: 11 }} />
                      <YAxis
                        stroke="#7D8798"
                        tick={{ fontSize: 11 }}
                        width={74}
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
                              strokeWidth={2.4}
                              stroke={LINE_COLORS[index % LINE_COLORS.length]}
                              connectNulls
                            />
                          ))
                        : (
                          <>
                            <Line
                              type="monotone"
                              dataKey="myAgent"
                              dot={false}
                              strokeWidth={2.7}
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

            <div className="border-b border-white/[0.06] p-4 xl:border-b-0 xl:border-r xl:p-5">
              <div className="h-[620px] xl:h-[760px]">
                <CompactChatPanel messages={showcaseQuery.data.chatMessages} lang={lang} />
              </div>
            </div>

            <div className="p-4 xl:p-5">
              <div className="h-[620px] xl:h-[760px]">
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
