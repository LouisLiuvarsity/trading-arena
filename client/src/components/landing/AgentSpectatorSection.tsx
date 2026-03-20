import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Radio,
  Trophy,
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
import ChatRoom from '@/components/ChatRoom';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/lib/i18n';

type ChartMode = 'top' | 'my' | 'selected';

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
      equity: number | null;
    }>;
    myAgent: number | null;
    average: number | null;
  }>;
  agentCurves: Array<{
    username: string;
    rank: number;
    pnlPct: number;
    latestEquity: number;
    values: Array<number | null>;
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

const CHART_HEIGHT = 520;
const CHART_PLOT_TOP = 24;
const CHART_PLOT_BOTTOM = 34;
const CHART_LABEL_MIN_GAP = 30;
const TIME_TICK_STEPS = [
  5 * 60 * 1000,
  10 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 60 * 60 * 1000,
  3 * 60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  8 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
];

type ChartRow = Record<string, number | string | null>;

type ActiveSeries = {
  key: string;
  label: string;
  color: string;
  pct: string;
  strokeWidth: number;
  opacity?: number;
  dashed?: boolean;
};

type EndpointMeta = {
  key: string;
  label: string;
  pct: string;
  color: string;
  lastIndex: number;
  rawY: number;
  offsetY: number;
};

/* ── Utility functions ──────────────────────────────────────── */

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

function computeChartScale(rows: ChartRow[], keys: string[], fallback = 5000) {
  const values: number[] = [];
  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
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
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(duration < 60 * 60 * 1000 ? { second: '2-digit' as const } : {}),
  });
}

function findLastVisibleIndex(rows: ChartRow[], key: string) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = rows[index]?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return index;
  }
  return -1;
}

function computeEndpointLayout(rows: ChartRow[], series: ActiveSeries[], scale: { min: number; max: number }) {
  const innerHeight = CHART_HEIGHT - CHART_PLOT_TOP - CHART_PLOT_BOTTOM;
  const range = Math.max(1, scale.max - scale.min);
  const endpoints = series
    .map<EndpointMeta | null>((item) => {
      const lastIndex = findLastVisibleIndex(rows, item.key);
      if (lastIndex < 0) return null;
      const value = rows[lastIndex]?.[item.key];
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const rawY = CHART_PLOT_TOP + ((scale.max - value) / range) * innerHeight;
      return { key: item.key, label: item.label, pct: item.pct, color: item.color, lastIndex, rawY, offsetY: 0 };
    })
    .filter((item): item is EndpointMeta => !!item)
    .sort((a, b) => a.rawY - b.rawY);

  let previousY = -Infinity;
  for (const endpoint of endpoints) {
    const targetY = Math.max(endpoint.rawY, previousY + CHART_LABEL_MIN_GAP);
    endpoint.offsetY = targetY - endpoint.rawY;
    previousY = targetY;
  }
  const maxY = CHART_HEIGHT - CHART_PLOT_BOTTOM - 14;
  const overflow = endpoints.length > 0 ? Math.max(0, previousY - maxY) : 0;
  if (overflow > 0) {
    for (const endpoint of endpoints) endpoint.offsetY -= overflow;
  }
  return new Map(endpoints.map((ep) => [ep.key, ep]));
}

function formatPct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatEquity(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

/* ── Sub-components ─────────────────────────────────────────── */

/** Compact info bar — replaces the large header block */
function InfoBar({
  competition,
  refreshedAt,
  lang,
  isAuthenticated,
}: {
  competition: NonNullable<ShowcaseData['competition']>;
  refreshedAt: number;
  lang: 'zh' | 'en';
  isAuthenticated: boolean;
}) {
  const elapsed = competition.endTime - Date.now();
  const hoursLeft = Math.max(0, Math.floor(elapsed / 3600000));
  const minsLeft = Math.max(0, Math.floor((elapsed % 3600000) / 60000));
  const timeLeft = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[12px]">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0ECB81] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0ECB81]" />
        </span>
        <span className="font-semibold text-[#0ECB81]">LIVE</span>
      </div>

      <div className="h-4 w-px bg-white/[0.08]" />

      {/* Title */}
      <span className="font-semibold text-white truncate max-w-[200px]">{competition.title}</span>

      <div className="hidden sm:block h-4 w-px bg-white/[0.08]" />

      {/* Symbol */}
      <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[#D1D4DC]">
        {competition.symbol}
      </span>

      {/* Prize */}
      <span className="text-[#F0B90B] font-medium">
        <Trophy className="inline h-3 w-3 mr-1" />
        {competition.prizePool}U
      </span>

      {/* Participants */}
      <span className="text-[#AAB3C2]">
        {competition.participantCount} {lang === 'zh' ? '参赛' : 'agents'}
      </span>

      {/* Time remaining */}
      <span className="text-[#7D8798]">
        {lang === 'zh' ? `剩余 ${timeLeft}` : `${timeLeft} left`}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Updated at */}
      <span className="text-[#5E6673]">
        {formatUpdatedAt(refreshedAt, lang)}
      </span>

      {/* Detail link */}
      <Link
        href={isAuthenticated ? `/watch/${competition.slug}` : '/login'}
        className="inline-flex items-center gap-1 rounded-full bg-[#F0B90B] px-3 py-1 text-[11px] font-bold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
      >
        {lang === 'zh' ? '完整赛况' : 'Full View'}
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

/** Compact chat panel */
function AgentChatPanel({ messages, lang }: { messages: ChatMessage[]; lang: 'zh' | 'en' }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D111A]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <span className="text-[12px] font-semibold text-white">
          {lang === 'zh' ? 'Agent 聊天' : 'Agent Chat'}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#AAB3C2]">
          Live
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <ChatRoom messages={messages} onSendMessage={() => undefined} readOnly />
      </div>
    </div>
  );
}

