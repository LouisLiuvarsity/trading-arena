// ============================================================
// Trade History — Completed trades list
// Columns: Dir, Size(USDT), Size(SOL), PnL, Fee, Hold, Open Time
// ============================================================

import { ScrollArea } from '@/components/ui/scroll-area';
import type { CompletedTrade } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { TRADING_PAIR } from '@shared/tradingPair';

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
  const { t } = useT();
  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <span>{t('trades.title')}</span>
        <span className="text-[10px] text-[#848E9C]">{t('trades.count', { n: trades.length })}</span>
      </div>

      {trades.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#848E9C] text-xs">
          {t('trades.empty')}
        </div>
      ) : (
        <>
          <div className="flex items-center px-2 py-1 text-[10px] text-[#848E9C] border-b border-[rgba(255,255,255,0.04)]">
            <span className="w-8">{t('trades.dir')}</span>
            <span className="w-14 text-right">USDT</span>
            <span className="w-16 text-right">{TRADING_PAIR.baseAsset}</span>
            <span className="flex-1 text-right">{t('status.pnl')}</span>
            <span className="w-14 text-right">{t('trades.fee')}</span>
            <span className="w-12 text-right">{t('trades.hold')}</span>
            <span className="w-12 text-right">{t('trades.open')}</span>
          </div>
          <ScrollArea className="flex-1">
            {trades.map(trade => {
              const solSize = trade.entryPrice > 0 ? (trade.size / trade.entryPrice) : 0;
              return (
                <div key={trade.id} className="flex items-center px-2 py-[3px] text-[11px] font-mono hover:bg-white/3">
                  <span className={`w-8 font-semibold ${trade.direction === 'long' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {trade.direction === 'long' ? 'L' : 'S'}
                  </span>
                  <span className="w-14 text-right text-[#D1D4DC]">{trade.size.toFixed(0)}</span>
                  <span className="w-16 text-right text-[#848E9C]">{solSize.toFixed(3)}</span>
                  <span className={`flex-1 text-right ${trade.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                  </span>
                  <span className="w-14 text-right text-[#F6465D]/60">-{(trade.fee ?? 0).toFixed(2)}</span>
                  <span className="w-12 text-right text-[#848E9C]">{formatDuration(trade.holdDuration)}</span>
                  <span className="w-12 text-right text-[#848E9C]">{formatTime(trade.openTime)}</span>
                </div>
              );
            })}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
