// ============================================================
// Competition Status Bar — Top bar with all key metrics
// Design: Gradient background that shifts warm as match progresses
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

  // Determine urgency level based on elapsed time
  const isLastHour = remainingSeconds < 3600;
  const isLast2Hours = remainingSeconds < 7200;
  const isLast15Min = remainingSeconds < 900;

  // Gradient shifts from cool blue to warm orange/red as match progresses
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
      <div className="flex items-center justify-between px-4 py-2 text-xs">
        {/* Left: Match info */}
        <div className="flex items-center gap-4">
          {/* Logo + Match */}
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/dRgYLfmNL5QAGwfaYvi5WU/arena-logo-dt5Xe5xWht3o2sSpvRZR9E.webp"
              alt="Arena"
              className="w-5 h-5"
            />
            <span className="font-display font-bold text-[#F0B90B] text-sm">ARENA</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#848E9C]">Match</span>
            <span className="font-mono text-[#D1D4DC] font-semibold">{match.matchNumber}/3</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#848E9C]">Stage</span>
            <span className="font-mono text-[#F0B90B] font-semibold">{account.stage}</span>
          </div>
        </div>

        {/* Center: Key metrics */}
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">Equity</div>
            <div className="font-mono font-semibold text-[#D1D4DC]">{account.equity.toFixed(1)}U</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">PnL</div>
            <div className={`font-mono font-semibold ${pnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {pnlPositive ? '+' : ''}{account.pnl.toFixed(1)}U ({pnlPositive ? '+' : ''}{account.pnlPct.toFixed(1)}%)
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">Rank</div>
            <div className="font-mono font-semibold text-[#D1D4DC]">#{account.rank}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">Promotion</div>
            <div className={`font-mono font-semibold ${promotionOk ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {account.promotionScore} {promotionOk ? '✓' : `(need ${account.promotionThreshold})`}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">Share</div>
            <div className="font-mono font-semibold text-[#F0B90B]">{account.profitSharePct}%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">Withdrawable</div>
            <div className="font-mono font-semibold text-[#0ECB81]">{account.withdrawable.toFixed(1)}U</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">Score</div>
            <div className="font-mono text-[#D1D4DC]">{account.participationScore}/4000</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#848E9C]">Trades</div>
            <div className="font-mono text-[#D1D4DC]">{account.tradesUsed}/{account.tradesMax}</div>
          </div>
        </div>

        {/* Right: Countdown */}
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${elapsed * 100}%`,
                background: isLast15Min
                  ? '#F6465D'
                  : isLastHour
                  ? '#FF6B35'
                  : isLast2Hours
                  ? '#F0B90B'
                  : '#0ECB81',
              }}
            />
          </div>
          {/* Timer */}
          <div className={`font-mono text-base font-bold tabular-nums ${
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
      <div className="flex items-center gap-3 px-4 py-1 border-t border-[rgba(255,255,255,0.04)] text-[10px]">
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
        <div className="h-3 w-px bg-white/10" />
        <span className="text-[#848E9C]">Avg Score:</span>
        <span className={`font-mono ${cycle.avgPromotionScore >= 700 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {cycle.avgPromotionScore}
        </span>
        <div className="h-3 w-px bg-white/10" />
        <span className="text-[#848E9C]">Total Withdrawable:</span>
        <span className="font-mono text-[#0ECB81]">{cycle.cumulativeWithdrawable.toFixed(1)}U</span>
        <div className="ml-auto text-[#848E9C]">
          Target: <span className="text-[#F0B90B]">{cycle.promotionTarget}</span>
        </div>
      </div>
    </div>
  );
}
