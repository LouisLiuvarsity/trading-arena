import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useProfile, useMatchHistory } from "@/hooks/useCompetitionData";
import { Link } from "wouter";
import { Pencil, Trophy, BarChart3, Award, ChevronRight, Loader2, Bot } from "lucide-react";
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

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset);
}

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
  const { t, lang } = useT();
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: historyData, isLoading: historyLoading } = useMatchHistory(5);

  const loading = profileLoading || historyLoading;
  const history: MatchResult[] = (historyData as any)?.results ?? historyData ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">{t('common.loadFailed')}</p>
          <p className="text-[#848E9C] text-xs">{(profileError as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const p = profile as ProfileData;
  const tier = getRankTier(p.seasonPoints);
  const totalMatches = history.length;

  const allHistory = history;
  const totalPnl = allHistory.reduce((sum: number, r: MatchResult) => sum + r.totalPnl, 0);
  const totalWins = allHistory.reduce((sum: number, r: MatchResult) => sum + (r.winCount ?? 0), 0);
  const totalLosses = allHistory.reduce((sum: number, r: MatchResult) => sum + (r.lossCount ?? 0), 0);
  const winRate = (totalWins + totalLosses) > 0 ? ((totalWins / (totalWins + totalLosses)) * 100) : 0;
  const totalPrize = allHistory.reduce((sum: number, r: MatchResult) => sum + (r.prizeWon ?? 0), 0);
  const bestRank = allHistory.length > 0 ? Math.min(...allHistory.map((r: MatchResult) => r.finalRank)) : 0;
  const avgHoldDuration = allHistory.length > 0
    ? allHistory.reduce((sum: number, r: MatchResult) => sum + (r.avgHoldDuration ?? 0), 0) / allHistory.length
    : 0;

  const locationParts: string[] = [];
  if (p.country) {
    locationParts.push(t('profileEdit.country.' + p.country));
  }
  if (p.region) locationParts.push(p.region);
  if (p.city) locationParts.push(p.city);

  const institutionParts: string[] = [];
  if (p.institutionName) institutionParts.push(p.institutionName);
  if (p.department) institutionParts.push(p.department);

  const stats = [
    { label: t('profile.totalMatches'), value: totalMatches.toString() },
    { label: t('profile.winRate'), value: `${winRate.toFixed(1)}%` },
    { label: t('profile.totalPnl'), value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(0)}` },
    { label: t('profile.avgHold'), value: formatDuration(avgHoldDuration) },
    { label: t('profile.totalPrize'), value: `${totalPrize.toFixed(0)}U` },
    { label: t('profile.best'), value: bestRank > 0 ? `#${bestRank}` : "--" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-lg font-display font-bold text-white">
                {p.displayName || p.username}
              </h1>
              {p.displayName && (
                <p className="text-[10px] text-[#848E9C]">@{p.username}</p>
              )}
            </div>
            <Link
              href="/profile/edit"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              {t('profile.editProfile')}
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{tier.icon}</span>
            <span
              className="text-xs font-display font-bold"
              style={{ color: tier.color }}
            >
              {tier.label}
            </span>
            <span className="text-[10px] font-mono text-[#848E9C]">
              ({Math.round(p.seasonPoints)}pts)
            </span>
          </div>

          {locationParts.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#D1D4DC] mb-1">
              <span>{countryFlag(p.country)}</span>
              <span>{locationParts.join(" · ")}</span>
            </div>
          )}

          {institutionParts.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#D1D4DC] mb-2">
              <span className="text-[#848E9C]">{"\uD83C\uDFEB"}</span>
              <span>{institutionParts.join(" · ")}</span>
            </div>
          )}

          {p.bio && (
            <p className="text-[11px] text-[#848E9C] mt-2 leading-relaxed">
              {p.bio}
            </p>
          )}
        </div>

        <div className="md:col-span-3 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col">
          <h3 className="text-xs font-display font-bold text-[#D1D4DC] mb-3">{t('profile.seasonCurve')}</h3>
          <div className="flex-1 min-h-[120px] flex items-center justify-center border border-dashed border-[rgba(255,255,255,0.08)] rounded-lg">
            <div className="text-center">
              <p className="text-[#848E9C] text-[10px]">{t('profile.curveChart')}</p>
              <p className="text-[#F0B90B] font-mono text-lg font-bold mt-1">
                {Math.round(p.seasonPoints)} pts
              </p>
              <p className="text-[#848E9C] text-[9px] mt-1">
                {tier.icon} {tier.label} · {t('profile.leverage', { n: tier.leverage })}
              </p>
            </div>
          </div>
        </div>
      </div>

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

      <div className="flex flex-wrap gap-2">
        <Link
          href="/history"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors bg-[#1C2030] border border-[rgba(255,255,255,0.08)]"
        >
          <Trophy className="w-3 h-3" />
          {t('profile.matchHistory')}
          <ChevronRight className="w-3 h-3" />
        </Link>
        <Link
          href="/profile/analytics"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors bg-[#1C2030] border border-[rgba(255,255,255,0.08)]"
        >
          <BarChart3 className="w-3 h-3" />
          {t('profile.analytics')}
          <ChevronRight className="w-3 h-3" />
        </Link>
        <Link
          href="/profile/achievements"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors bg-[#1C2030] border border-[rgba(255,255,255,0.08)]"
        >
          <Award className="w-3 h-3" />
          {t('profile.achievements')}
          <ChevronRight className="w-3 h-3" />
        </Link>
        <Link
          href="/agents"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors bg-[#1C2030] border border-[rgba(255,255,255,0.08)]"
        >
          <Bot className="w-3 h-3" />
          {lang === "zh" ? "用户中心" : "Agent Center"}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
          <h3 className="text-xs font-display font-bold text-[#D1D4DC]">{t('profile.recentMatches')}</h3>
        </div>
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[#848E9C] text-xs">{t('profile.noRecords')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {history.map((match: MatchResult) => {
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
