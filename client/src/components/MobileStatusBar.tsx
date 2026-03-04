// ============================================================
// Mobile Status Bar — Compact 2-row status bar for mobile portrait
// Row 1: Logo + Match info + Countdown
// Row 2: Key metrics (Equity, PnL, Rank, Trades)
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

export default function MobileStatusBar({ account, match, season, onLogout }: Props) {
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
  const isLast15Min = remainingSeconds < 900;
  const pnlPositive = account.pnl >= 0;

  const tierColors: Record<string, string> = {
    iron: '#5E6673', bronze: '#CD7F32', silver: '#C0C0C0',
    gold: '#F0B90B', platinum: '#00D4AA', diamond: '#B9F2FF',
  };
  const tierColor = tierColors[account.rankTier] || '#848E9C';

  const getBarBg = () => {
    if (isLast15Min) return 'bg-gradient-to-r from-[#F6465D]/20 to-[#F6465D]/10';
    if (isLastHour) return 'bg-gradient-to-r from-[#FF6B35]/15 to-[#F6465D]/10';
    return 'bg-[#0B0E11]';
  };

  return (
    <div className={`${getBarBg()} border-b border-[rgba(255,255,255,0.08)] transition-colors duration-1000`}>
      {/* Row 1: Logo + Match + Timer */}
      <div className="flex items-center justify-between px-2.5 py-1 text-[10px]">
        <div className="flex items-center gap-2">
          <button onClick={onLogout} className="text-[9px] text-[#848E9C] hover:text-[#D1D4DC] px-1 py-0.5 rounded bg-white/5 font-medium">{t('status.home')}</button>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="text-[9px] text-[#848E9C] hover:text-[#D1D4DC] px-1 py-0.5 rounded bg-white/5 font-medium">{lang === 'zh' ? 'EN' : '中'}</button>
        </div>

        <div className="flex items-center gap-1.5">
          {match.isCloseOnly && (
            <span className="text-[8px] bg-[#F6465D]/20 text-[#F6465D] px-1 py-0.5 rounded font-semibold animate-pulse">
              {t('status.closeOnlyShort')}
            </span>
          )}
          <div className="w-10 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${elapsed * 100}%`,
                background: isLast15Min ? '#F6465D' : isLastHour ? '#FF6B35' : '#0ECB81',
              }}
            />
          </div>
          <span className={`font-mono text-[11px] font-bold tabular-nums ${
            isLast15Min ? 'text-[#F6465D] animate-blink' : isLastHour ? 'text-[#FF6B35]' : 'text-[#D1D4DC]'
          }`}>
            {formatCountdown(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Row 2: Key metrics */}
      <div className="flex items-center justify-between px-2.5 py-1 border-t border-[rgba(255,255,255,0.04)] text-[10px]">
        <div className="flex items-center gap-1">
          <span className="text-[#848E9C]">{t('mstatus.eq')}</span>
          <span className="font-mono font-semibold text-[#D1D4DC]">{account.equity.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#848E9C]">{t('status.pnl')}</span>
          <span className={`font-mono font-semibold ${pnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {pnlPositive ? '+' : ''}{account.pnl.toFixed(1)} ({pnlPositive ? '+' : ''}{account.pnlPct.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#848E9C]">#</span>
          <span className="font-mono font-semibold text-[#D1D4DC]">{account.rank}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#848E9C]">{t('mstatus.tr')}</span>
          <span className="font-mono text-[#D1D4DC]">{account.tradesUsed}/{account.tradesMax}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#848E9C]">{t('mstatus.pts')}</span>
          <span className="font-mono text-[#F0B90B]">+{account.matchPoints}</span>
        </div>
      </div>
    </div>
  );
}
