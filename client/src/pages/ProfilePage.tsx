import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { Pencil, Trophy, BarChart3, Award, ChevronRight, Loader2 } from "lucide-react";
import { getRankTier } from "@/lib/types";

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
  department: string | null;
  participantType: string;
}

interface MatchResult {
  id: number;
  competitionId: number;
  finalRank: number;
  totalPnl: number;
  totalPnlPct: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  pointsEarned: number;
  prizeWon: number;
  avgHoldDuration: number | null;
  createdAt: number;
}

/** Convert a 2-char country code to a flag emoji */
function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65; // 'A' = 65
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset);
}

const COUNTRY_NAMES: Record<string, string> = {
  CN: "中国", US: "美国", JP: "日本", KR: "韩国",
  HK: "香港", TW: "台湾", SG: "新加坡", GB: "英国",
  DE: "德国", FR: "法国", CA: "加拿大", AU: "澳大利亚",
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h${rem > 0 ? `${rem}m` : ""}`;
}

export default function ProfilePage() {
  const { token } = useAuth();
  const { t } = useT();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [history, setHistory] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileData, historyData] = await Promise.all([
          apiRequest<ProfileData>("/api/me/profile", { token }),
          apiRequest<MatchResult[]>("/api/me/history?limit=5", { token }),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setHistory(historyData);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">加载失败</p>
          <p className="text-[#848E9C] text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const tier = getRankTier(profile.seasonPoints);
  const totalMatches = history.length;

  // Compute aggregate stats from available history
  const allHistory = history; // we only have the last 5 loaded here
  const totalPnl = allHistory.reduce((sum, r) => sum + r.totalPnl, 0);
  const totalWins = allHistory.reduce((sum, r) => sum + (r.winCount ?? 0), 0);
  const totalLosses = allHistory.reduce((sum, r) => sum + (r.lossCount ?? 0), 0);
  const winRate = (totalWins + totalLosses) > 0 ? ((totalWins / (totalWins + totalLosses)) * 100) : 0;
  const totalPrize = allHistory.reduce((sum, r) => sum + (r.prizeWon ?? 0), 0);
  const bestRank = allHistory.length > 0 ? Math.min(...allHistory.map((r) => r.finalRank)) : 0;
  const avgHoldDuration = allHistory.length > 0
    ? allHistory.reduce((sum, r) => sum + (r.avgHoldDuration ?? 0), 0) / allHistory.length
    : 0;

  const locationParts: string[] = [];
  if (profile.country) {
    locationParts.push(COUNTRY_NAMES[profile.country] ?? profile.country);
  }
  if (profile.region) locationParts.push(profile.region);
  if (profile.city) locationParts.push(profile.city);

  const institutionParts: string[] = [];
  if (profile.institutionName) institutionParts.push(profile.institutionName);
  if (profile.department) institutionParts.push(profile.department);

  const stats = [
    { label: "总比赛", value: totalMatches.toString() },
    { label: "胜率", value: `${winRate.toFixed(1)}%` },
    { label: "总PnL", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(0)}` },
    { label: "均持仓", value: formatDuration(avgHoldDuration) },
    { label: "总奖金", value: `${totalPrize.toFixed(0)}U` },
    { label: "最佳", value: bestRank > 0 ? `#${bestRank}` : "--" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Top Row: Profile Card + Season Points */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Profile Card */}
        <div className="md:col-span-2 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-lg font-display font-bold text-white">
                {profile.displayName || profile.username}
              </h1>
              {profile.displayName && (
                <p className="text-[10px] text-[#848E9C]">@{profile.username}</p>
              )}
            </div>
            <Link
              href="/profile/edit"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              编辑资料
            </Link>
          </div>

          {/* Tier Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{tier.icon}</span>
            <span
              className="text-xs font-display font-bold"
              style={{ color: tier.color }}
            >
              {tier.label}
            </span>
            <span className="text-[10px] font-mono text-[#848E9C]">
              ({Math.round(profile.seasonPoints)}pts)
            </span>
          </div>

          {/* Location */}
          {locationParts.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#D1D4DC] mb-1">
              <span>{countryFlag(profile.country)}</span>
              <span>{locationParts.join(" · ")}</span>
            </div>
          )}

          {/* Institution */}
          {institutionParts.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#D1D4DC] mb-2">
              <span className="text-[#848E9C]">🏫</span>
              <span>{institutionParts.join(" · ")}</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-[11px] text-[#848E9C] mt-2 leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Season Points Curve Placeholder */}
        <div className="md:col-span-3 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col">
          <h3 className="text-xs font-display font-bold text-[#D1D4DC] mb-3">赛季积分曲线</h3>
          <div className="flex-1 min-h-[120px] flex items-center justify-center border border-dashed border-[rgba(255,255,255,0.08)] rounded-lg">
            <div className="text-center">
              <p className="text-[#848E9C] text-[10px]">积分曲线图表</p>
              <p className="text-[#F0B90B] font-mono text-lg font-bold mt-1">
                {Math.round(profile.seasonPoints)} pts
              </p>
              <p className="text-[#848E9C] text-[9px] mt-1">
                {tier.icon} {tier.label} · {tier.leverage}x 杠杆
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-center"
          >
            <div className="text-[#848E9C] text-[9px] mb-1">{stat.label}</div>
            <div className="text-white font-mono text-sm font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/history"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors bg-[#1C2030] border border-[rgba(255,255,255,0.08)]"
        >
          <Trophy className="w-3 h-3" />
          比赛历史
          <ChevronRight className="w-3 h-3" />
        </Link>
        <Link
          href="/profile/analytics"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors bg-[#1C2030] border border-[rgba(255,255,255,0.08)]"
        >
          <BarChart3 className="w-3 h-3" />
          交易分析
          <ChevronRight className="w-3 h-3" />
        </Link>
        <Link
          href="/profile/achievements"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors bg-[#1C2030] border border-[rgba(255,255,255,0.08)]"
        >
          <Award className="w-3 h-3" />
          成就
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Recent Matches */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
          <h3 className="text-xs font-display font-bold text-[#D1D4DC]">最近比赛</h3>
        </div>
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[#848E9C] text-xs">暂无比赛记录</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {history.map((match) => {
              const pnlColor = match.totalPnl >= 0 ? "#0ECB81" : "#F6465D";
              const pnlSign = match.totalPnl >= 0 ? "+" : "";
              return (
                <div
                  key={match.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0B0E11] flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-[#848E9C]">
                      #{match.competitionId}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#D1D4DC]">
                        Rank #{match.finalRank}
                      </span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: pnlColor }}
                      >
                        {pnlSign}{match.totalPnlPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-[9px] text-[#848E9C] mt-0.5">
                      {match.pointsEarned}pts · {match.prizeWon > 0 ? `${match.prizeWon}U` : "0U"}
                    </div>
                  </div>
                  <div className="text-[9px] text-[#848E9C] shrink-0">
                    {formatDate(match.createdAt)}
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
