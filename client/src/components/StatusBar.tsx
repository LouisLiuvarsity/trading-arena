// ============================================================
// Competition Status Bar — v4.0 Top bar with all key metrics
// Monthly: 15 regular + 1 grand final, points system, fixed prize
// ============================================================

import { useState, useEffect } from 'react';
import type { AccountState, MatchState, SeasonState } from '@/lib/types';
import { useT } from '@/lib/i18n';

interface Props {
  account: AccountState;
  match: MatchState;
  season: SeasonState;
  onLogout?: () => void;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function StatusBar({ account, match, season, onLogout }: Props) {
  const { t, lang, setLang } = useT();
  const [remainingSeconds, setRemainingSeconds] = useState(match.remainingSeconds);
  const [elapsed, setElapsed] = useState(match.elapsed);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, (match.endTime - now) / 1000);
      const elapsedPct = Math.min(1, (now - match.startTime) / (match.endTime - match.startTime));
      setRemainingSeconds(remaining);
      setElapsed(elapsedPct);
    }, 1000);
    return () => clearInterval(interval);
  }, [match]);

  const isLastHour = remainingSeconds < 3600;
  const isLast2Hours = remainingSeconds < 7200;
  const isLast15Min = remainingSeconds < 900;

  const getBarBg = () => {
    if (isLast15Min) return 'bg-gradient-to-r from-[#F6465D]/20 to-[#F6465D]/10';
    if (isLastHour) return 'bg-gradient-to-r from-[#FF6B35]/15 to-[#F6465D]/10';
    if (isLast2Hours) return 'bg-gradient-to-r from-[#F0B90B]/10 to-[#FF6B35]/10';
    return 'bg-[#0B0E11]';
  };

  const pnlPositive = account.pnl >= 0;

  // Tier badge colors
  const tierColors: Record<string, string> = {
    iron: '#5E6673',
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#F0B90B',
    platinum: '#00D4AA',
    diamond: '#B9F2FF',
  };
  const tierColor = tierColors[account.rankTier] || '#848E9C';

  return (
    <div className={`${getBarBg()} border-b border-[rgba(255,255,255,0.08)] transition-colors duration-1000`}>
      {/* Main metrics row */}
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
        {/* Left: Home + Language toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onLogout} className="text-[10px] text-[#848E9C] hover:text-[#D1D4DC] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors font-medium">{t('status.home')}</button>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="text-[10px] text-[#848E9C] hover:text-[#D1D4DC] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors font-medium">{lang === 'zh' ? 'EN' : '中'}</button>
        </div>

        {/* Center: Key metrics */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">{t('status.equity')}</span>
            <span className="font-mono font-semibold text-[#D1D4DC]">{account.equity.toFixed(1)}U</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">{t('status.pnl')}</span>
            <span className={`font-mono font-semibold ${pnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {pnlPositive ? '+' : ''}{account.pnl.toFixed(1)}U ({pnlPositive ? '+' : ''}{account.pnlPct.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">{t('status.rank')}</span>
            <span className="font-mono font-semibold text-[#D1D4DC]">#{account.rank}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">{t('status.prize')}</span>
            <span className={`font-mono font-semibold ${account.prizeAmount > 0 ? 'text-[#F0B90B]' : 'text-[#5E6673]'}`}>
              {account.prizeAmount > 0 ? `${account.prizeAmount}U` : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">{t('status.points')}</span>
            <span className="font-mono font-semibold text-[#F0B90B]">+{account.matchPoints}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">{t('status.eligible')}</span>
            {account.prizeEligible ? (
              <span className="text-[#0ECB81] font-semibold text-[10px]">✓</span>
            ) : (
              <span className="text-[#F6465D] text-[10px]">{t('status.needTrades', { n: 5 })}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">{t('status.trades')}</span>
            <span className="font-mono text-[#D1D4DC]">{account.tradesUsed}/{account.tradesMax}</span>
          </div>
        </div>

        {/* Right: Countdown timer */}
        <div className="flex items-center gap-2 shrink-0">
          {match.isCloseOnly && (
            <span className="text-[9px] bg-[#F6465D]/20 text-[#F6465D] px-1.5 py-0.5 rounded font-semibold animate-pulse">
              {t('status.closeOnly')}
            </span>
          )}
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${elapsed * 100}%`,
                background: isLast15Min ? '#F6465D' : isLastHour ? '#FF6B35' : isLast2Hours ? '#F0B90B' : '#0ECB81',
              }}
            />
          </div>
          <div className={`font-mono text-sm font-bold tabular-nums ${
            isLast15Min ? 'text-[#F6465D] animate-blink' :
            isLastHour ? 'text-[#FF6B35]' :
            isLast2Hours ? 'text-[#F0B90B]' :
            'text-[#D1D4DC]'
          }`}>
            {formatCountdown(remainingSeconds)}
          </div>
        </div>
      </div>

      {/* Season progress mini bar */}
      <div className="flex items-center gap-2 px-3 py-0.5 border-t border-[rgba(255,255,255,0.04)] text-[10px]">
        <span className="text-[#848E9C]">{match.monthLabel}:</span>
        {season.matches.slice(0, 8).map((m, i: number) => (
          <div key={i} className="flex items-center gap-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              m.status === 'completed' ? 'bg-[#0ECB81]' :
              m.status === 'active' ? 'bg-[#F0B90B] animate-pulse' :
              'bg-[#848E9C]/30'
            }`} />
            <span className={`text-[9px] ${m.status === 'active' ? 'text-[#F0B90B]' : 'text-[#5E6673]'}`}>
              {m.matchNumber}
            </span>
          </div>
        ))}
        {season.matches.length > 8 && <span className="text-[#5E6673]">...</span>}
        <div className="h-2.5 w-px bg-white/10" />
        <span className="text-[#848E9C]">
          {t('status.seasonPoints')} <span className="font-mono text-[#F0B90B] font-semibold">{season.totalPoints}</span>
        </span>
        <div className="h-2.5 w-px bg-white/10" />
        <span className="text-[#848E9C]">
          {t('status.matchesPlayed')} <span className="font-mono text-[#D1D4DC]">{season.matchesPlayed}/15</span>
        </span>
        <div className="h-2.5 w-px bg-white/10" />
        <span className={season.grandFinalQualified ? 'text-[#0ECB81]' : 'text-[#848E9C]'}>
          {t('status.grandFinalLabel')} {season.grandFinalQualified ? t('status.qualified') : t('status.notQualified')}
        </span>
        <div className="h-2.5 w-px bg-white/10" />
        <span className="text-[#F0B90B] text-[9px]">{t('status.prizePool')} {match.prizePool}U</span>
      </div>
    </div>
  );
}
