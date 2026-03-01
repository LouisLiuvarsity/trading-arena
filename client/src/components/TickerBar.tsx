// ============================================================
// Ticker Bar — Price info strip above chart
// Design: Binance-style horizontal ticker info
// ============================================================

import { useEffect, useRef } from 'react';
import type { TickerData } from '@/lib/types';

interface Props {
  ticker: TickerData | null;
  priceDirection: 'up' | 'down' | 'neutral';
}

function formatFundingRate(rate: number): string {
  return (rate * 100).toFixed(4) + '%';
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
  return vol.toFixed(0);
}

// Auto-detect decimal places based on price magnitude
function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(5);
  return price.toFixed(6);
}

export default function TickerBar({ ticker, priceDirection }: Props) {
  const priceRef = useRef<HTMLSpanElement>(null);

  // Flash effect on price change
  useEffect(() => {
    if (priceRef.current && priceDirection !== 'neutral') {
      priceRef.current.classList.remove('animate-flash-green', 'animate-flash-red');
      void priceRef.current.offsetWidth; // force reflow
      priceRef.current.classList.add(priceDirection === 'up' ? 'animate-flash-green' : 'animate-flash-red');
    }
  }, [ticker?.lastPrice, priceDirection]);

  if (!ticker) {
    return (
      <div className="flex items-center gap-6 px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-white text-sm">BTCUSDT</span>
          <span className="text-[10px] text-[#848E9C] bg-white/5 px-1.5 py-0.5 rounded">Perp</span>
        </div>
        <span className="text-[#848E9C] animate-pulse">Connecting...</span>
      </div>
    );
  }

  const isPositive = ticker.priceChangePct >= 0;

  return (
    <div className="flex items-center gap-5 px-3 py-2 border-b border-[rgba(255,255,255,0.06)] text-xs">
      {/* Symbol + Price */}
      <div className="flex items-center gap-2">
        <span className="font-display font-bold text-white text-sm tracking-wide">BTCUSDT</span>
        <span className="text-[10px] text-[#848E9C] bg-white/5 px-1.5 py-0.5 rounded">Perp</span>
      </div>

      <span
        ref={priceRef}
        className={`font-mono text-lg font-bold tabular-nums transition-colors rounded px-1 ${
          priceDirection === 'up' ? 'text-[#0ECB81]' :
          priceDirection === 'down' ? 'text-[#F6465D]' :
          'text-[#D1D4DC]'
        }`}
      >
        {formatPrice(ticker.lastPrice)}
      </span>

      {/* 24h Change */}
      <div className="text-center">
        <div className="text-[10px] text-[#848E9C]">24h Change</div>
        <div className={`font-mono tabular-nums ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {isPositive ? '+' : ''}{ticker.priceChangePct.toFixed(2)}%
        </div>
      </div>

      {/* 24h High */}
      <div className="text-center">
        <div className="text-[10px] text-[#848E9C]">24h High</div>
        <div className="font-mono tabular-nums text-[#D1D4DC]">{formatPrice(ticker.high24h)}</div>
      </div>

      {/* 24h Low */}
      <div className="text-center">
        <div className="text-[10px] text-[#848E9C]">24h Low</div>
        <div className="font-mono tabular-nums text-[#D1D4DC]">{formatPrice(ticker.low24h)}</div>
      </div>

      {/* Volume */}
      <div className="text-center">
        <div className="text-[10px] text-[#848E9C]">24h Vol(USDT)</div>
        <div className="font-mono tabular-nums text-[#D1D4DC]">{formatVolume(ticker.volume24h)}</div>
      </div>

      {/* Mark Price */}
      <div className="text-center">
        <div className="text-[10px] text-[#848E9C]">Mark</div>
        <div className="font-mono tabular-nums text-[#D1D4DC]">{formatPrice(ticker.markPrice)}</div>
      </div>

      {/* Funding Rate */}
      <div className="text-center">
        <div className="text-[10px] text-[#848E9C]">Funding</div>
        <div className={`font-mono tabular-nums ${ticker.fundingRate >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {formatFundingRate(ticker.fundingRate)}
        </div>
      </div>
    </div>
  );
}
