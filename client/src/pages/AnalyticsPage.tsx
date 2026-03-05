import { useT } from "@/lib/i18n";
import { useAnalytics } from "@/hooks/useCompetitionData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, Legend,
} from "recharts";

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

const COLORS = { green: "#0ECB81", red: "#F6465D", gold: "#F0B90B", purple: "#8B5CF6", blue: "#3B82F6" };
const PIE_COLORS = ["#0ECB81", "#F6465D", "#F0B90B", "#8B5CF6", "#3B82F6"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-center">
      <div className="text-[#848E9C] text-[10px] mb-0.5">{label}</div>
      <div className="text-white font-mono text-sm font-bold">{value}</div>
      {sub && <div className="text-[#848E9C] text-[9px] mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useT();
  const { data, isLoading: loading, error } = useAnalytics();

  const CLOSE_REASON_LABELS: Record<string, string> = {
    manual: t('analytics.closeManual'),
    tp: t('analytics.closeTp'),
    sl: t('analytics.closeSl'),
    match_end: t('analytics.closeEnd'),
    time_limit: t('analytics.closeTimeout'),
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-display font-bold text-white mb-6">{t('analytics.title')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 animate-pulse h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-display font-bold text-white mb-4">{t('analytics.title')}</h1>
        <p className="text-[#F6465D] text-sm">{(error as Error)?.message ?? t('analytics.noData')}</p>
      </div>
    );
  }

  const d = data as AnalyticsData;

  if (d.summary.totalTrades === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-display font-bold text-white mb-4">{t('analytics.title')}</h1>
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#848E9C] text-sm">{t('analytics.empty')}</p>
          <p className="text-[#5E6673] text-xs mt-1">{t('analytics.emptyHint')}</p>
        </div>
      </div>
    );
  }

  const { summary, pnlDistribution, byDirection, byCloseReason, equityCurve, streaks, byHour, holdDurationVsPnl } = d;

  const closeReasonPieData = Object.entries(byCloseReason).map(([key, val]) => ({
    name: CLOSE_REASON_LABELS[key] ?? key,
    value: val.count,
  }));

  const tooltipStyle = { background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#D1D4DC" };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-display font-bold text-white">{t('analytics.title')}</h1>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label={t('analytics.totalTrades')} value={summary.totalTrades} />
        <StatCard label={t('analytics.winRate')} value={`${summary.winRate}%`} />
        <StatCard label={t('analytics.avgPnl')} value={`${summary.avgPnlPerTrade > 0 ? "+" : ""}${summary.avgPnlPerTrade}`} />
        <StatCard label={t('analytics.avgHold')} value={`${Math.round(summary.avgHoldDuration / 60)}min`} />
        <StatCard label={t('analytics.avgWeight')} value={`${summary.avgHoldWeight}x`} />
        <StatCard label={t('analytics.profitFactor')} value={summary.profitFactor === Infinity ? "\u221E" : summary.profitFactor} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('analytics.currentStreak')} value={streaks.currentStreak > 0 ? `+${streaks.currentStreak}${t('analytics.winSuffix')}` : streaks.currentStreak < 0 ? `${streaks.currentStreak}${t('analytics.lossSuffix')}` : "\u2014"} />
        <StatCard label={t('analytics.longestWin')} value={t('analytics.streakWin', { n: streaks.longestWinStreak })} />
        <StatCard label={t('analytics.longestLoss')} value={t('analytics.streakLoss', { n: streaks.longestLossStreak })} />
      </div>

      {equityCurve.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t('analytics.equityCurve')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="tradeIndex" tick={{ fill: "#848E9C", fontSize: 10 }} />
              <YAxis tick={{ fill: "#848E9C", fontSize: 10 }} domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="equity" stroke={COLORS.gold} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t('analytics.pnlDist')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pnlDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="bucket" tick={{ fill: "#848E9C", fontSize: 9 }} />
              <YAxis tick={{ fill: "#848E9C", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t('analytics.dirAnalysis')}</h2>
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
              <div className="text-[#848E9C]">{t('analytics.longWR')}</div>
              <div className="text-[#0ECB81] font-mono font-bold">{byDirection.long.count ? Math.round((byDirection.long.wins / byDirection.long.count) * 100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">{t('analytics.shortWR')}</div>
              <div className="text-[#F6465D] font-mono font-bold">{byDirection.short.count ? Math.round((byDirection.short.wins / byDirection.short.count) * 100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">{t('analytics.longAvgPnl')}</div>
              <div className={`font-mono font-bold ${byDirection.long.avgPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{byDirection.long.avgPnl > 0 ? "+" : ""}{byDirection.long.avgPnl}</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">{t('analytics.shortAvgPnl')}</div>
              <div className={`font-mono font-bold ${byDirection.short.avgPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{byDirection.short.avgPnl > 0 ? "+" : ""}{byDirection.short.avgPnl}</div>
            </div>
          </div>
        </div>

        {closeReasonPieData.length > 0 && (
          <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t('analytics.closeReason')}</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={closeReasonPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {closeReasonPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={(value) => <span className="text-[10px] text-[#848E9C]">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t('analytics.tradeHours')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: "#848E9C", fontSize: 9 }} />
              <YAxis tick={{ fill: "#848E9C", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {holdDurationVsPnl.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">{t('analytics.holdVsPnl')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="holdSeconds" name={t('analytics.holdVsPnl')} tick={{ fill: "#848E9C", fontSize: 10 }} />
              <YAxis dataKey="pnlPct" name="PnL%" tick={{ fill: "#848E9C", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Scatter data={holdDurationVsPnl.filter((d) => d.pnlPct > 0)} fill={COLORS.green} opacity={0.6} />
              <Scatter data={holdDurationVsPnl.filter((d) => d.pnlPct <= 0)} fill={COLORS.red} opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
