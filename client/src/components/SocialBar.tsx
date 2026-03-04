// ============================================================
// Social Pressure Bar — Bottom bar with crowd data + emotional triggers
// Design: Compact horizontal bar with animated indicators
// Key emotional triggers: L/S ratio shifts, loss distribution,
// trading frequency comparison, promotion zone density
// ============================================================

import { memo, useState, useEffect } from 'react';
import type { SocialData, AccountState } from '@/lib/types';

interface Props {
  social: SocialData;
  account: AccountState;
}

function SocialBar({ social, account }: Props) {
  const [flashField, setFlashField] = useState<string | null>(null);

  // Randomly flash a field to draw attention
  useEffect(() => {
    let flashTimeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      const fields = ['ls', 'pnl', 'trades', 'zone', 'overtaken', 'streak'];
      const pick = fields[Math.floor(Math.random() * fields.length)];
      setFlashField(pick);
      flashTimeout = setTimeout(() => setFlashField(null), 1200);
    }, 8000);
    return () => { clearInterval(interval); clearTimeout(flashTimeout); };
  }, []);

  const tradeGap = Math.max(0, social.avgTradesPerPerson - account.tradesUsed);
  const isTrailingTrades = tradeGap > 2;
  const isOvertaken = social.tradersOvertakenYou > social.youOvertook;
  const lsDelta = social.longPctDelta;

  return (
    <div className="flex items-center gap-0 px-0 py-0 border-t border-[rgba(255,255,255,0.08)] bg-[#0B0E11] text-[10px] overflow-x-auto">

      {/* L/S Ratio with delta */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-[rgba(255,255,255,0.06)] transition-colors ${flashField === 'ls' ? 'bg-white/[0.03]' : ''}`}>
        <span className="text-[#848E9C] shrink-0">L/S</span>
        <span className="text-[#0ECB81] font-mono tabular-nums">{social.longPct}%</span>
        <div className="w-14 h-1.5 bg-[#F6465D]/30 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-[#0ECB81] rounded-full transition-all duration-500"
            style={{ width: `${social.longPct}%` }}
          />
        </div>
        <span className="text-[#F6465D] font-mono tabular-nums">{social.shortPct}%</span>
        {lsDelta !== 0 && (
          <span className={`font-mono text-[9px] ${lsDelta > 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {lsDelta > 0 ? '▲' : '▼'}{Math.abs(lsDelta).toFixed(1)}%
          </span>
        )}
        <span className="text-[#848E9C] text-[8px]">5m</span>
      </div>

      {/* Profit/Loss Distribution with averages */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-[rgba(255,255,255,0.06)] transition-colors ${flashField === 'pnl' ? 'bg-white/[0.03]' : ''}`}>
        <span className="text-[#848E9C] shrink-0">Win/Loss</span>
        <span className="text-[#0ECB81] font-mono tabular-nums">{social.profitablePct}%</span>
        <span className="text-[#848E9C]">/</span>
        <span className="text-[#F6465D] font-mono tabular-nums">{social.losingPct}%</span>
        <span className="text-[#848E9C] mx-0.5">·</span>
        <span className="text-[#0ECB81] font-mono text-[9px]">avg+{social.avgProfitPct}%</span>
        <span className="text-[#F6465D] font-mono text-[9px]">avg{social.avgLossPct}%</span>
      </div>

      {/* Trading Activity — compare with user */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-[rgba(255,255,255,0.06)] transition-colors ${flashField === 'trades' ? 'bg-white/[0.03]' : ''}`}>
        <span className="text-[#848E9C] shrink-0">Avg Trades</span>
        <span className="text-[#D1D4DC] font-mono tabular-nums">{social.avgTradesPerPerson.toFixed(1)}</span>
        <span className="text-[#848E9C]">·</span>
        <span className={`font-mono tabular-nums ${isTrailingTrades ? 'text-[#F0B90B]' : 'text-[#D1D4DC]'}`}>
          You: {account.tradesUsed}
        </span>
        {isTrailingTrades && (
          <span className="text-[#F0B90B] text-[9px] animate-pulse">
            (-{tradeGap.toFixed(0)} behind)
          </span>
        )}
        <span className="text-[#848E9C]">·</span>
        <span className="text-[#D1D4DC] font-mono text-[9px]">{social.activeTradersPct}% active</span>
      </div>

      {/* Promotion Zone Density */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-[rgba(255,255,255,0.06)] transition-colors ${flashField === 'zone' ? 'bg-[#F0B90B]/[0.05]' : ''}`}>
        <span className="text-[#F0B90B] shrink-0">⚡ Zone</span>
        <span className="text-[#F0B90B] font-mono tabular-nums">{social.nearPromotionCount}</span>
        <span className="text-[#848E9C]">in {social.nearPromotionRange}</span>
        {social.nearPromotionDelta > 0 && (
          <span className="text-[#F6465D] text-[9px] font-mono">+{social.nearPromotionDelta} in 10m</span>
        )}
      </div>

      {/* Rank Movement */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-[rgba(255,255,255,0.06)] transition-colors ${flashField === 'overtaken' ? (isOvertaken ? 'bg-[#F6465D]/[0.05]' : 'bg-[#0ECB81]/[0.05]') : ''}`}>
        <span className="text-[#848E9C] shrink-0">30m</span>
        {social.tradersOvertakenYou > 0 && (
          <span className="text-[#F6465D] font-mono text-[9px]">
            ▼{social.tradersOvertakenYou} passed you
          </span>
        )}
        {social.youOvertook > 0 && (
          <span className="text-[#0ECB81] font-mono text-[9px]">
            ▲you passed {social.youOvertook}
          </span>
        )}
        <span className="text-[#848E9C] text-[9px]">avg±{social.avgRankChange30m.toFixed(0)}</span>
      </div>

      {/* Losing Streaks */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${flashField === 'streak' ? 'bg-[#F6465D]/[0.05]' : ''}`}>
        <span className="text-[#F6465D] shrink-0">🔥 Streaks</span>
        <span className="text-[#D1D4DC] font-mono text-[9px]">{social.tradersOnLosingStreak} on 3+ losses</span>
        <span className="text-[#848E9C]">·</span>
        <span className="text-[#F6465D] font-mono text-[9px]">worst: {social.consecutiveLossLeader}L</span>
      </div>
    </div>
  );
}

export default memo(SocialBar);
