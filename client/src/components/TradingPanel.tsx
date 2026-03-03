// ============================================================
// Trading Panel — Horizontal bottom layout for order entry + position
// Design: Compact horizontal strip at bottom of page
// Supports TP/SL, hold weight display, position management
// ============================================================

import { useState, useEffect, useCallback, memo } from 'react';
import { Slider } from '@/components/ui/slider';
import type { Position, AccountState } from '@/lib/types';

interface Props {
  account: AccountState;
  position: Position | null;
  currentPrice: number;
  onOpenPosition: (direction: 'long' | 'short', size: number, tp?: number | null, sl?: number | null) => Promise<void> | void;
  onClosePosition: () => Promise<void> | void;
  getNextWeightThreshold: (seconds: number) => { nextWeight: number; secondsNeeded: number } | null;
  onSetTpSl?: (tp: number | null, sl: number | null) => void;
  isStale?: boolean;
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

function getPriceStep(price: number): number {
  if (price >= 1000) return 1;
  if (price >= 1) return 0.001;
  if (price >= 0.01) return 0.00001;
  return 0.000001;
}

function TradingPanel({
  account, position, currentPrice, onOpenPosition, onClosePosition, getNextWeightThreshold, onSetTpSl, isStale
}: Props) {
  const [positionSize, setPositionSize] = useState(250);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TP/SL state for order entry
  const [showTpSl, setShowTpSl] = useState(false);
  const [tpInput, setTpInput] = useState('');
  const [slInput, setSlInput] = useState('');

  // TP/SL editing state for open position
  const [editingTpSl, setEditingTpSl] = useState(false);
  const [editTp, setEditTp] = useState('');
  const [editSl, setEditSl] = useState('');

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

  // Sync edit fields when position TP/SL changes
  useEffect(() => {
    if (position && editingTpSl) {
      setEditTp(position.takeProfit ? formatPrice(position.takeProfit) : '');
      setEditSl(position.stopLoss ? formatPrice(position.stopLoss) : '');
    }
  }, [editingTpSl, position]);

  const handleClose = useCallback(async () => {
    if (isSubmitting) return;
    if (position && holdSeconds < 60) {
      setShowCloseWarning(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onClosePosition();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, position, holdSeconds, onClosePosition]);

  const confirmClose = useCallback(async () => {
    if (isSubmitting) return;
    setShowCloseWarning(false);
    setIsSubmitting(true);
    try {
      await onClosePosition();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onClosePosition]);

  const handleOpenWithTpSl = useCallback(async (direction: 'long' | 'short') => {
    if (isSubmitting) return;
    const tp = tpInput ? parseFloat(tpInput) : null;
    const sl = slInput ? parseFloat(slInput) : null;
    if (tp !== null && direction === 'long' && tp <= currentPrice) return;
    if (tp !== null && direction === 'short' && tp >= currentPrice) return;
    if (sl !== null && direction === 'long' && sl >= currentPrice) return;
    if (sl !== null && direction === 'short' && sl <= currentPrice) return;
    setIsSubmitting(true);
    try {
      await onOpenPosition(direction, positionSize, tp, sl);
      setTpInput('');
      setSlInput('');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, tpInput, slInput, currentPrice, positionSize, onOpenPosition]);

  const handleOpen = useCallback(async (direction: 'long' | 'short') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onOpenPosition(direction, positionSize);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, positionSize, onOpenPosition]);

  const handleSaveTpSl = useCallback(() => {
    if (!onSetTpSl) return;
    const tp = editTp ? parseFloat(editTp) : null;
    const sl = editSl ? parseFloat(editSl) : null;
    if (position) {
      if (tp !== null && position.direction === 'long' && tp <= currentPrice) return;
      if (tp !== null && position.direction === 'short' && tp >= currentPrice) return;
      if (sl !== null && position.direction === 'long' && sl >= currentPrice) return;
      if (sl !== null && position.direction === 'short' && sl <= currentPrice) return;
    }
    onSetTpSl(tp, sl);
    setEditingTpSl(false);
  }, [editTp, editSl, position, currentPrice, onSetTpSl]);

  const nextThreshold = position ? getNextWeightThreshold(holdSeconds) : null;
  const positionPct = Math.round((positionSize / account.equity) * 100);
  const priceStep = getPriceStep(currentPrice);

  if (position) {
    // ─── POSITION VIEW (horizontal) ─────────────────────────
    const isProfitable = position.unrealizedPnl >= 0;
    const weightSteps = [0.2, 0.4, 0.7, 1.0, 1.15, 1.3];
    const currentWeightIdx = weightSteps.indexOf(position.holdDurationWeight);
    const weightProgress = ((currentWeightIdx + 1) / weightSteps.length) * 100;

    return (
      <div className="flex items-stretch gap-0 h-full border-t border-[rgba(255,255,255,0.06)]">
        {/* Section 1: Direction + PnL */}
        <div className="flex items-center gap-3 px-3 border-r border-[rgba(255,255,255,0.06)]">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold shrink-0 ${
            position.direction === 'long'
              ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
              : 'bg-[#F6465D]/15 text-[#F6465D]'
          }`}>
            {position.direction === 'long' ? '↑ LONG' : '↓ SHORT'}
            <span className="text-xs opacity-70">{position.size}U</span>
          </div>
          <div className="text-center">
            <div className={`text-lg font-display font-bold tabular-nums ${isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)} U
            </div>
            <div className={`text-[10px] font-mono ${isProfitable ? 'text-[#0ECB81]/70' : 'text-[#F6465D]/70'}`}>
              {isProfitable ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Section 2: Price info */}
        <div className="flex items-center gap-4 px-3 text-xs border-r border-[rgba(255,255,255,0.06)]">
          <div>
            <div className="text-[9px] text-[#848E9C]">Entry</div>
            <div className="font-mono text-[#D1D4DC]">{formatPrice(position.entryPrice)}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#848E9C]">Mark</div>
            <div className="font-mono text-[#D1D4DC]">{formatPrice(currentPrice)}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#848E9C]">Trade</div>
            <div className="font-mono text-[#D1D4DC]">#{position.tradeNumber}/{account.tradesMax}</div>
          </div>
        </div>

        {/* Section 3: Hold Duration & Weight */}
        <div className="flex items-center gap-3 px-3 border-r border-[rgba(255,255,255,0.06)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[9px] text-[#848E9C]">Hold</span>
              <span className="font-mono text-[#D1D4DC] tabular-nums text-[11px]">{formatDuration(holdSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[9px] text-[#848E9C]">Weight</span>
              <span className="font-mono text-[#F0B90B] font-semibold text-[11px]">{position.holdDurationWeight}x</span>
            </div>
            <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F6465D] via-[#F0B90B] to-[#0ECB81] rounded-full transition-all duration-500"
                style={{ width: `${weightProgress}%` }}
              />
            </div>
            {nextThreshold && (
              <div className="text-[9px] text-[#F0B90B]/80">
                ⏱ {formatDuration(nextThreshold.secondsNeeded)} → {nextThreshold.nextWeight}x
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-[9px] text-[#848E9C]">Weight</div>
            <div className="font-mono text-[#D1D4DC] text-xs">{position.holdDurationWeight}x</div>
          </div>
        </div>

        {/* Section 4: TP/SL */}
        <div className="flex items-center gap-2 px-3 border-r border-[rgba(255,255,255,0.06)]">
          {!editingTpSl ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-[#848E9C]">TP</span>
                {position.takeProfit ? (
                  <span className="font-mono text-[#0ECB81]">{formatPrice(position.takeProfit)}</span>
                ) : (
                  <span className="text-[#848E9C]/40">—</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-[#848E9C]">SL</span>
                {position.stopLoss ? (
                  <span className="font-mono text-[#F6465D]">{formatPrice(position.stopLoss)}</span>
                ) : (
                  <span className="text-[#848E9C]/40">—</span>
                )}
              </div>
              <button
                onClick={() => setEditingTpSl(true)}
                className="text-[9px] text-[#F0B90B] hover:text-[#F0B90B]/80"
              >
                {position.takeProfit || position.stopLoss ? 'Edit' : '+ Set TP/SL'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="space-y-0.5">
                <input
                  type="number"
                  step={priceStep}
                  value={editTp}
                  onChange={e => setEditTp(e.target.value)}
                  placeholder="TP"
                  className="w-20 bg-[#0B0E11] border border-[#0ECB81]/30 rounded px-1.5 py-0.5 text-[10px] font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#0ECB81] focus:outline-none"
                />
                <input
                  type="number"
                  step={priceStep}
                  value={editSl}
                  onChange={e => setEditSl(e.target.value)}
                  placeholder="SL"
                  className="w-20 bg-[#0B0E11] border border-[#F6465D]/30 rounded px-1.5 py-0.5 text-[10px] font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#F6465D] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <button onClick={handleSaveTpSl} className="px-2 py-0.5 bg-[#F0B90B]/20 text-[#F0B90B] text-[9px] rounded hover:bg-[#F0B90B]/30">Save</button>
                <button onClick={() => { onSetTpSl?.(null, null); setEditingTpSl(false); }} className="px-2 py-0.5 bg-white/5 text-[#848E9C] text-[9px] rounded hover:bg-white/10">Clear</button>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Close button */}
        <div className="flex items-center px-3">
          {!showCloseWarning ? (
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded font-semibold text-sm transition-all active:scale-[0.97] whitespace-nowrap disabled:opacity-50 ${
                isProfitable
                  ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black'
                  : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white'
              }`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin mx-auto" />
              ) : (
                <>Close ({isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)} U)</>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#F6465D]">⚠ Weight 0.2x</span>
              <button onClick={confirmClose} className="px-3 py-1.5 bg-[#F6465D]/20 text-[#F6465D] text-xs rounded hover:bg-[#F6465D]/30">Confirm</button>
              <button onClick={() => setShowCloseWarning(false)} className="px-3 py-1.5 bg-white/5 text-[#D1D4DC] text-xs rounded hover:bg-white/10">Hold</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ORDER ENTRY VIEW (horizontal) ──────────────────────────
  return (
    <div className="flex items-stretch gap-0 h-full border-t border-[rgba(255,255,255,0.06)]">
      {/* Section 1: Price + Balance */}
      <div className="flex items-center gap-4 px-3 border-r border-[rgba(255,255,255,0.06)] text-xs">
        <div>
          <div className="text-[9px] text-[#848E9C]">Market Price</div>
          <div className="font-mono text-[#D1D4DC] tabular-nums">{formatPrice(currentPrice)}</div>
        </div>
        <div>
          <div className="text-[9px] text-[#848E9C]">Available</div>
          <div className="font-mono text-[#D1D4DC]">{account.equity.toFixed(2)} U</div>
        </div>
        <div>
          <div className="text-[9px] text-[#848E9C]">Trades Left</div>
          <div className={`font-mono ${(account.tradesMax - account.tradesUsed) <= 5 ? 'text-[#F6465D]' : 'text-[#D1D4DC]'}`}>
            {account.tradesMax - account.tradesUsed}/{account.tradesMax}
          </div>
        </div>
      </div>

      {/* Section 2: Position Size + Leverage */}
      <div className="flex items-center gap-3 px-3 border-r border-[rgba(255,255,255,0.06)] min-w-[260px]">
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-[#848E9C]">Size <span className="text-[#F0B90B] font-bold">×{account.tierLeverage}</span></span>
            <span className="font-mono text-[#D1D4DC]">{positionSize} U → <span className="text-[#F0B90B]">{Math.round(positionSize * account.tierLeverage)} U</span></span>
          </div>
          <Slider
            value={[positionSize]}
            onValueChange={([v]) => setPositionSize(v)}
            min={10}
            max={Math.floor(account.equity)}
            step={10}
            className="[&_[role=slider]]:bg-[#F0B90B] [&_[role=slider]]:border-[#F0B90B] [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
          />
          <div className="flex gap-1 text-[9px]">
            {[25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                onClick={() => setPositionSize(Math.floor(account.equity * pct / 100))}
                className="px-1.5 py-0.5 bg-white/5 rounded hover:bg-white/10 text-[#D1D4DC] transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: TP/SL (optional) */}
      <div className="flex items-center gap-2 px-3 border-r border-[rgba(255,255,255,0.06)]">
        <button
          onClick={() => setShowTpSl(!showTpSl)}
          className="flex items-center gap-1 text-[10px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors shrink-0"
        >
          <span className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${
            showTpSl ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#848E9C]/40'
          }`}>
            {showTpSl && <span className="text-black text-[7px] font-bold">✓</span>}
          </span>
          TP/SL
        </button>
        {showTpSl && (
          <div className="flex items-center gap-1.5">
            <div className="space-y-0.5">
              <input
                type="number"
                step={priceStep}
                value={tpInput}
                onChange={e => setTpInput(e.target.value)}
                placeholder="TP Price"
                className="w-20 bg-[#0B0E11] border border-[#0ECB81]/20 rounded px-1.5 py-0.5 text-[10px] font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#0ECB81] focus:outline-none"
              />
              <input
                type="number"
                step={priceStep}
                value={slInput}
                onChange={e => setSlInput(e.target.value)}
                placeholder="SL Price"
                className="w-20 bg-[#0B0E11] border border-[#F6465D]/20 rounded px-1.5 py-0.5 text-[10px] font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#F6465D] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Buy/Sell buttons with leverage badge */}
      <div className="flex items-center gap-2 px-3">
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() => showTpSl ? handleOpenWithTpSl('long') : handleOpen('long')}
            disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0 || isStale || isSubmitting}
            className="px-5 py-2.5 bg-[#0ECB81] hover:bg-[#0ECB81]/90 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-sm rounded transition-all active:scale-[0.97] whitespace-nowrap relative"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
            ) : (
              <>
                <div>Buy / Long</div>
                <div className="text-[9px] font-normal opacity-70">{positionSize} U × {account.tierLeverage}</div>
              </>
            )}
          </button>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() => showTpSl ? handleOpenWithTpSl('short') : handleOpen('short')}
            disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0 || isStale || isSubmitting}
            className="px-5 py-2.5 bg-[#F6465D] hover:bg-[#F6465D]/90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm rounded transition-all active:scale-[0.97] whitespace-nowrap relative"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              <>
                <div>Sell / Short</div>
                <div className="text-[9px] font-normal opacity-70">{positionSize} U × {account.tierLeverage}</div>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 5: Leverage badge */}
      <div className="flex flex-col items-center justify-center px-2 shrink-0">
        <div className="px-2 py-1 rounded border border-[#F0B90B]/30 bg-[#F0B90B]/10">
          <div className="text-[#F0B90B] text-xs font-bold font-mono">{account.tierLeverage}x</div>
        </div>
        <div className="text-[8px] text-[#848E9C] mt-0.5 capitalize">{account.rankTier}</div>
      </div>
    </div>
  );
}

export default memo(TradingPanel);
