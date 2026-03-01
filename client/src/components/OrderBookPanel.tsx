// ============================================================
// Order Book Panel
// Design: Binance-style depth display with bid/ask bars
// ============================================================

import type { OrderBook } from '@/lib/types';

interface Props {
  orderBook: OrderBook;
  lastPrice: number;
  priceDirection: 'up' | 'down' | 'neutral';
}

export default function OrderBookPanel({ orderBook, lastPrice, priceDirection }: Props) {
  const maxAskTotal = orderBook.asks.length > 0 ? orderBook.asks[orderBook.asks.length - 1].total : 1;
  const maxBidTotal = orderBook.bids.length > 0 ? orderBook.bids[orderBook.bids.length - 1].total : 1;

  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      <div className="panel-header flex justify-between">
        <span>Order Book</span>
        <span className="text-[#848E9C]">BTCUSDT</span>
      </div>

      {/* Column headers */}
      <div className="flex justify-between px-2 py-1 text-[10px] text-[#848E9C]">
        <span>Price(USDT)</span>
        <span>Qty(BTC)</span>
        <span>Total</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {orderBook.asks.slice(0, 12).reverse().map((ask, i) => (
          <div key={`ask-${i}`} className="relative flex justify-between px-2 py-[2px] hover:bg-white/5">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10"
              style={{ width: `${(ask.total / maxAskTotal) * 100}%` }}
            />
            <span className="relative text-[#F6465D]">{ask.price.toFixed(2)}</span>
            <span className="relative text-[#D1D4DC]">{ask.quantity.toFixed(5)}</span>
            <span className="relative text-[#848E9C]">{ask.total.toFixed(5)}</span>
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
            Spread: {(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}
          </span>
        )}
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden">
        {orderBook.bids.slice(0, 12).map((bid, i) => (
          <div key={`bid-${i}`} className="relative flex justify-between px-2 py-[2px] hover:bg-white/5">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/10"
              style={{ width: `${(bid.total / maxBidTotal) * 100}%` }}
            />
            <span className="relative text-[#0ECB81]">{bid.price.toFixed(2)}</span>
            <span className="relative text-[#D1D4DC]">{bid.quantity.toFixed(5)}</span>
            <span className="relative text-[#848E9C]">{bid.total.toFixed(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
