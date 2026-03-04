// ============================================================
// Order Book Panel
// Design: Binance-style depth display with bid/ask bars
// Optimized for SOLUSDT: compact number formatting
// ============================================================

import type { OrderBook } from '@/lib/types';
import { useT } from '@/lib/i18n';

interface Props {
  orderBook: OrderBook;
  lastPrice: number;
  priceDirection: 'up' | 'down' | 'neutral';
}

// Format quantity: use K suffix for large numbers, otherwise 1 decimal
function formatQty(qty: number): string {
  if (qty >= 10000) return (qty / 1000).toFixed(1) + 'K';
  if (qty >= 1000) return (qty / 1000).toFixed(2) + 'K';
  if (qty >= 100) return qty.toFixed(0);
  if (qty >= 10) return qty.toFixed(1);
  return qty.toFixed(2);
}

// Format total: use K suffix for large numbers
function formatTotal(total: number): string {
  if (total >= 10000) return (total / 1000).toFixed(1) + 'K';
  if (total >= 1000) return (total / 1000).toFixed(2) + 'K';
  if (total >= 100) return total.toFixed(0);
  if (total >= 10) return total.toFixed(1);
  return total.toFixed(2);
}

export default function OrderBookPanel({ orderBook, lastPrice, priceDirection }: Props) {
  const { t } = useT();
  const maxAskTotal = orderBook.asks.length > 0 ? orderBook.asks[orderBook.asks.length - 1].total : 1;
  const maxBidTotal = orderBook.bids.length > 0 ? orderBook.bids[orderBook.bids.length - 1].total : 1;

  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      <div className="panel-header flex justify-between">
        <span>{t('orderbook.title')}</span>
        <span className="text-[#848E9C]">{t('common.solusdt')}</span>
      </div>

      {/* Column headers — use grid for fixed column widths */}
      <div className="grid grid-cols-3 px-2 py-1 text-[10px] text-[#848E9C]">
        <span className="text-left">{t('common.price')}</span>
        <span className="text-right">{t('common.qty')}</span>
        <span className="text-right">{t('common.total')}</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {orderBook.asks.slice(0, 12).reverse().map((ask, i) => (
          <div key={`ask-${i}`} className="relative grid grid-cols-3 px-2 py-[2px] hover:bg-white/5">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10"
              style={{ width: `${(ask.total / maxAskTotal) * 100}%` }}
            />
            <span className="relative text-left text-[#F6465D]">{ask.price.toFixed(2)}</span>
            <span className="relative text-right text-[#D1D4DC]">{formatQty(ask.quantity)}</span>
            <span className="relative text-right text-[#848E9C]">{formatTotal(ask.total)}</span>
          </div>
        ))}
      </div>

      {/* Spread / Last Price */}
      <div className={`flex items-center justify-center py-1.5 border-y border-[rgba(255,255,255,0.06)] ${
        priceDirection === 'up' ? 'text-[#0ECB81]' : priceDirection === 'down' ? 'text-[#F6465D]' : 'text-[#D1D4DC]'
      }`}>
        <span className="text-sm font-semibold">{lastPrice.toFixed(2)}</span>
        <span className="ml-1 text-[10px]">
          {priceDirection === 'up' ? '↑' : priceDirection === 'down' ? '↓' : ''}
        </span>
        {orderBook.asks.length > 0 && orderBook.bids.length > 0 && (
          <span className="ml-2 text-[10px] text-[#848E9C]">
            {t('common.spread')}: {(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}
          </span>
        )}
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden">
        {orderBook.bids.slice(0, 12).map((bid, i) => (
          <div key={`bid-${i}`} className="relative grid grid-cols-3 px-2 py-[2px] hover:bg-white/5">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/10"
              style={{ width: `${(bid.total / maxBidTotal) * 100}%` }}
            />
            <span className="relative text-left text-[#0ECB81]">{bid.price.toFixed(2)}</span>
            <span className="relative text-right text-[#D1D4DC]">{formatQty(bid.quantity)}</span>
            <span className="relative text-right text-[#848E9C]">{formatTotal(bid.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
