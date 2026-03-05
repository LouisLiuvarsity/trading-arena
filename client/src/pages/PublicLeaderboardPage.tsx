// ============================================================
// Public Leaderboard & Statistics Page
// Accessible without authentication at /leaderboard-public
// ============================================================

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { apiRequest } from '@/lib/api';
import { generateLeaderboard, generateAllTimeLeaderboard } from '@/lib/mockData';
import { RANK_TIERS } from '@/lib/types';
import type { LeaderboardEntry, AllTimeLeaderboardEntry } from '@/lib/types';
import LandingNavbar from '@/components/landing/LandingNavbar';
import { BotBadge, TierBadge } from '@/components/landing/shared';
import { Trophy, Globe, Building2, Users, Medal, BarChart3 } from 'lucide-react';

// ─── Interfaces ─────────────────────────────────────────────
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
  if (!code || code.length !== 2) return '';
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

// ─── Tab Button ─────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-[12px] font-medium rounded-lg transition-colors ${
        active
          ? 'bg-[#F0B90B]/10 text-[#F0B90B]'
          : 'text-[#5E6673] hover:text-[#848E9C] hover:bg-white/[0.03]'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Current Match Tab ──────────────────────────────────────
function CurrentMatchTab() {
  const { t } = useT();
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => generateLeaderboard(285).slice(0, 100));

  useEffect(() => {
    apiRequest<LeaderboardEntry[]>('/api/public/leaderboard?limit=100')
      .then((data) => { if (data && data.length > 0) setEntries(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[#1C2030]/60 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[#5E6673] text-[9px] uppercase tracking-wider border-b border-white/[0.05]">
              <th className="py-3 px-4 text-left w-12">#</th>
              <th className="py-3 px-3 text-left">{t('land.pub.player')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.return')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.pnl')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.prize')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.points')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.rank} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-4 font-mono text-[#5E6673]">
                  {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-[#D1D4DC] flex items-center gap-1.5">
                    {e.username}
                    {e.isBot && <BotBadge />}
                    {!e.prizeEligible && (
                      <span className="text-[9px] text-[#F6465D]">{t('land.lb.notEligible')}</span>
                    )}
                  </span>
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${e.weightedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {e.weightedPnl >= 0 ? '+' : ''}{((e.weightedPnl / 5000) * 100).toFixed(2)}%
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${e.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {e.pnl >= 0 ? '+' : ''}{e.pnl.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#F0B90B]">
                  {e.prizeAmount > 0 ? `${e.prizeAmount}U` : '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#D1D4DC]">
                  {e.matchPoints > 0 ? `+${e.matchPoints}` : '0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Season Ranking Tab ─────────────────────────────────────
function SeasonRankingTab() {
  const { t, lang } = useT();
  const [entries] = useState<AllTimeLeaderboardEntry[]>(() => generateAllTimeLeaderboard());

  return (
    <div className="bg-[#1C2030]/60 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[#5E6673] text-[9px] uppercase tracking-wider border-b border-white/[0.05]">
              <th className="py-3 px-4 text-left w-12">#</th>
              <th className="py-3 px-3 text-left">{t('land.pub.player')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.points')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.matches')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.winRate')}</th>
              <th className="py-3 px-3 text-center">{t('land.pub.tier')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.rank} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-4 font-mono text-[#5E6673]">
                  {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-[#D1D4DC] flex items-center gap-1.5">
                    {e.username}
                    {e.isBot && <BotBadge />}
                    {e.grandFinalQualified && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0ECB81]/15 text-[#0ECB81] font-medium">
                        {t('land.lb.qualified')}
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#F0B90B] font-bold">
                  {e.seasonPoints}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#D1D4DC]">
                  {e.matchesPlayed}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#D1D4DC]">
                  {e.winRate.toFixed(0)}%
                </td>
                <td className="py-2.5 px-3 text-center">
                  <TierBadge tier={e.rankTier} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Country Tab ────────────────────────────────────────────
function CountryTab() {
  const { t } = useT();
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<CountryRow[]>('/api/stats/countries')
      .then((data) => { if (data) setCountries(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-[#5E6673] text-[12px]">Loading...</div>;
  if (countries.length === 0) return <div className="py-12 text-center text-[#5E6673] text-[12px]">{t('land.pub.noData')}</div>;

  return (
    <div className="bg-[#1C2030]/60 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[#5E6673] text-[9px] uppercase tracking-wider border-b border-white/[0.05]">
              <th className="py-3 px-4 text-left w-12">#</th>
              <th className="py-3 px-3 text-left">{t('land.pub.country')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.participants')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.avgPnl')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.totalPrize')}</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c, i) => (
              <tr key={c.country} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-4 font-mono text-[#5E6673]">{i + 1}</td>
                <td className="py-2.5 px-3 text-[#D1D4DC]">
                  {countryFlag(c.country)} {c.country}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#D1D4DC]">{c.participantCount}</td>
                <td className={`py-2.5 px-3 text-right font-mono ${c.avgPnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {c.avgPnlPct >= 0 ? '+' : ''}{c.avgPnlPct.toFixed(2)}%
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#F0B90B]">
                  {c.totalPrize > 0 ? `${c.totalPrize.toFixed(0)}U` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Institution Tab (School / Company) ─────────────────────
function InstitutionTab({ type }: { type: 'school' | 'company' }) {
  const { t } = useT();
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<InstitutionRow[]>(`/api/stats/institutions?limit=50&type=${type}`)
      .then((data) => { if (data) setInstitutions(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) return <div className="py-12 text-center text-[#5E6673] text-[12px]">Loading...</div>;
  if (institutions.length === 0) return <div className="py-12 text-center text-[#5E6673] text-[12px]">{t('land.pub.noData')}</div>;

  return (
    <div className="bg-[#1C2030]/60 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[#5E6673] text-[9px] uppercase tracking-wider border-b border-white/[0.05]">
              <th className="py-3 px-4 text-left w-12">#</th>
              <th className="py-3 px-3 text-left">{t('land.pub.institution')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.members')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.avgPnl')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.bestRank')}</th>
              <th className="py-3 px-3 text-right">{t('land.pub.totalPrize')}</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst, i) => (
              <tr key={inst.institutionId ?? inst.name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-4 font-mono text-[#5E6673]">{i + 1}</td>
                <td className="py-2.5 px-3 text-[#D1D4DC]">
                  {countryFlag(inst.country)} {inst.name}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#D1D4DC]">{inst.memberCount}</td>
                <td className={`py-2.5 px-3 text-right font-mono ${inst.avgPnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {inst.avgPnlPct >= 0 ? '+' : ''}{inst.avgPnlPct.toFixed(2)}%
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#D1D4DC]">
                  #{inst.bestRank}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#F0B90B]">
                  {inst.totalPrize > 0 ? `${inst.totalPrize.toFixed(0)}U` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
type TabKey = 'current' | 'season' | 'country' | 'school' | 'company';

export default function PublicLeaderboardPage() {
  const { t } = useT();
  const [tab, setTab] = useState<TabKey>('current');

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'current', label: t('land.pub.tabCurrent'), icon: Trophy },
    { key: 'season', label: t('land.pub.tabSeason'), icon: Medal },
    { key: 'country', label: t('land.pub.tabCountry'), icon: Globe },
    { key: 'school', label: t('land.pub.tabSchool'), icon: Building2 },
    { key: 'company', label: t('land.pub.tabCompany'), icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <LandingNavbar />

      <main className="pt-20 pb-12 max-w-6xl mx-auto px-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">{t('land.pub.title')}</h1>
        <p className="text-[#848E9C] text-sm mb-6">{t('land.lb.subtitle')}</p>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <TabBtn key={key} active={tab === key} onClick={() => setTab(key)}>
              <span className="inline-flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            </TabBtn>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'current' && <CurrentMatchTab />}
        {tab === 'season' && <SeasonRankingTab />}
        {tab === 'country' && <CountryTab />}
        {tab === 'school' && <InstitutionTab type="school" />}
        {tab === 'company' && <InstitutionTab type="company" />}
      </main>
    </div>
  );
}
