// ============================================================
// Competition Status Bar — v6.0 Epic Countdown
// Home + Language (left) | Big animated countdown (center)
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import type { MatchState } from '@/lib/types';
import { useT } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';

interface Props {
  match: MatchState;
}

/** Split seconds into h/m/s digit pairs */
function splitTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return {
    h1: Math.floor(h / 10), h2: h % 10,
    m1: Math.floor(m / 10), m2: m % 10,
    s1: Math.floor(s / 10), s2: s % 10,
  };
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

  const isLast15Min = remainingSeconds < 900;
  const isLastHour = remainingSeconds < 3600;
  const isLast2Hours = remainingSeconds < 7200;

  const digits = useMemo(() => splitTime(remainingSeconds), [remainingSeconds]);

  // Color scheme based on urgency
  const accentColor = isLast15Min ? '#F6465D' : isLastHour ? '#FF6B35' : isLast2Hours ? '#F0B90B' : '#0ECB81';
  const glowColor = isLast15Min ? 'rgba(246,70,93,0.4)' : isLastHour ? 'rgba(255,107,53,0.3)' : isLast2Hours ? 'rgba(240,185,11,0.2)' : 'rgba(14,203,129,0.15)';
  const digitTextClass = isLast15Min ? 'text-[#F6465D]' : isLastHour ? 'text-[#FF6B35]' : isLast2Hours ? 'text-[#F0B90B]' : 'text-[#D1D4DC]';
  const separatorClass = isLast15Min ? 'text-[#F6465D]' : isLastHour ? 'text-[#FF6B35]' : isLast2Hours ? 'text-[#F0B90B]/60' : 'text-[#848E9C]/40';

  const getBarBg = () => {
    if (isLast15Min) return 'bg-gradient-to-r from-[#F6465D]/15 via-[#0B0E11] to-[#F6465D]/15';
    if (isLastHour) return 'bg-gradient-to-r from-[#FF6B35]/10 via-[#0B0E11] to-[#FF6B35]/10';
    if (isLast2Hours) return 'bg-gradient-to-r from-[#F0B90B]/8 via-[#0B0E11] to-[#F0B90B]/8';
    return 'bg-[#0B0E11]';
  };

  const DigitBox = ({ value, pulse }: { value: number; pulse?: boolean }) => (
    <div
      className={`relative w-[28px] h-[34px] flex items-center justify-center rounded-md font-mono text-lg font-black tabular-nums ${digitTextClass} ${pulse ? 'animate-pulse' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accentColor}20`,
        boxShadow: `0 0 8px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {value}
    </div>
  );

  const Separator = ({ blink }: { blink?: boolean }) => (
    <span className={`font-mono text-lg font-bold mx-0.5 ${separatorClass} ${blink ? 'animate-blink' : ''}`}>:</span>
  );

  return (
    <div className={`${getBarBg()} border-b border-[rgba(255,255,255,0.08)] transition-colors duration-1000`}>
      <div className="flex items-center justify-between px-3 py-1.5">
        {/* Left: Home + Language toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/hub')}
            className="text-[10px] text-[#848E9C] hover:text-[#D1D4DC] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors font-medium"
          >
            {t('status.home')}
          </button>
          <LanguageToggle compact />
        </div>

        {/* Center: Epic countdown */}
        <div className="flex items-center gap-2">
          {match.isCloseOnly && (
            <span className="text-[9px] bg-[#F6465D]/20 text-[#F6465D] px-1.5 py-0.5 rounded font-semibold animate-pulse mr-1">
              {t('status.closeOnly')}
            </span>
          )}

          {/* Progress arc indicator */}
          <div className="relative w-[34px] h-[34px] shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke={accentColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${elapsed * 94.25} 94.25`}
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-[8px] font-bold ${digitTextClass}`}>
                {Math.round(elapsed * 100)}%
              </span>
            </div>
          </div>

          {/* Digit boxes */}
          <div className="flex items-center">
            <DigitBox value={digits.h1} />
            <DigitBox value={digits.h2} />
            <Separator blink={isLast15Min} />
            <DigitBox value={digits.m1} />
            <DigitBox value={digits.m2} />
            <Separator blink={isLast15Min} />
            <DigitBox value={digits.s1} pulse={isLast15Min} />
            <DigitBox value={digits.s2} pulse={isLast15Min} />
          </div>

          {/* Label */}
          <span className={`text-[9px] font-medium ml-1 ${isLast15Min ? 'text-[#F6465D]/80' : 'text-[#848E9C]/60'}`}>
            {isLast15Min ? 'FINAL' : isLastHour ? 'ENDING' : 'LEFT'}
          </span>
        </div>

        {/* Right: spacer for symmetry */}
        <div className="shrink-0 w-[100px]" />
      </div>
    </div>
  );
}
