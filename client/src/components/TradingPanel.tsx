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
  const [sizeUnit, setSizeUnit] = useState<'USDT' | 'SOL'>('USDT');
  const [sizeInput, setSizeInput] = useState('250');
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showTpSl, setShowTpSl] = useState(false);
  const [tpInput, setTpInput] = useState('');
  const [slInput, setSlInput] = useState('');

  const [editingTpSl, setEditingTpSl] = useState(false);
  const [editTp, setEditTp] = useState('');
  const [editSl, setEditSl] = useState('');

  useEffect(() => {
    if (!position) { setHoldSeconds(0); return; }
    const interval = setInterval(() => {
      setHoldSeconds((Date.now() - position.openTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [position]);

  useEffect(() => {
    if (position && editingTpSl) {
      setEditTp(position.takeProfit ? formatPrice(position.takeProfit) : '');
      setEditSl(position.stopLoss ? formatPrice(position.stopLoss) : '');
    }
  }, [editingTpSl, position]);

  const handleClose = useCallback(async () => {
    if (isSubmitting) return;
    if (position && holdSeconds < 60) { setShowCloseWarning(true); return; }
    setIsSubmitting(true);
    try { await onClosePosition(); } finally { setIsSubmitting(false); }
  }, [isSubmitting, position, holdSeconds, onClosePosition]);

  const confirmClose = useCallback(async () => {
    if (isSubmitting) return;
    setShowCloseWarning(false);
    setIsSubmitting(true);
    try { await onClosePosition(); } finally { setIsSubmitting(false); }
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
    try { await onOpenPosition(direction, positionSize, tp, sl); setTpInput(''); setSlInput(''); }
    finally { setIsSubmitting(false); }
  }, [isSubmitting, tpInput, slInput, currentPrice, positionSize, onOpenPosition]);

  const handleOpen = useCallback(async (direction: 'long' | 'short') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try { await onOpenPosition(direction, positionSize); } finally { setIsSubmitting(false); }
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

  // Sync input ↔ slider ↔ unit conversion
  const maxEquity = Math.max(10, Math.floor(account.equity));

  const handleSizeInputChange = useCallback((raw: string) => {
    setSizeInput(raw);
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v <= 0) return;
    const usdt = sizeUnit === 'SOL' && currentPrice > 0 ? Math.round(v * currentPrice) : Math.round(v);
    setPositionSize(Math.max(10, Math.min(usdt, maxEquity)));
  }, [sizeUnit, currentPrice, maxEquity]);

  const handleSliderChange = useCallback((v: number) => {
    setPositionSize(v);
    if (sizeUnit === 'SOL' && currentPrice > 0) {
      setSizeInput((v / currentPrice).toFixed(4));
    } else {
      setSizeInput(String(v));
    }
  }, [sizeUnit, currentPrice]);

  const handlePctClick = useCallback((pct: number) => {
    const usdt = Math.max(10, Math.floor(account.equity * pct / 100));
    setPositionSize(usdt);
    if (sizeUnit === 'SOL' && currentPrice > 0) {
      setSizeInput((usdt / currentPrice).toFixed(4));
    } else {
      setSizeInput(String(usdt));
    }
  }, [account.equity, sizeUnit, currentPrice]);

  const handleToggleUnit = useCallback(() => {
    const next = sizeUnit === 'USDT' ? 'SOL' : 'USDT';
    setSizeUnit(next);
    if (next === 'SOL' && currentPrice > 0) {
      setSizeInput((positionSize / currentPrice).toFixed(4));
    } else {
      setSizeInput(String(positionSize));
    }
  }, [sizeUnit, currentPrice, positionSize]);

  const nextThreshold = position ? getNextWeightThreshold(holdSeconds) : null;
  const priceStep = getPriceStep(currentPrice);
  const notionalSize = Math.round(positionSize * account.tierLeverage);

  // ─── POSITION VIEW ───────────────────────────────────────
  if (position) {
    const isProfitable = position.unrealizedPnl >= 0;
    const weightSteps = [0.2, 0.4, 0.7, 1.0, 1.15, 1.3];
    const currentWeightIdx = weightSteps.indexOf(position.holdDurationWeight);
    const weightProgress = ((currentWeightIdx + 1) / weightSteps.length) * 100;

    return (
      <div className="flex items-stretch gap-0 h-full">
        {/* Direction + PnL */}
        <div className="flex items-center gap-4 px-5 border-r border-[rgba(255,255,255,0.06)]">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold shrink-0 ${
            position.direction === 'long' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'
          }`}>
            {position.direction === 'long' ? '↑ LONG' : '↓ SHORT'}
            <span className="text-sm opacity-70">{position.size.toFixed(0)}U</span>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold tabular-nums ${isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)} U
            </div>
            <div className={`text-xs font-mono ${isProfitable ? 'text-[#0ECB81]/70' : 'text-[#F6465D]/70'}`}>
              {isProfitable ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Price info */}
        <div className="flex items-center gap-5 px-5 border-r border-[rgba(255,255,255,0.06)]">
          <div>
            <div className="text-[10px] text-[#848E9C] mb-0.5">Entry</div>
            <div className="font-mono text-[#D1D4DC] text-sm">{formatPrice(position.entryPrice)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#848E9C] mb-0.5">Mark</div>
            <div className="font-mono text-[#D1D4DC] text-sm">{formatPrice(currentPrice)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#848E9C] mb-0.5">Trade</div>
            <div className="font-mono text-[#D1D4DC] text-sm">#{position.tradeNumber}/{account.tradesMax}</div>
          </div>
        </div>

        {/* Hold Duration & Weight */}
        <div className="flex items-center gap-4 px-5 border-r border-[rgba(255,255,255,0.06)]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#848E9C]">Hold</span>
              <span className="font-mono text-[#D1D4DC] tabular-nums text-sm">{formatDuration(holdSeconds)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#848E9C]">Weight</span>
              <span className="font-mono text-[#F0B90B] font-bold text-sm">{position.holdDurationWeight}x</span>
            </div>
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F6465D] via-[#F0B90B] to-[#0ECB81] rounded-full transition-all duration-500"
                style={{ width: `${weightProgress}%` }} />
            </div>
            {nextThreshold && (
              <div className="text-[10px] text-[#F0B90B]/80">
                {formatDuration(nextThreshold.secondsNeeded)} → {nextThreshold.nextWeight}x
              </div>
            )}
          </div>
        </div>

        {/* TP/SL */}
        <div className="flex items-center gap-2 px-4 border-r border-[rgba(255,255,255,0.06)]">
          {!editingTpSl ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#848E9C]">TP</span>
                {position.takeProfit ? <span className="font-mono text-[#0ECB81]">{formatPrice(position.takeProfit)}</span> : <span className="text-[#848E9C]/40">—</span>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#848E9C]">SL</span>
                {position.stopLoss ? <span className="font-mono text-[#F6465D]">{formatPrice(position.stopLoss)}</span> : <span className="text-[#848E9C]/40">—</span>}
              </div>
              <button onClick={() => setEditingTpSl(true)} className="text-[10px] text-[#F0B90B] hover:text-[#F0B90B]/80">
                {position.takeProfit || position.stopLoss ? 'Edit' : '+ Set TP/SL'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <input type="number" step={priceStep} value={editTp} onChange={e => setEditTp(e.target.value)} placeholder="TP"
                  className="w-24 bg-[#0B0E11] border border-[#0ECB81]/30 rounded px-2 py-1 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#0ECB81] focus:outline-none" />
                <input type="number" step={priceStep} value={editSl} onChange={e => setEditSl(e.target.value)} placeholder="SL"
                  className="w-24 bg-[#0B0E11] border border-[#F6465D]/30 rounded px-2 py-1 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#F6465D] focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={handleSaveTpSl} className="px-3 py-1 bg-[#F0B90B]/20 text-[#F0B90B] text-[10px] rounded hover:bg-[#F0B90B]/30">Save</button>
                <button onClick={() => { onSetTpSl?.(null, null); setEditingTpSl(false); }} className="px-3 py-1 bg-white/5 text-[#848E9C] text-[10px] rounded hover:bg-white/10">Clear</button>
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="flex items-center px-5">
          {!showCloseWarning ? (
            <button onClick={handleClose} disabled={isSubmitting}
              className={`px-8 py-3 rounded-lg font-bold text-base transition-all active:scale-[0.97] whitespace-nowrap disabled:opacity-50 ${
                isProfitable ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black' : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white'
              }`}>
              {isSubmitting
                ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin mx-auto" />
                : <>Close ({isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)} U)</>
              }
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#F6465D]">Weight 0.2x</span>
              <button onClick={confirmClose} className="px-4 py-2 bg-[#F6465D]/20 text-[#F6465D] text-sm rounded hover:bg-[#F6465D]/30 font-medium">Confirm</button>
              <button onClick={() => setShowCloseWarning(false)} className="px-4 py-2 bg-white/5 text-[#D1D4DC] text-sm rounded hover:bg-white/10">Hold</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ORDER ENTRY VIEW ────────────────────────────────────
  return (
    <div className="flex items-stretch gap-0 h-full">
      {/* Price + Balance */}
      <div className="flex items-center gap-5 px-5 border-r border-[rgba(255,255,255,0.06)]">
        <div>
          <div className="text-[10px] text-[#848E9C] mb-0.5">Market Price</div>
          <div className="font-mono text-[#D1D4DC] tabular-nums text-base font-semibold">{formatPrice(currentPrice)}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#848E9C] mb-0.5">Available</div>
          <div className="font-mono text-[#D1D4DC] text-base font-semibold">{account.equity.toFixed(2)} U</div>
        </div>
        <div>
          <div className="text-[10px] text-[#848E9C] mb-0.5">Trades Left</div>
          <div className={`font-mono text-base font-semibold ${(account.tradesMax - account.tradesUsed) <= 5 ? 'text-[#F6465D]' : 'text-[#D1D4DC]'}`}>
            {account.tradesMax - account.tradesUsed}/{account.tradesMax}
          </div>
        </div>
      </div>

      {/* Position Size + Leverage */}
      <div className="flex items-center gap-4 px-5 border-r border-[rgba(255,255,255,0.06)] min-w-[340px]">
        <div className="flex-1 space-y-1.5">
          {/* Row 1: Input + Unit toggle + Notional */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={sizeInput}
                onChange={e => handleSizeInputChange(e.target.value)}
                onBlur={() => {
                  const v = parseFloat(sizeInput);
                  if (!Number.isFinite(v) || v <= 0) {
                    setSizeInput(sizeUnit === 'SOL' && currentPrice > 0 ? (positionSize / currentPrice).toFixed(4) : String(positionSize));
                  }
                }}
                min={0}
                step={sizeUnit === 'SOL' ? 0.01 : 10}
                className="w-full bg-[#0B0E11] border border-[#2B3139] rounded px-2.5 py-1.5 pr-16 text-sm font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#F0B90B] focus:outline-none tabular-nums"
              />
              <button
                onClick={handleToggleUnit}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium"
              >
                <span className={sizeUnit === 'USDT' ? 'text-[#F0B90B]' : 'text-[#848E9C]'}>USDT</span>
                <span className="text-[#848E9C]/40">/</span>
                <span className={sizeUnit === 'SOL' ? 'text-[#F0B90B]' : 'text-[#848E9C]'}>SOL</span>
              </button>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-xs">
                <span className="text-[#848E9C]">×{account.tierLeverage}</span>
                <span className="text-[#848E9C] mx-0.5">=</span>
                <span className="text-[#F0B90B] font-bold">{notionalSize} U</span>
              </div>
              {sizeUnit === 'SOL' && currentPrice > 0 && (
                <div className="text-[10px] text-[#848E9C]/60 font-mono">{positionSize} USDT</div>
              )}
            </div>
          </div>
          {/* Row 2: Slider */}
          <Slider
            value={[positionSize]}
            onValueChange={([v]) => handleSliderChange(v)}
            min={10}
            max={maxEquity}
            step={10}
            className="[&_[role=slider]]:bg-[#F0B90B] [&_[role=slider]]:border-[#F0B90B] [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:shadow-[0_0_8px_rgba(240,185,11,0.4)]"
          />
          {/* Row 3: Pct buttons */}
          <div className="flex gap-1.5">
            {[25, 50, 75, 100].map(pct => (
              <button key={pct}
                onClick={() => handlePctClick(pct)}
                className="flex-1 py-0.5 bg-white/5 rounded text-[11px] text-[#D1D4DC] hover:bg-white/10 hover:text-[#F0B90B] transition-colors font-medium"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
        {/* Leverage badge */}
        <div className="flex flex-col items-center shrink-0">
          <div className="px-2.5 py-1.5 rounded-lg border-2 border-[#F0B90B]/40 bg-[#F0B90B]/10">
            <div className="text-[#F0B90B] text-base font-bold font-mono leading-none">{account.tierLeverage}x</div>
          </div>
          <div className="text-[9px] text-[#848E9C] mt-1 capitalize font-medium">{account.rankTier}</div>
        </div>
      </div>

      {/* TP/SL */}
      <div className="flex items-center gap-2 px-4 border-r border-[rgba(255,255,255,0.06)]">
        <button onClick={() => setShowTpSl(!showTpSl)}
          className="flex items-center gap-1.5 text-xs text-[#848E9C] hover:text-[#D1D4DC] transition-colors shrink-0">
          <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            showTpSl ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#848E9C]/40'
          }`}>
            {showTpSl && <span className="text-black text-[8px] font-bold">✓</span>}
          </span>
          TP/SL
        </button>
        {showTpSl && (
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <input type="number" step={priceStep} value={tpInput} onChange={e => setTpInput(e.target.value)} placeholder="TP Price"
                className="w-24 bg-[#0B0E11] border border-[#0ECB81]/20 rounded px-2 py-1 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#0ECB81] focus:outline-none" />
              <input type="number" step={priceStep} value={slInput} onChange={e => setSlInput(e.target.value)} placeholder="SL Price"
                className="w-24 bg-[#0B0E11] border border-[#F6465D]/20 rounded px-2 py-1 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#F6465D] focus:outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* Buy/Sell buttons — BIGGER */}
      <div className="flex items-center gap-3 px-5">
        <button
          onClick={() => showTpSl ? handleOpenWithTpSl('long') : handleOpen('long')}
          disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0 || isStale || isSubmitting}
          className="px-7 py-3 bg-[#0ECB81] hover:bg-[#0ECB81]/90 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-base rounded-lg transition-all active:scale-[0.97] whitespace-nowrap"
        >
          {isSubmitting
            ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
            : <>
                <div className="leading-tight">Buy / Long</div>
                <div className="text-[10px] font-normal opacity-70">{positionSize} → {notionalSize} U</div>
              </>
          }
        </button>
        <button
          onClick={() => showTpSl ? handleOpenWithTpSl('short') : handleOpen('short')}
          disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0 || isStale || isSubmitting}
          className="px-7 py-3 bg-[#F6465D] hover:bg-[#F6465D]/90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-base rounded-lg transition-all active:scale-[0.97] whitespace-nowrap"
        >
          {isSubmitting
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            : <>
                <div className="leading-tight">Sell / Short</div>
                <div className="text-[10px] font-normal opacity-70">{positionSize} → {notionalSize} U</div>
              </>
          }
        </button>
      </div>
    </div>
  );
}

export default memo(TradingPanel);
