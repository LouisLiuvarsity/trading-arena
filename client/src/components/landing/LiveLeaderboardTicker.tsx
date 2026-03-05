import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { generateLeaderboard } from '@/lib/mockData';
import { apiRequest } from '@/lib/api';
import { BotBadge } from './shared';
import { Link } from 'wouter';
import type { LeaderboardEntry } from '@/lib/types';

export default function LiveLeaderboardTicker() {
  const { t } = useT();
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => generateLeaderboard(285).slice(0, 50));

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const data = await apiRequest<LeaderboardEntry[]>('/api/public/leaderboard?limit=50');
        if (!cancelled && data && data.length > 0) setEntries(data);
      } catch {
        // keep mock data
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="bg-[#1C2030]/80 border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col" style={{ maxHeight: 520 }}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#D1D4DC]">{t('land.live.title')}</span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0ECB81]/15 text-[#0ECB81] text-[9px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
            LIVE
          </span>
        </div>
        <span className="text-[10px] text-[#5E6673]">{t('land.live.match')}</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_1fr_90px_80px_60px] px-5 py-2 text-[9px] text-[#5E6673] uppercase tracking-wider border-b border-white/[0.04] shrink-0">
        <span>#</span>
        <span>{t('land.pub.player')}</span>
        <span className="text-right">{t('land.pub.return')}</span>
        <span className="text-right">{t('land.pub.pnl')}</span>
        <span className="text-right">{t('land.pub.prize')}</span>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 scrollbar-thin">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="grid grid-cols-[40px_1fr_90px_80px_60px] px-5 items-center hover:bg-white/[0.03] transition-colors"
            style={{ height: 36 }}
          >
            <span className="text-[11px] font-mono text-[#5E6673]">
              {entry.rank <= 3
                ? ['🥇', '🥈', '🥉'][entry.rank - 1]
                : entry.rank}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#D1D4DC] truncate">
              {entry.username}
              {entry.isBot && <BotBadge />}
            </span>
            <span
              className={`text-right text-[11px] font-mono ${
                entry.weightedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {entry.weightedPnl >= 0 ? '+' : ''}
              {((entry.weightedPnl / 5000) * 100).toFixed(2)}%
            </span>
            <span
              className={`text-right text-[11px] font-mono ${
                entry.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {entry.pnl >= 0 ? '+' : ''}
              {entry.pnl.toFixed(1)}
            </span>
            <span className="text-right text-[11px] font-mono text-[#F0B90B]">
              {entry.prizeAmount > 0 ? `${entry.prizeAmount}U` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/[0.06] text-center shrink-0">
        <Link
          href="/leaderboard-public"
          className="text-[11px] text-[#F0B90B] hover:text-[#F0B90B]/80 transition-colors"
        >
          {t('land.live.viewAll')}
        </Link>
      </div>
    </div>
  );
}