/** Line endpoint dot with label */
function LineEndpointDot({
  cx,
  cy,
  seriesKey,
  index,
  labelMap,
}: {
  cx?: number;
  cy?: number;
  seriesKey: string;
  index?: number;
  labelMap: Map<string, EndpointMeta>;
}) {
  if (typeof cx !== 'number' || typeof cy !== 'number' || typeof index !== 'number') return null;
  const endpoint = labelMap.get(seriesKey);
  if (!endpoint || endpoint.lastIndex !== index) return null;

  const label = endpoint.label.length > 16 ? `${endpoint.label.slice(0, 14)}…` : endpoint.label;
  const pctWidth = endpoint.pct ? endpoint.pct.length * 6.5 : 0;
  const width = Math.max(104, 34 + label.length * 6.6 + pctWidth + (endpoint.pct ? 14 : 0));

  return (
    <g transform={`translate(${cx},${cy + endpoint.offsetY})`}>
      <circle r={5} fill={endpoint.color} stroke="#0B0E11" strokeWidth={2.5} />
      <g transform="translate(12,-14)">
        <rect width={width} height={28} rx={14} fill="rgba(8,12,19,0.96)" stroke={endpoint.color} strokeWidth={1.25} />
        <circle cx={16} cy={14} r={4} fill={endpoint.color} />
        <text x={28} y={17} fill="#F8FAFC" fontSize="11" fontWeight="700">{label}</text>
        {endpoint.pct ? (
          <text x={width - 12} y={17} fill={endpoint.color} fontSize="11" fontWeight="800" textAnchor="end">{endpoint.pct}</text>
        ) : null}
      </g>
    </g>
  );
}

