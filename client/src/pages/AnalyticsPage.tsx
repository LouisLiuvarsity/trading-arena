import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
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
const CLOSE_REASON_LABELS: Record<string, string> = { manual: "✋ 手动", tp: "🎯 止盈", sl: "🛑 止损", match_end: "⏰ 比赛结束", time_limit: "⏱ 超时" };

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
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<AnalyticsData>("/api/me/analytics", { token })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-display font-bold text-white mb-6">交易分析</h1>
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
        <h1 className="text-xl font-display font-bold text-white mb-4">交易分析</h1>
        <p className="text-[#F6465D] text-sm">{error ?? "无法加载数据"}</p>
      </div>
    );
  }

  if (data.summary.totalTrades === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-display font-bold text-white mb-4">交易分析</h1>
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#848E9C] text-sm">暂无交易数据</p>
          <p className="text-[#5E6673] text-xs mt-1">完成一些交易后，这里会显示详细分析</p>
        </div>
      </div>
    );
  }

  const { summary, pnlDistribution, byDirection, byCloseReason, equityCurve, streaks, byHour, holdDurationVsPnl } = data;

  const closeReasonPieData = Object.entries(byCloseReason).map(([key, val]) => ({
    name: CLOSE_REASON_LABELS[key] ?? key,
    value: val.count,
  }));

  const tooltipStyle = { background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#D1D4DC" };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-display font-bold text-white">交易分析</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="总交易" value={summary.totalTrades} />
        <StatCard label="胜率" value={`${summary.winRate}%`} />
        <StatCard label="均PnL/笔" value={`${summary.avgPnlPerTrade > 0 ? "+" : ""}${summary.avgPnlPerTrade}`} />
        <StatCard label="均持仓" value={`${Math.round(summary.avgHoldDuration / 60)}min`} />
        <StatCard label="均权重" value={`${summary.avgHoldWeight}x`} />
        <StatCard label="盈亏比" value={summary.profitFactor === Infinity ? "∞" : summary.profitFactor} />
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="当前连续" value={streaks.currentStreak > 0 ? `+${streaks.currentStreak}胜` : streaks.currentStreak < 0 ? `${streaks.currentStreak}负` : "—"} />
        <StatCard label="最长连胜" value={`${streaks.longestWinStreak}连胜`} />
        <StatCard label="最长连亏" value={`${streaks.longestLossStreak}连亏`} />
      </div>

      {/* Equity curve */}
      {equityCurve.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">Equity 曲线</h2>
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
        {/* PnL Distribution */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">PnL 分布</h2>
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

        {/* Direction */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">方向分析</h2>
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
              <div className="text-[#848E9C]">Long 胜率</div>
              <div className="text-[#0ECB81] font-mono font-bold">{byDirection.long.count ? Math.round((byDirection.long.wins / byDirection.long.count) * 100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">Short 胜率</div>
              <div className="text-[#F6465D] font-mono font-bold">{byDirection.short.count ? Math.round((byDirection.short.wins / byDirection.short.count) * 100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">Long 均PnL</div>
              <div className={`font-mono font-bold ${byDirection.long.avgPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{byDirection.long.avgPnl > 0 ? "+" : ""}{byDirection.long.avgPnl}</div>
            </div>
            <div className="text-center">
              <div className="text-[#848E9C]">Short 均PnL</div>
              <div className={`font-mono font-bold ${byDirection.short.avgPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{byDirection.short.avgPnl > 0 ? "+" : ""}{byDirection.short.avgPnl}</div>
            </div>
          </div>
        </div>

        {/* Close reason */}
        {closeReasonPieData.length > 0 && (
          <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">平仓原因</h2>
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

        {/* Hourly */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">交易时段 (UTC)</h2>
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

      {/* Scatter */}
      {holdDurationVsPnl.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#D1D4DC] mb-3">持仓时长 vs PnL%</h2>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="holdSeconds" name="持仓(秒)" tick={{ fill: "#848E9C", fontSize: 10 }} />
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
