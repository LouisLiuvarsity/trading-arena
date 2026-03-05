import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { useStatsOverview, useCountryStats, useInstitutions } from "@/hooks/useCompetitionData";
import { Globe, Building2, Users, Trophy, BarChart3, DollarSign, ChevronRight } from "lucide-react";

interface OverviewStats {
  totalPlayers: number;
  totalTrades: number;
  totalCompetitions: number;
  totalPrize: number;
  totalCountries: number;
  totalInstitutions: number;
}

interface CountryRow {
  country: string;
  participantCount: number;
  totalPrize: number;
  avgPnlPct: number;
  competitionCount: number;
}

interface InstitutionRow {
  institutionId: number | null;
  name: string;
  country: string;
  memberCount: number;
  totalPrize: number;
  avgPnlPct: number;
  bestRank: number;
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-[#F0B90B]/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#F0B90B]" />
      </div>
      <div>
        <div className="text-white font-mono text-lg font-bold">{value}</div>
        <div className="text-[#848E9C] text-[10px]">{label}</div>
      </div>
    </div>
  );
}

export default function StatsOverviewPage() {
  const { t } = useT();
  const { data: overview, isLoading: ovLoading } = useStatsOverview();
  const { data: countries = [] } = useCountryStats();
  const { data: institutions = [] } = useInstitutions(10);

  const ov = overview as OverviewStats | undefined;
  const loading = ovLoading;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white mb-1">{t('statspage.title')}</h1>
        <p className="text-[#848E9C] text-sm">{t('statspage.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={Users} label={t('statspage.totalPlayers')} value={loading ? "..." : ov?.totalPlayers ?? 0} />
        <StatCard icon={Trophy} label={t('statspage.totalComps')} value={loading ? "..." : ov?.totalCompetitions ?? 0} />
        <StatCard icon={Globe} label={t('statspage.countries')} value={loading ? "..." : ov?.totalCountries ?? 0} />
        <StatCard icon={Building2} label={t('statspage.institutions')} value={loading ? "..." : ov?.totalInstitutions ?? 0} />
        <StatCard icon={BarChart3} label={t('statspage.totalTrades')} value={loading ? "..." : (ov?.totalTrades ?? 0).toLocaleString()} />
        <StatCard icon={DollarSign} label={t('statspage.totalPrize')} value={loading ? "..." : `${ov?.totalPrize ?? 0} USDT`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#D1D4DC]">{t('statspage.countryRanking')}</h2>
          </div>
          {(countries as CountryRow[]).length === 0 ? (
            <p className="text-[#848E9C] text-xs">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {(countries as CountryRow[]).slice(0, 10).map((row, i) => (
                <div key={row.country} className="flex items-center gap-3 text-[11px]">
                  <span className="text-[#848E9C] w-5 text-right font-mono">#{i + 1}</span>
                  <span className="text-lg leading-none">{countryFlag(row.country)}</span>
                  <span className="text-[#D1D4DC] flex-1">{row.country}</span>
                  <span className="text-[#848E9C] font-mono">{t('common.people', { n: row.participantCount })}</span>
                  <span className={`font-mono ${row.avgPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {row.avgPnlPct > 0 ? "+" : ""}{row.avgPnlPct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#D1D4DC]">{t('statspage.instRanking')}</h2>
            <Link href="/stats/institutions" className="text-[10px] text-[#F0B90B] hover:underline flex items-center gap-0.5">
              {t('common.viewAll')} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {(institutions as InstitutionRow[]).length === 0 ? (
            <p className="text-[#848E9C] text-xs">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {(institutions as InstitutionRow[]).map((row, i) => (
                <div key={row.name + i} className="flex items-center gap-3 text-[11px]">
                  <span className="text-[#848E9C] w-5 text-right font-mono">#{i + 1}</span>
                  <span className="text-lg leading-none">{countryFlag(row.country)}</span>
                  <span className="text-[#D1D4DC] flex-1 truncate">{row.name}</span>
                  <span className="text-[#848E9C] font-mono">{t('common.people', { n: row.memberCount })}</span>
                  <span className={`font-mono ${row.avgPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {row.avgPnlPct > 0 ? "+" : ""}{row.avgPnlPct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
