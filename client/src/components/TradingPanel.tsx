// ============================================================
// Trading Panel — Open/Close positions
// Design: Large buy/sell buttons, position slider, hold weight info
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import type { Position, AccountState } from '@/lib/types';

interface Props {
  account: AccountState;
  position: Position | null;
  currentPrice: number;
  onOpenPosition: (direction: 'long' | 'short', size: number) => void;
  onClosePosition: () => void;
  getNextWeightThreshold: (seconds: number) => { nextWeight: number; secondsNeeded: number } | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m ${s}s`;
  }
  return `${m}m ${s}s`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(5);
  return price.toFixed(6);
}

export default function TradingPanel({ account, position, currentPrice, onOpenPosition, onClosePosition, getNextWeightThreshold }: Props) {
  const [positionSize, setPositionSize] = useState(250);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState(0);

  // Update hold duration timer
  useEffect(() => {
    if (!position) {
      setHoldSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setHoldSeconds((Date.now() - position.openTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [position]);

  const handleClose = useCallback(() => {
    if (position && holdSeconds < 60) {
      setShowCloseWarning(true);
      return;
    }
    onClosePosition();
  }, [position, holdSeconds, onClosePosition]);

  const confirmClose = useCallback(() => {
    setShowCloseWarning(false);
    onClosePosition();
  }, [onClosePosition]);

  const nextThreshold = position ? getNextWeightThreshold(holdSeconds) : null;
  const positionPct = Math.round((positionSize / account.equity) * 100);

  if (position) {
    // Position view
    const isProfitable = position.unrealizedPnl >= 0;
    // Weight progress bar
    const weightSteps = [0.2, 0.4, 0.7, 1.0, 1.15, 1.3];
    const currentWeightIdx = weightSteps.indexOf(position.holdDurationWeight);
    const weightProgress = ((currentWeightIdx + 1) / weightSteps.length) * 100;

    return (
      <div className="flex flex-col">
        <div className="panel-header flex items-center justify-between">
          <span>Current Position</span>
          <span className={`text-[10px] font-mono ${isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isProfitable ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%
          </span>
        </div>
        <div className="p-3 space-y-2.5">
          {/* Direction badge */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold ${
              position.direction === 'long'
                ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                : 'bg-[#F6465D]/15 text-[#F6465D]'
            }`}>
              {position.direction === 'long' ? '↑ LONG' : '↓ SHORT'}
              <span className="text-xs opacity-70">{position.size}U</span>
            </div>
            <span className="text-[10px] text-[#848E9C] font-mono">
              #{position.tradeNumber}/{account.tradesMax}
            </span>
          </div>

          {/* Price info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#1C2030] rounded px-2 py-1.5">
              <div className="text-[10px] text-[#848E9C]">Entry</div>
              <div className="font-mono text-[#D1D4DC]">{formatPrice(position.entryPrice)}</div>
            </div>
            <div className="bg-[#1C2030] rounded px-2 py-1.5">
              <div className="text-[10px] text-[#848E9C]">Mark</div>
              <div className="font-mono text-[#D1D4DC]">{formatPrice(currentPrice)}</div>
            </div>
          </div>

          {/* Unrealized PnL — large display */}
          <div className={`text-center py-2.5 rounded ${isProfitable ? 'bg-[#0ECB81]/10' : 'bg-[#F6465D]/10'}`}>
            <div className={`text-xl font-display font-bold tabular-nums ${isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)} USDT
            </div>
            <div className={`text-xs font-mono ${isProfitable ? 'text-[#0ECB81]/70' : 'text-[#F6465D]/70'}`}>
              {isProfitable ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%
            </div>
          </div>

          {/* Hold duration & weight */}
          <div className="bg-[#1C2030] rounded p-2.5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#848E9C]">Hold Duration</span>
              <span className="font-mono text-[#D1D4DC] tabular-nums">{formatDuration(holdSeconds)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#848E9C]">Weight</span>
              <span className="font-mono text-[#F0B90B] font-semibold">{position.holdDurationWeight}x</span>
            </div>
            {/* Weight progress bar */}
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F6465D] via-[#F0B90B] to-[#0ECB81] rounded-full transition-all duration-500"
                style={{ width: `${weightProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#848E9C]">
              <span>0.2x</span>
              <span>0.4x</span>
              <span>0.7x</span>
              <span>1.0x</span>
              <span>1.15x</span>
              <span>1.3x</span>
            </div>
            {nextThreshold && (
              <div className="text-[10px] text-[#F0B90B]/80 bg-[#F0B90B]/5 rounded px-2 py-1 text-center">
                ⏱ Hold {formatDuration(nextThreshold.secondsNeeded)} more → {nextThreshold.nextWeight}x
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-[#848E9C]">Score</span>
              <span className="font-mono text-[#D1D4DC]">+{position.participationScore}</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={`w-full py-3 rounded font-semibold text-sm transition-all active:scale-[0.98] ${
              isProfitable
                ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black'
                : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white'
            }`}
          >
            Close ({isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)} USDT)
          </button>

          {/* Short hold warning */}
          {showCloseWarning && (
            <div className="bg-[#F6465D]/10 border border-[#F6465D]/30 rounded p-2.5 space-y-2">
              <p className="text-[11px] text-[#F6465D]">
                ⚠ Hold &lt; 1min: Weight only 0.2x
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmClose}
                  className="flex-1 py-1.5 bg-[#F6465D]/20 text-[#F6465D] text-xs rounded hover:bg-[#F6465D]/30"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowCloseWarning(false)}
                  className="flex-1 py-1.5 bg-white/5 text-[#D1D4DC] text-xs rounded hover:bg-white/10"
                >
                  Keep Holding
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Order entry view
  return (
    <div className="flex flex-col">
      <div className="panel-header">Trade</div>
      <div className="p-3 space-y-3">
        {/* Market price */}
        <div className="flex justify-between text-xs">
          <span className="text-[#848E9C]">Market Price</span>
          <span className="font-mono text-[#D1D4DC] tabular-nums">{formatPrice(currentPrice)}</span>
        </div>

        {/* Available balance */}
        <div className="flex justify-between text-xs">
          <span className="text-[#848E9C]">Available</span>
          <span className="font-mono text-[#D1D4DC]">{account.equity.toFixed(2)} USDT</span>
        </div>

        {/* Position size slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#848E9C]">Position Size</span>
            <span className="font-mono text-[#D1D4DC]">{positionSize} USDT ({positionPct}%)</span>
          </div>
          <Slider
            value={[positionSize]}
            onValueChange={([v]) => setPositionSize(v)}
            min={10}
            max={Math.floor(account.equity)}
            step={10}
            className="[&_[role=slider]]:bg-[#F0B90B] [&_[role=slider]]:border-[#F0B90B] [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
          />
          <div className="flex justify-between text-[10px] text-[#848E9C]">
            <span>10U</span>
            <div className="flex gap-1.5">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => setPositionSize(Math.floor(account.equity * pct / 100))}
                  className="px-2 py-0.5 bg-white/5 rounded hover:bg-white/10 transition-colors text-[#D1D4DC]"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trades remaining */}
        <div className="flex justify-between text-xs">
          <span className="text-[#848E9C]">Trades Left</span>
          <span className={`font-mono ${(account.tradesMax - account.tradesUsed) <= 5 ? 'text-[#F6465D]' : 'text-[#D1D4DC]'}`}>
            {account.tradesMax - account.tradesUsed}/{account.tradesMax}
          </span>
        </div>

        {/* Buy/Sell buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onOpenPosition('long', positionSize)}
            disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0}
            className="flex-1 py-3 bg-[#0ECB81] hover:bg-[#0ECB81]/90 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-sm rounded transition-all active:scale-[0.97]"
          >
            <div>Buy / Long</div>
            <div className="text-[10px] font-normal opacity-70">{positionSize} USDT</div>
          </button>
          <button
            onClick={() => onOpenPosition('short', positionSize)}
            disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0}
            className="flex-1 py-3 bg-[#F6465D] hover:bg-[#F6465D]/90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-all active:scale-[0.97]"
          >
            <div>Sell / Short</div>
            <div className="text-[10px] font-normal opacity-70">{positionSize} USDT</div>
          </button>
        </div>

        {/* Info */}
        <div className="text-center text-[10px] text-[#848E9C]">
          Stage {account.stage} • {account.stageMaxLeverage}x Leverage • No Liquidation
        </div>
      </div>
    </div>
  );
}
