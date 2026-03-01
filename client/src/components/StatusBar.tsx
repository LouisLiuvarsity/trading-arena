// ============================================================
// Competition Status Bar — Top bar with all key metrics
// Design: Gradient background that shifts warm as match progresses
// Compact layout with clear visual hierarchy
// ============================================================

import { useState, useEffect } from 'react';
import type { AccountState, MatchState, CycleState } from '@/lib/types';

interface Props {
  account: AccountState;
  match: MatchState;
  cycle: CycleState;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function StatusBar({ account, match, cycle }: Props) {
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

  const promotionOk = account.promotionScore >= account.promotionThreshold;
  const pnlPositive = account.pnl >= 0;

  return (
    <div className={`${getBarBg()} border-b border-[rgba(255,255,255,0.08)] transition-colors duration-1000`}>
      {/* Main metrics row */}
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
        {/* Left: Logo + Match info */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/dRgYLfmNL5QAGwfaYvi5WU/arena-logo-dt5Xe5xWht3o2sSpvRZR9E.webp"
              alt="Arena"
              className="w-4 h-4"
            />
            <span className="font-display font-bold text-[#F0B90B] text-xs">ARENA</span>
          </div>
          <div className="h-3.5 w-px bg-white/10" />
          <span className="text-[#848E9C]">Match <span className="font-mono text-[#D1D4DC] font-semibold">{match.matchNumber}/3</span></span>
          <span className="text-[#848E9C]">Stage <span className="font-mono text-[#F0B90B] font-semibold">{account.stage}</span></span>
        </div>

        {/* Center: Key metrics in compact format */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">Equity</span>
            <span className="font-mono font-semibold text-[#D1D4DC]">{account.equity.toFixed(1)}U</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">PnL</span>
            <span className={`font-mono font-semibold ${pnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {pnlPositive ? '+' : ''}{account.pnl.toFixed(1)}U ({pnlPositive ? '+' : ''}{account.pnlPct.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">Rank</span>
            <span className="font-mono font-semibold text-[#D1D4DC]">#{account.rank}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">Promotion</span>
            <span className={`font-mono font-semibold ${promotionOk ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {account.promotionScore} {promotionOk ? '✓' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">Share</span>
            <span className="font-mono font-semibold text-[#F0B90B]">{account.profitSharePct}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">Withdrawable</span>
            <span className="font-mono font-semibold text-[#0ECB81]">{account.withdrawable.toFixed(1)}U</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">Score</span>
            <span className="font-mono text-[#D1D4DC]">{account.participationScore}/4000</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848E9C]">Trades</span>
            <span className="font-mono text-[#D1D4DC]">{account.tradesUsed}/{account.tradesMax}</span>
          </div>
        </div>

        {/* Right: Countdown timer */}
        <div className="flex items-center gap-2 shrink-0">
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

      {/* Cycle progress mini bar */}
      <div className="flex items-center gap-2 px-3 py-0.5 border-t border-[rgba(255,255,255,0.04)] text-[10px]">
        <span className="text-[#848E9C]">Cycle:</span>
        {cycle.matches.map((m, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${
              m.status === 'completed' ? 'bg-[#0ECB81]' :
              m.status === 'active' ? 'bg-[#F0B90B] animate-pulse' :
              'bg-[#848E9C]/30'
            }`} />
            <span className={m.status === 'active' ? 'text-[#F0B90B]' : 'text-[#848E9C]'}>
              G{m.matchNumber}
              {m.pnl !== undefined && (
                <span className={m.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  {' '}{m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(1)}U
                </span>
              )}
            </span>
          </div>
        ))}
        <div className="h-2.5 w-px bg-white/10" />
        <span className="text-[#848E9C]">Avg Score: <span className={`font-mono ${cycle.avgPromotionScore >= 700 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{cycle.avgPromotionScore}</span></span>
        <div className="h-2.5 w-px bg-white/10" />
        <span className="text-[#848E9C]">Total Withdrawable: <span className="font-mono text-[#0ECB81]">{cycle.cumulativeWithdrawable.toFixed(1)}U</span></span>
      </div>
    </div>
  );
}
