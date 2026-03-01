// ============================================================
// Social Information Bar — Bottom bar with crowd data
// Design: Compact horizontal bar with visual indicators
// ============================================================

import type { SocialData } from '@/lib/types';

interface Props {
  social: SocialData;
}

export default function SocialBar({ social }: Props) {
  return (
    <div className="flex items-center gap-4 px-3 py-1 border-t border-[rgba(255,255,255,0.08)] bg-[#0B0E11] text-[10px]">
      {/* Long/Short Ratio */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#848E9C]">L/S</span>
        <span className="text-[#0ECB81] font-mono">{social.longPct}%</span>
        <div className="w-16 h-1 bg-[#F6465D]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0ECB81] rounded-full transition-all"
            style={{ width: `${social.longPct}%` }}
          />
        </div>
        <span className="text-[#F6465D] font-mono">{social.shortPct}%</span>
      </div>

      <div className="h-2.5 w-px bg-white/10" />

      {/* Profit/Loss Ratio */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#848E9C]">Profitable</span>
        <span className="text-[#0ECB81] font-mono">{social.profitablePct}%</span>
        <div className="w-14 h-1 bg-[#F6465D]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0ECB81] rounded-full transition-all"
            style={{ width: `${social.profitablePct}%` }}
          />
        </div>
        <span className="text-[#F6465D] font-mono">{social.losingPct}%</span>
      </div>

      <div className="h-2.5 w-px bg-white/10" />

      {/* Promotion line density */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#F0B90B]">⚡ Promotion Zone</span>
        <span className="text-[#F0B90B] font-mono">{social.nearPromotionRange}</span>
        <span className="text-[#D1D4DC] font-mono">{social.nearPromotionCount} traders</span>
        <span className="text-[#F6465D]">Intense!</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-[#848E9C]">
        <span>HYPERUSDT Perpetual</span>
        <span>•</span>
        <span>1,000 participants</span>
        <span>•</span>
        <span>No Leverage</span>
      </div>
    </div>
  );
}