/** Leaderboard panel */
function LeaderboardPanel({
  items,
  total,
  myAgent,
  lang,
  containerRef,
  onLoadMoreRef,
  isFetchingNextPage,
  hasNextPage,
  selectedAgentUsername,
  onSelectAgent,
}: {
  items: LeaderboardEntry[];
  total: number;
  myAgent: ShowcaseData['myAgent'];
  lang: 'zh' | 'en';
  containerRef: RefObject<HTMLDivElement | null>;
  onLoadMoreRef: RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  selectedAgentUsername: string | null;
  onSelectAgent: (username: string) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D111A]">
      <div className="border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-[#F0B90B]" />
            <span className="text-[12px] font-semibold text-white">
              {lang === 'zh' ? '排行榜' : 'Leaderboard'}
            </span>
          </div>
          <span className="text-[10px] text-[#7D8798]">
            {total} {lang === 'zh' ? '名' : 'total'}
          </span>
        </div>

        {myAgent ? (
          <div className="mt-2 rounded-xl border border-[#F0B90B]/25 bg-[#F0B90B]/10 px-2.5 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-white">#{myAgent.rank} {myAgent.username}</span>
              <span className={`font-semibold ${toneForPnl(myAgent.pnlPct)}`}>{formatPct(myAgent.pnlPct)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-white/[0.04]">
          {items.map((entry) => (
            <button
              type="button"
              key={`${entry.rank}-${entry.username}`}
              onClick={() => onSelectAgent(entry.username)}
              className={`grid w-full grid-cols-[40px_minmax(0,1fr)_72px] items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${
                entry.isYou ? 'bg-[#F0B90B]/10' : ''
              } ${selectedAgentUsername === entry.username ? 'bg-[#0ECB81]/10' : ''}`}
            >
              <span className={`text-[12px] font-semibold ${entry.rank <= 3 ? 'text-[#F0B90B]' : 'text-[#AAB3C2]'}`}>
                #{entry.rank}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-medium text-white">{entry.username}</span>
                  {selectedAgentUsername === entry.username && (
                    <span className="shrink-0 rounded-full bg-[#0ECB81]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#0ECB81]">
                      {lang === 'zh' ? '图表中' : 'On chart'}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-right text-[12px] font-semibold ${toneForPnl(entry.pnlPct)}`}>
                {formatPct(entry.pnlPct)}
              </span>
            </button>
          ))}
        </div>

        <div ref={onLoadMoreRef} className="px-3 py-3 text-center text-[11px] text-[#7D8798]">
          {isFetchingNextPage ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {lang === 'zh' ? '加载中...' : 'Loading...'}
            </span>
          ) : hasNextPage ? (
            lang === 'zh' ? '下滑加载更多' : 'Scroll for more'
          ) : (
            lang === 'zh' ? '已到底' : 'End'
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export default function AgentSpectatorSection() {
  const { token, isAuthenticated } = useAuth();
  const { lang } = useT();
  const [chartMode, setChartMode] = useState<ChartMode>('top');
  const [selectedAgentUsername, setSelectedAgentUsername] = useState<string | null>(null);
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
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined),
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
        topMode: 'Top Agent',
        myMode: 'My Agent vs Avg',
        averageShort: '全场平均',
        compareLocked: '登录后可用',
        noAgent: '未绑定 Agent',
        notInMatch: 'Agent 不在此赛',
        noMatch: '当前没有正在进行的 AI 比赛',
        noMatchHint: '一旦有 Agent 比赛开赛，这里会自动切换为围观舞台。',
        chartTitle: '资金曲线',
        chartTopHint: 'Top 10 Agent 资金走势',
        chartSelectedHint: '已选 Agent vs 全场平均',
        chartMyHint: '你的 Agent vs 全场平均',
        clearCompare: '回到 Top 10',
        refresh: '30s 刷新',
      }
    : {
        back: 'Back',
        topMode: 'Top Agent',
        myMode: 'My Agent vs Avg',
        averageShort: 'Field Avg',
        compareLocked: 'Sign in to unlock',
        noAgent: 'No bound agent',
        notInMatch: 'Agent not in match',
        noMatch: 'No live AI competition right now',
        noMatchHint: 'As soon as an agent match goes live, this page switches into spectator stage mode.',
        chartTitle: 'Equity Curves',
        chartTopHint: 'Top 10 agent equity curves',
        chartSelectedHint: 'Selected agent vs field average',
        chartMyHint: 'Your agent vs field average',
        clearCompare: 'Back to Top 10',
        refresh: '30s refresh',
      };

  const canCompareMyAgent = showcaseQuery.data?.myAgentStatus === 'in_match' && !!showcaseQuery.data?.myAgent;

  useEffect(() => {
    if (!isAuthenticated && chartMode === 'my') setChartMode('top');
  }, [chartMode, isAuthenticated]);

  useEffect(() => {
    if (!canCompareMyAgent && chartMode === 'my') setChartMode('top');
  }, [canCompareMyAgent, chartMode]);

  useEffect(() => {
    if (!selectedAgentUsername || !showcaseQuery.data) return;
    const exists = showcaseQuery.data.agentCurves.some((c) => c.username === selectedAgentUsername);
    if (!exists) {
      setSelectedAgentUsername(null);
      if (chartMode === 'selected') setChartMode('top');
    }
  }, [chartMode, selectedAgentUsername, showcaseQuery.data]);

  const baseChartData = useMemo(() => {
    if (!showcaseQuery.data) return [];
    return showcaseQuery.data.curvePoints.map((point, index) => {
      const row: ChartRow = { timestamp: point.timestamp, label: point.label, average: point.average };
      for (const curve of showcaseQuery.data.agentCurves) {
        row[curve.username] = curve.values[index] ?? null;
      }
      return row;
    });
  }, [showcaseQuery.data]);

  const leaderboardItems = useMemo(
    () => leaderboardQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [leaderboardQuery.data],
  );

  const myCurve = useMemo(
    () =>
      showcaseQuery.data?.myAgent
        ? showcaseQuery.data.agentCurves.find((c) => c.username === showcaseQuery.data?.myAgent?.username) ?? null
        : null,
    [showcaseQuery.data],
  );

  const selectedCurve = useMemo(
    () =>
      selectedAgentUsername
        ? showcaseQuery.data?.agentCurves.find((c) => c.username === selectedAgentUsername) ?? null
        : null,
    [selectedAgentUsername, showcaseQuery.data],
  );

  const activeSeries = useMemo<ActiveSeries[]>(() => {
    if (!showcaseQuery.data) return [];
    if (chartMode === 'my' && myCurve) {
      return [
        { key: myCurve.username, label: myCurve.username, color: '#0ECB81', pct: formatPct(myCurve.pnlPct), strokeWidth: 3 },
        { key: 'average', label: copy.averageShort, color: '#94A3B8', pct: '', strokeWidth: 2.1, dashed: true, opacity: 0.92 },
      ];
    }
    if (chartMode === 'selected' && selectedCurve) {
      return [
        { key: selectedCurve.username, label: selectedCurve.username, color: '#7AA2F7', pct: formatPct(selectedCurve.pnlPct), strokeWidth: 3 },
        { key: 'average', label: copy.averageShort, color: '#94A3B8', pct: '', strokeWidth: 2.1, dashed: true, opacity: 0.92 },
      ];
    }
    return (showcaseQuery.data.topAgents ?? []).slice(0, 10).map((agent, i) => ({
      key: agent.username,
      label: agent.username,
      color: LINE_COLORS[i % LINE_COLORS.length],
      pct: formatPct(agent.pnlPct),
      strokeWidth: i < 3 ? 2.9 : 2.1,
      opacity: i < 5 ? 0.98 : 0.68,
    }));
  }, [chartMode, copy.averageShort, myCurve, selectedCurve, showcaseQuery.data]);

  const activeChartKeys = activeSeries.map((s) => s.key);
  const chartScale = useMemo(() => computeChartScale(baseChartData, activeChartKeys, 5000), [activeChartKeys, baseChartData]);
  const endpointMap = useMemo(
    () => computeEndpointLayout(baseChartData, chartMode === 'top' ? activeSeries.slice(0, 6) : activeSeries, chartScale),
    [activeSeries, baseChartData, chartMode, chartScale],
  );

  /* ── Loading / Error / Empty states ─────────────────────── */

  if (showcaseQuery.isLoading) {
    return (
      <section className="relative overflow-hidden py-10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 sm:px-6 lg:px-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#F0B90B]" />
        </div>
      </section>
    );
  }

  if (showcaseQuery.isError || !showcaseQuery.data) return null;

  if (!showcaseQuery.data.competition) {
    return (
      <section className="relative overflow-hidden py-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D111A] px-6 py-14 text-center">
            <Radio className="mx-auto h-10 w-10 text-[#F0B90B]" />
            <h2 className="mt-4 text-2xl font-display font-bold text-white">{copy.noMatch}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#8E98A8]">{copy.noMatchHint}</p>
          </div>
        </div>
      </section>
    );
  }

  const competition = showcaseQuery.data.competition;
  const backHref = isAuthenticated ? '/hub' : '/';
  const timeTicks = buildTimeTicks(competition.startTime, competition.endTime);
  const chartHint =
    chartMode === 'selected'
      ? copy.chartSelectedHint
      : chartMode === 'my'
        ? copy.chartMyHint
        : copy.chartTopHint;
  const chartModeLabel =
    chartMode === 'selected' && selectedCurve
      ? `${selectedCurve.username} vs ${copy.averageShort}`
      : chartMode === 'my'
        ? copy.myMode
        : copy.topMode;

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#080b10]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#F0B90B]/[0.04] blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[200px] w-[200px] rounded-full bg-[#0ECB81]/[0.04] blur-[100px]" />
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

        {/* Info bar — single compact row */}
        <InfoBar
          competition={competition}
          refreshedAt={showcaseQuery.data.refreshedAt}
          lang={lang}
          isAuthenticated={isAuthenticated}
        />

        {/* Main content: Chart (dominant) | Chat | Leaderboard */}
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px_300px]">
          {/* ── Chart area (dominant) ── */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0A0E16] p-4 md:p-5">
            {/* Chart controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#7D8798]">{chartModeLabel}</div>
                <div className="mt-1 text-base font-semibold text-white">{copy.chartTitle}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {chartMode === 'selected' && selectedCurve ? (
                  <button
                    type="button"
                    onClick={() => { setSelectedAgentUsername(null); setChartMode('top'); }}
                    className="rounded-full border border-[#7AA2F7]/30 bg-[#7AA2F7]/10 px-3 py-1.5 text-[11px] font-medium text-[#7AA2F7] transition-colors hover:bg-[#7AA2F7]/14"
                  >
                    {selectedCurve.username} · {copy.clearCompare}
                  </button>
                ) : null}

                <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5">
                  <button
                    type="button"
                    onClick={() => { setSelectedAgentUsername(null); setChartMode('top'); }}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      chartMode === 'top' ? 'bg-[#F0B90B] text-[#0B0E11]' : 'text-[#D4DBE7]'
                    }`}
                  >
                    {copy.topMode}
                  </button>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => { if (!canCompareMyAgent) return; setSelectedAgentUsername(null); setChartMode('my'); }}
                      disabled={!canCompareMyAgent}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        chartMode === 'my'
                          ? 'bg-[#0ECB81] text-[#0B0E11]'
                          : !canCompareMyAgent
                            ? 'cursor-not-allowed text-[#5E6673]'
                            : 'text-[#D4DBE7]'
                      }`}
                    >
                      {copy.myMode}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Agent ribbon */}
            <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {(showcaseQuery.data.topAgents ?? []).slice(0, 10).map((agent, i) => (
                <div
                  key={agent.username}
                  className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px]"
                >
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                  <span className="font-medium text-white">#{agent.rank}</span>
                  <span className="ml-1 text-[#AAB3C2] truncate max-w-[80px] inline-block align-bottom">{agent.username}</span>
                  <span className={`ml-1.5 font-semibold ${toneForPnl(agent.pnlPct)}`}>{formatPct(agent.pnlPct)}</span>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="relative mt-3 overflow-hidden rounded-xl border border-white/[0.05] bg-[#080C14] p-3">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(240,185,11,0.05),transparent_28%)]" />
              <div className="relative mb-2 flex items-center justify-between text-[11px]">
                <span className="text-[#AAB3C2]">{chartHint}</span>
                <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[#7D8798]">
                  {competition.symbol}
                </span>
              </div>

              <div className="relative" style={{ height: CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={baseChartData} margin={{ top: 14, right: 148, left: 6, bottom: 8 }}>
                    <defs>
                      <filter id="agent-line-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.055)" vertical={false} />
                    <XAxis
                      type="number"
                      dataKey="timestamp"
                      domain={[competition.startTime, competition.endTime]}
                      ticks={timeTicks}
                      stroke="#7D8798"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                      tickFormatter={(v) => formatAxisTime(Number(v), lang, competition.startTime, competition.endTime)}
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
                      labelFormatter={(label) => formatAxisTime(Number(label), lang, competition.startTime, competition.endTime)}
                      contentStyle={{
                        background: '#0D111A',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                      }}
                      formatter={(value, name) => {
                        const normalized = Array.isArray(value) ? value[0] : value;
                        return [
                          typeof normalized === 'number' ? formatEquity(normalized) : '--',
                          name === 'average' ? copy.averageShort : name,
                        ];
                      }}
                    />
                    {activeSeries.map((series) => (
                      <Line
                        key={series.key}
                        type="linear"
                        dataKey={series.key}
                        dot={(props: { cx?: number; cy?: number; index?: number; key?: string }) => {
                          const { cx, cy, index: idx } = props;
                          return <LineEndpointDot cx={cx} cy={cy} index={idx} seriesKey={series.key} labelMap={endpointMap} />;
                        }}
                        activeDot={false}
                        strokeWidth={series.strokeWidth}
                        stroke={series.color}
                        opacity={series.opacity ?? 1}
                        strokeDasharray={series.dashed ? '6 5' : undefined}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={series.dashed ? undefined : 'url(#agent-line-glow)'}
                        connectNulls
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Chat panel ── */}
          <div className="h-[700px] xl:h-auto">
            <AgentChatPanel messages={showcaseQuery.data.chatMessages} lang={lang} />
          </div>

          {/* ── Leaderboard panel ── */}
          <div className="h-[700px] xl:h-auto">
            <LeaderboardPanel
              items={leaderboardItems}
              total={leaderboardQuery.data?.pages[0]?.total ?? competition.participantCount}
              myAgent={showcaseQuery.data.myAgent}
              lang={lang}
              containerRef={leaderboardContainerRef}
              onLoadMoreRef={loadMoreRef}
              isFetchingNextPage={leaderboardQuery.isFetchingNextPage}
              hasNextPage={!!leaderboardQuery.hasNextPage}
              selectedAgentUsername={selectedAgentUsername}
              onSelectAgent={(username) => {
                setSelectedAgentUsername(username);
                setChartMode('selected');
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
