// ============================================================
// Trade History — Completed trades list
// Design: Compact table with PnL and weight info
// ============================================================

import { ScrollArea } from '@/components/ui/scroll-area';
import type { CompletedTrade } from '@/lib/types';

interface Props {
  trades: CompletedTrade[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function TradeHistory({ trades }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <span>Trade History</span>
        <span className="text-[10px] text-[#848E9C]">{trades.length} trades</span>
      </div>

      {trades.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#848E9C] text-xs">
          No trades yet
        </div>
      ) : (
        <>
          <div className="flex items-center px-2 py-1 text-[10px] text-[#848E9C] border-b border-[rgba(255,255,255,0.04)]">
            <span className="w-10">Dir</span>
            <span className="w-14">Size</span>
            <span className="flex-1">PnL</span>
            <span className="w-12">Weight</span>
            <span className="w-14">Wtd PnL</span>
            <span className="w-12">Hold</span>
            <span className="w-12 text-right">Time</span>
          </div>
          <ScrollArea className="flex-1">
            {trades.map(trade => (
              <div key={trade.id} className="flex items-center px-2 py-[3px] text-[11px] font-mono hover:bg-white/3">
                <span className={`w-10 ${trade.direction === 'long' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {trade.direction === 'long' ? 'L' : 'S'}
                </span>
                <span className="w-14 text-[#D1D4DC]">{trade.size}U</span>
                <span className={`flex-1 ${trade.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)} ({trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%)
                </span>
                <span className="w-12 text-[#F0B90B]">{trade.holdDurationWeight}x</span>
                <span className={`w-14 ${trade.weightedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {trade.weightedPnl >= 0 ? '+' : ''}{trade.weightedPnl.toFixed(2)}
                </span>
                <span className="w-12 text-[#848E9C]">{formatDuration(trade.holdDuration)}</span>
                <span className="w-12 text-right text-[#848E9C]">{formatTime(trade.closeTime)}</span>
              </div>
            ))}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
