// ============================================================
// Mobile Order Book — Compact side-by-side layout for mobile
// Shows asks (left) and bids (right) in a compact horizontal view
// ============================================================

import type { OrderBook } from '@/lib/types';
import { useT } from '@/lib/i18n';

interface Props {
  orderBook: OrderBook;
  lastPrice: number;
  priceDirection: 'up' | 'down' | 'neutral';
}

function formatQty(qty: number): string {
  if (qty >= 10000) return (qty / 1000).toFixed(1) + 'K';
  if (qty >= 1000) return (qty / 1000).toFixed(2) + 'K';
  if (qty >= 100) return qty.toFixed(0);
  if (qty >= 10) return qty.toFixed(1);
  return qty.toFixed(2);
}

export default function MobileOrderBook({ orderBook, lastPrice, priceDirection }: Props) {
  const { t } = useT();
  const asks = orderBook.asks.slice(0, 7).reverse();
  const bids = orderBook.bids.slice(0, 7);
  const maxAskQty = asks.reduce((m, a) => Math.max(m, a.quantity), 1);
  const maxBidQty = bids.reduce((m, b) => Math.max(m, b.quantity), 1);

  return (
    <div className="text-[10px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-[#848E9C] text-[9px] font-semibold uppercase tracking-wider">{t('orderbook.orderBook')}</span>
        <span className={`text-xs font-semibold ${
          priceDirection === 'up' ? 'text-[#0ECB81]' : priceDirection === 'down' ? 'text-[#F6465D]' : 'text-[#D1D4DC]'
        }`}>
          {lastPrice.toFixed(2)}
          {priceDirection === 'up' ? ' ↑' : priceDirection === 'down' ? ' ↓' : ''}
        </span>
      </div>

      {/* Side-by-side: Asks | Bids */}
      <div className="flex">
        {/* Asks (sell side) */}
        <div className="flex-1 border-r border-[rgba(255,255,255,0.04)]">
          <div className="flex justify-between px-1.5 py-0.5 text-[9px] text-[#848E9C]">
            <span>{t('common.price')}</span>
            <span>{t('common.qty')}</span>
          </div>
          {asks.map((ask, i) => (
            <div key={`ask-${i}`} className="relative flex justify-between px-1.5 py-[1.5px]">
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#F6465D]/8"
                style={{ width: `${(ask.quantity / maxAskQty) * 100}%` }}
              />
              <span className="relative text-[#F6465D]">{ask.price.toFixed(2)}</span>
              <span className="relative text-[#D1D4DC]">{formatQty(ask.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Bids (buy side) */}
        <div className="flex-1">
          <div className="flex justify-between px-1.5 py-0.5 text-[9px] text-[#848E9C]">
            <span>{t('common.price')}</span>
            <span>{t('common.qty')}</span>
          </div>
          {bids.map((bid, i) => (
            <div key={`bid-${i}`} className="relative flex justify-between px-1.5 py-[1.5px]">
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/8"
                style={{ width: `${(bid.quantity / maxBidQty) * 100}%` }}
              />
              <span className="relative text-[#0ECB81]">{bid.price.toFixed(2)}</span>
              <span className="relative text-[#D1D4DC]">{formatQty(bid.quantity)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
