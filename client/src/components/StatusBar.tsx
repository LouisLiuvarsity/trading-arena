// ============================================================
// Competition Status Bar — v5.0 Minimal: Home + Language + Countdown
// ============================================================

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import type { MatchState } from '@/lib/types';
import { useT } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';

interface Props {
  match: MatchState;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function StatusBar({ match }: Props) {
  const { t } = useT();
  const [, navigate] = useLocation();
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

  return (
    <div className={`${getBarBg()} border-b border-[rgba(255,255,255,0.08)] transition-colors duration-1000`}>
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
        {/* Left: Home + Language toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate('/hub')} className="text-[10px] text-[#848E9C] hover:text-[#D1D4DC] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors font-medium">{t('status.home')}</button>
          <LanguageToggle compact />
        </div>

        {/* Center: Countdown timer */}
        <div className="flex items-center gap-2">
          {match.isCloseOnly && (
            <span className="text-[9px] bg-[#F6465D]/20 text-[#F6465D] px-1.5 py-0.5 rounded font-semibold animate-pulse">
              {t('status.closeOnly')}
            </span>
          )}
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
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

        {/* Right: empty spacer for symmetry */}
        <div className="shrink-0 w-[100px]" />
      </div>
    </div>
  );
}
