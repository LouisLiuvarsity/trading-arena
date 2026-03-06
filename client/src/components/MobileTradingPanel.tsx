// ============================================================
// Mobile Trading Panel — Vertical stacked trade controls for mobile
// Two modes: Order Entry (no position) and Position View (has position)
// Compact layout optimized for thumb interaction
// Supports price/percentage dual-mode TP/SL, independent edit/cancel
// ============================================================

import { useState, useEffect, useCallback, memo } from 'react';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Position, AccountState } from '@/lib/types';
import { useTradingPair } from '@/contexts/TradingPairContext';
import { useT } from '@/lib/i18n';

interface Props {
  account: AccountState;
  position: Position | null;
  currentPrice: number;
  onOpenPosition: (direction: 'long' | 'short', size: number, tp?: number | null, sl?: number | null) => Promise<void> | void;
  onClosePosition: () => Promise<void> | void;
  onSetTpSl?: (tp?: number | null, sl?: number | null) => void;
  isStale?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h${rm}m`;
  }
  return `${m}m${s}s`;
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

// TP/SL percentage helpers
function pctToPrice(entryPrice: number, pct: number, direction: 'long' | 'short', type: 'tp' | 'sl', leverage: number): number {
  const factor = pct / 100 / leverage;
  if (type === 'tp') {
    return direction === 'long' ? entryPrice * (1 + factor) : entryPrice * (1 - factor);
  }
  return direction === 'long' ? entryPrice * (1 - factor) : entryPrice * (1 + factor);
}

const QUICK_PCT = [1, 2, 3, 5, 10];

type TpSlMode = 'price' | 'pct';

function MobileTradingPanel({
  account, position, currentPrice, onOpenPosition, onClosePosition, onSetTpSl, isStale
}: Props) {
  const { t } = useT();
  const { baseAsset: BASE } = useTradingPair();
  const [positionSize, setPositionSize] = useState(250);
  const [sizeUnit, setSizeUnit] = useState<'USDT' | 'BASE'>('USDT');
  const [sizeInput, setSizeInput] = useState('250');
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Order entry TP/SL
  const [showTpSl, setShowTpSl] = useState(false);
  const [orderTpSlMode, setOrderTpSlMode] = useState<TpSlMode>('pct');
  const [orderTpInput, setOrderTpInput] = useState('');
  const [orderSlInput, setOrderSlInput] = useState('');

  // Position TP/SL editing
  const [editingTp, setEditingTp] = useState(false);
  const [editingTpMode, setEditingTpMode] = useState<TpSlMode>('price');
  const [editTpInput, setEditTpInput] = useState('');

  const [editingSl, setEditingSl] = useState(false);
  const [editingSlMode, setEditingSlMode] = useState<TpSlMode>('price');
  const [editSlInput, setEditSlInput] = useState('');

  useEffect(() => {
    if (!position) { setHoldSeconds(0); return; }
    const interval = setInterval(() => {
      setHoldSeconds((Date.now() - position.openTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [position]);

  useEffect(() => {
    if (editingTp && position) {
      if (position.takeProfit) {
        setEditTpInput(formatPrice(position.takeProfit));
        setEditingTpMode('price');
      } else {
        setEditTpInput('');
        setEditingTpMode('pct');
      }
    }
  }, [editingTp, position?.takeProfit]);

  useEffect(() => {
    if (editingSl && position) {
      if (position.stopLoss) {
        setEditSlInput(formatPrice(position.stopLoss));
        setEditingSlMode('price');
      } else {
        setEditSlInput('');
        setEditingSlMode('pct');
      }
    }
  }, [editingSl, position?.stopLoss]);

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

  // Resolve order entry TP/SL
  const resolveOrderTpSl = useCallback((direction: 'long' | 'short') => {
    let tp: number | null = null;
    let sl: number | null = null;
    if (orderTpInput) {
      const v = parseFloat(orderTpInput);
      if (Number.isFinite(v) && v > 0) {
        tp = orderTpSlMode === 'pct'
          ? pctToPrice(currentPrice, v, direction, 'tp', account.tierLeverage)
          : v;
      }
    }
    if (orderSlInput) {
      const v = parseFloat(orderSlInput);
      if (Number.isFinite(v) && v > 0) {
        sl = orderTpSlMode === 'pct'
          ? pctToPrice(currentPrice, v, direction, 'sl', account.tierLeverage)
          : v;
      }
    }
    return { tp, sl };
  }, [orderTpInput, orderSlInput, orderTpSlMode, currentPrice, account.tierLeverage]);

  const handleOpen = useCallback(async (direction: 'long' | 'short') => {
    if (isSubmitting) return;
    const { tp, sl } = showTpSl ? resolveOrderTpSl(direction) : { tp: null, sl: null };
    if (tp !== null && direction === 'long' && tp <= currentPrice) return;
    if (tp !== null && direction === 'short' && tp >= currentPrice) return;
    if (sl !== null && direction === 'long' && sl >= currentPrice) return;
    if (sl !== null && direction === 'short' && sl <= currentPrice) return;
    setIsSubmitting(true);
    try {
      await onOpenPosition(direction, positionSize, tp, sl);
      setOrderTpInput(''); setOrderSlInput('');
    } finally { setIsSubmitting(false); }
  }, [isSubmitting, showTpSl, resolveOrderTpSl, currentPrice, positionSize, onOpenPosition]);

  // Save TP independently
  const handleSaveTp = useCallback(() => {
    if (!onSetTpSl || !position || !editTpInput) return;
    const v = parseFloat(editTpInput);
    if (!Number.isFinite(v) || v <= 0) return;
    const tpPrice = editingTpMode === 'pct'
      ? pctToPrice(position.entryPrice, v, position.direction, 'tp', account.tierLeverage)
      : v;
    if (position.direction === 'long' && tpPrice <= currentPrice) return;
    if (position.direction === 'short' && tpPrice >= currentPrice) return;
    onSetTpSl(tpPrice, undefined);
    setEditingTp(false);
  }, [editTpInput, editingTpMode, position, currentPrice, account.tierLeverage, onSetTpSl]);

  // Save SL independently
  const handleSaveSl = useCallback(() => {
    if (!onSetTpSl || !position || !editSlInput) return;
    const v = parseFloat(editSlInput);
    if (!Number.isFinite(v) || v <= 0) return;
    const slPrice = editingSlMode === 'pct'
      ? pctToPrice(position.entryPrice, v, position.direction, 'sl', account.tierLeverage)
      : v;
    if (position.direction === 'long' && slPrice >= currentPrice) return;
    if (position.direction === 'short' && slPrice <= currentPrice) return;
    onSetTpSl(undefined, slPrice);
    setEditingSl(false);
  }, [editSlInput, editingSlMode, position, currentPrice, account.tierLeverage, onSetTpSl]);

  // Cancel (clear) TP
  const handleCancelTp = useCallback(() => {
    if (!onSetTpSl) return;
    onSetTpSl(null, undefined);
    setEditingTp(false);
  }, [onSetTpSl]);

  // Cancel (clear) SL
  const handleCancelSl = useCallback(() => {
    if (!onSetTpSl) return;
    onSetTpSl(undefined, null);
    setEditingSl(false);
  }, [onSetTpSl]);

  const maxEquity = Math.max(10, Math.floor(account.equity));

  const handleSizeInputChange = useCallback((raw: string) => {
    setSizeInput(raw);
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v <= 0) return;
    const usdt = sizeUnit === 'BASE' && currentPrice > 0 ? Math.round(v * currentPrice) : Math.round(v);
    setPositionSize(Math.max(10, Math.min(usdt, maxEquity)));
  }, [sizeUnit, currentPrice, maxEquity]);

  const handleSliderChange = useCallback((v: number) => {
    setPositionSize(v);
    if (sizeUnit === 'BASE' && currentPrice > 0) {
      setSizeInput((v / currentPrice).toFixed(4));
    } else {
      setSizeInput(String(v));
    }
  }, [sizeUnit, currentPrice]);

  const handlePctClick = useCallback((pct: number) => {
    const usdt = Math.max(10, Math.floor(account.equity * pct / 100));
    setPositionSize(usdt);
    if (sizeUnit === 'BASE' && currentPrice > 0) {
      setSizeInput((usdt / currentPrice).toFixed(4));
    } else {
      setSizeInput(String(usdt));
    }
  }, [account.equity, sizeUnit, currentPrice]);

  const handleToggleUnit = useCallback(() => {
    const next = sizeUnit === 'USDT' ? 'BASE' : 'USDT';
    setSizeUnit(next);
    if (next === 'BASE' && currentPrice > 0) {
      setSizeInput((positionSize / currentPrice).toFixed(4));
    } else {
      setSizeInput(String(positionSize));
    }
  }, [sizeUnit, currentPrice, positionSize]);

  const priceStep = getPriceStep(currentPrice);
  const notionalSize = Math.round(positionSize * account.tierLeverage);

  // ─── POSITION VIEW ───────────────────────────────────────
  if (position) {
    const isProfitable = position.unrealizedPnl >= 0;

    const tpPnl = position.takeProfit
      ? (position.direction === 'long'
        ? (position.takeProfit - position.entryPrice) / position.entryPrice * 100 * account.tierLeverage
        : (position.entryPrice - position.takeProfit) / position.entryPrice * 100 * account.tierLeverage)
      : null;
    const slPnl = position.stopLoss
      ? (position.direction === 'long'
        ? (position.stopLoss - position.entryPrice) / position.entryPrice * 100 * account.tierLeverage
        : (position.entryPrice - position.stopLoss) / position.entryPrice * 100 * account.tierLeverage)
      : null;

    return (
      <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#0B0E11]">
        {/* Compact summary row — always visible */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              position.direction === 'long' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'
            }`}>
              {position.direction === 'long' ? t('tp.long') : t('tp.short')}
            </span>
            <span className="text-[10px] text-[#848E9C] font-mono">{position.size.toFixed(0)}U</span>
          </div>

          <div className={`text-base font-bold font-mono tabular-nums ${isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)}U
            <span className="text-[10px] ml-1 opacity-70">
              ({isProfitable ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%)
            </span>
          </div>

          <button onClick={() => setExpanded(!expanded)} className="p-1 text-[#848E9C]">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Expandable details */}
        {expanded && (
          <div className="px-3 pb-2 space-y-2 animate-fade-in-up">
            {/* Price + Hold info */}
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <div className="text-[#848E9C]">{t('tp.entry')}</div>
                <div className="font-mono text-[#D1D4DC]">{formatPrice(position.entryPrice)}</div>
              </div>
              <div>
                <div className="text-[#848E9C]">{t('tp.mark')}</div>
                <div className="font-mono text-[#D1D4DC]">{formatPrice(currentPrice)}</div>
              </div>
              <div>
                <div className="text-[#848E9C]">{t('tp.hold')}</div>
                <div className="font-mono text-[#D1D4DC]">{formatDuration(holdSeconds)}</div>
              </div>
            </div>

            {/* TP — Independent editing */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#0ECB81] font-medium w-6">TP</span>
              {!editingTp ? (
                <>
                  {position.takeProfit ? (
                    <span className="font-mono text-[#0ECB81]">{formatPrice(position.takeProfit)}
                      {tpPnl !== null && <span className="text-[9px] opacity-60 ml-1">+{tpPnl.toFixed(1)}%</span>}
                    </span>
                  ) : (
                    <span className="text-[#848E9C]/40">{t('tp.notSet')}</span>
                  )}
                  <button onClick={() => setEditingTp(true)} className="text-[#F0B90B] ml-auto">{position.takeProfit ? t('tp.edit') : t('tp.set')}</button>
                  {position.takeProfit && (
                    <button onClick={handleCancelTp} className="text-[#F6465D]/60">{t('tp.cancel')}</button>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center gap-1.5">
                  <div className="flex rounded overflow-hidden border border-[rgba(255,255,255,0.1)]">
                    <button onClick={() => { setEditingTpMode('price'); setEditTpInput(''); }}
                      className={`px-1.5 py-0.5 text-[9px] ${editingTpMode === 'price' ? 'bg-[#0ECB81]/20 text-[#0ECB81]' : 'text-[#848E9C]'}`}>$</button>
                    <button onClick={() => { setEditingTpMode('pct'); setEditTpInput(''); }}
                      className={`px-1.5 py-0.5 text-[9px] ${editingTpMode === 'pct' ? 'bg-[#0ECB81]/20 text-[#0ECB81]' : 'text-[#848E9C]'}`}>%</button>
                  </div>
                  <input type="number" step={editingTpMode === 'pct' ? 0.5 : priceStep} value={editTpInput}
                    onChange={e => setEditTpInput(e.target.value)}
                    placeholder={editingTpMode === 'pct' ? t('tp.roiPct') : t('tp.priceLabel')}
                    className="flex-1 bg-[#0B0E11] border border-[#0ECB81]/30 rounded px-2 py-1 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#0ECB81] focus:outline-none" />
                  {editingTpMode === 'pct' && (
                    <div className="flex gap-0.5">
                      {QUICK_PCT.slice(0, 3).map(p => (
                        <button key={p} onClick={() => setEditTpInput(String(p))}
                          className="px-1 py-0.5 text-[8px] bg-[#0ECB81]/10 text-[#0ECB81]/70 rounded">{p}%</button>
                      ))}
                    </div>
                  )}
                  <button onClick={handleSaveTp} className="text-[#0ECB81] font-medium">{t('tp.save')}</button>
                  <button onClick={() => setEditingTp(false)} className="text-[#848E9C]">×</button>
                </div>
              )}
            </div>

            {/* SL — Independent editing */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#F6465D] font-medium w-6">SL</span>
              {!editingSl ? (
                <>
                  {position.stopLoss ? (
                    <span className="font-mono text-[#F6465D]">{formatPrice(position.stopLoss)}
                      {slPnl !== null && <span className="text-[9px] opacity-60 ml-1">{slPnl.toFixed(1)}%</span>}
                    </span>
                  ) : (
                    <span className="text-[#848E9C]/40">{t('tp.notSet')}</span>
                  )}
                  <button onClick={() => setEditingSl(true)} className="text-[#F0B90B] ml-auto">{position.stopLoss ? t('tp.edit') : t('tp.set')}</button>
                  {position.stopLoss && (
                    <button onClick={handleCancelSl} className="text-[#F6465D]/60">{t('tp.cancel')}</button>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center gap-1.5">
                  <div className="flex rounded overflow-hidden border border-[rgba(255,255,255,0.1)]">
                    <button onClick={() => { setEditingSlMode('price'); setEditSlInput(''); }}
                      className={`px-1.5 py-0.5 text-[9px] ${editingSlMode === 'price' ? 'bg-[#F6465D]/20 text-[#F6465D]' : 'text-[#848E9C]'}`}>$</button>
                    <button onClick={() => { setEditingSlMode('pct'); setEditSlInput(''); }}
                      className={`px-1.5 py-0.5 text-[9px] ${editingSlMode === 'pct' ? 'bg-[#F6465D]/20 text-[#F6465D]' : 'text-[#848E9C]'}`}>%</button>
                  </div>
                  <input type="number" step={editingSlMode === 'pct' ? 0.5 : priceStep} value={editSlInput}
                    onChange={e => setEditSlInput(e.target.value)}
                    placeholder={editingSlMode === 'pct' ? t('tp.roiPct') : t('tp.priceLabel')}
                    className="flex-1 bg-[#0B0E11] border border-[#F6465D]/30 rounded px-2 py-1 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#F6465D] focus:outline-none" />
                  {editingSlMode === 'pct' && (
                    <div className="flex gap-0.5">
                      {QUICK_PCT.slice(0, 3).map(p => (
                        <button key={p} onClick={() => setEditSlInput(String(p))}
                          className="px-1 py-0.5 text-[8px] bg-[#F6465D]/10 text-[#F6465D]/70 rounded">{p}%</button>
                      ))}
                    </div>
                  )}
                  <button onClick={handleSaveSl} className="text-[#F6465D] font-medium">{t('tp.save')}</button>
                  <button onClick={() => setEditingSl(false)} className="text-[#848E9C]">×</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close button — always visible at bottom */}
        <div className="px-3 pb-3 pt-1">
          {!showCloseWarning ? (
            <button onClick={handleClose} disabled={isSubmitting}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
                isProfitable ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black' : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white'
              }`}>
              {isSubmitting
                ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin mx-auto" />
                : <>{t('tp.closePosition')} ({isProfitable ? '+' : ''}{position.unrealizedPnl.toFixed(2)} U)</>
              }
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={confirmClose} className="flex-1 py-3 bg-[#F6465D]/20 text-[#F6465D] text-sm rounded-lg font-medium">
                {t('tp.confirmWeight')}
              </button>
              <button onClick={() => setShowCloseWarning(false)} className="flex-1 py-3 bg-white/5 text-[#D1D4DC] text-sm rounded-lg">
                {t('tp.hold')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ORDER ENTRY VIEW ────────────────────────────────────
  return (
    <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#0B0E11]">
      {/* Price + Balance row */}
      <div className="flex items-center justify-between px-3 py-2 text-[10px]">
        <div>
          <span className="text-[#848E9C]">{t('tp.priceLabel')} </span>
          <span className="font-mono text-[#D1D4DC] font-semibold">{formatPrice(currentPrice)}</span>
        </div>
        <div>
          <span className="text-[#848E9C]">{t('tp.avail')} </span>
          <span className="font-mono text-[#D1D4DC] font-semibold">{account.equity.toFixed(1)}U</span>
        </div>
        <div>
          <span className="text-[#848E9C]">{t('tp.left')} </span>
          <span className={`font-mono font-semibold ${(account.tradesMax - account.tradesUsed) <= 5 ? 'text-[#F6465D]' : 'text-[#D1D4DC]'}`}>
            {account.tradesMax - account.tradesUsed}/{account.tradesMax}
          </span>
        </div>
        <div>
          <span className="font-mono text-[#F0B90B] font-bold">{account.tierLeverage}x</span>
          <span className="text-[#848E9C] capitalize ml-0.5">{account.rankTier}</span>
        </div>
      </div>

      {/* Size input + Slider */}
      <div className="px-3 pb-2 space-y-2">
        {/* Input row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={sizeInput}
              onChange={e => handleSizeInputChange(e.target.value)}
              onBlur={() => {
                const v = parseFloat(sizeInput);
                if (!Number.isFinite(v) || v <= 0) {
                  setSizeInput(sizeUnit === 'BASE' && currentPrice > 0 ? (positionSize / currentPrice).toFixed(4) : String(positionSize));
                }
              }}
              min={0}
              step={sizeUnit === 'BASE' ? 0.01 : 10}
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded px-2.5 py-2 pr-16 text-sm font-mono text-[#D1D4DC] focus:border-[#F0B90B] focus:outline-none tabular-nums"
            />
            <button
              onClick={handleToggleUnit}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] font-medium"
            >
              <span className={sizeUnit === 'USDT' ? 'text-[#F0B90B]' : 'text-[#848E9C]'}>USDT</span>
              <span className="text-[#848E9C]/40">/</span>
              <span className={sizeUnit === 'BASE' ? 'text-[#F0B90B]' : 'text-[#848E9C]'}>{BASE}</span>
            </button>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-xs">
              <span className="text-[#848E9C]">×{account.tierLeverage}=</span>
              <span className="text-[#F0B90B] font-bold">{notionalSize}U</span>
            </div>
          </div>
        </div>

        {/* Slider */}
        <Slider
          value={[positionSize]}
          onValueChange={([v]) => handleSliderChange(v)}
          min={10}
          max={maxEquity}
          step={10}
          className="[&_[role=slider]]:bg-[#F0B90B] [&_[role=slider]]:border-[#F0B90B] [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:shadow-[0_0_8px_rgba(240,185,11,0.4)]"
        />

        {/* Pct buttons */}
        <div className="flex gap-1.5">
          {[25, 50, 75, 100].map(pct => (
            <button key={pct}
              onClick={() => handlePctClick(pct)}
              className="flex-1 py-1 bg-white/5 rounded text-[11px] text-[#D1D4DC] hover:bg-white/10 hover:text-[#F0B90B] transition-colors font-medium"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* TP/SL toggle + dual mode */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTpSl(!showTpSl)}
              className="flex items-center gap-1.5 text-[11px] text-[#848E9C] hover:text-[#D1D4DC]">
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                showTpSl ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#848E9C]/40'
              }`}>
                {showTpSl && <span className="text-black text-[8px] font-bold">✓</span>}
              </span>
              {t('tp.tpsl')}
            </button>
            {showTpSl && (
              <div className="flex rounded overflow-hidden border border-[rgba(255,255,255,0.1)]">
                <button onClick={() => { setOrderTpSlMode('price'); setOrderTpInput(''); setOrderSlInput(''); }}
                  className={`px-2 py-0.5 text-[10px] ${orderTpSlMode === 'price' ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'text-[#848E9C]'}`}>{t('tp.priceLabel')}</button>
                <button onClick={() => { setOrderTpSlMode('pct'); setOrderTpInput(''); setOrderSlInput(''); }}
                  className={`px-2 py-0.5 text-[10px] ${orderTpSlMode === 'pct' ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'text-[#848E9C]'}`}>{t('tp.roiPct')}</button>
              </div>
            )}
          </div>
          {showTpSl && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input type="number" step={orderTpSlMode === 'pct' ? 0.5 : priceStep} value={orderTpInput}
                  onChange={e => setOrderTpInput(e.target.value)}
                  placeholder={orderTpSlMode === 'pct' ? t('tp.tpRoi') : t('tp.tpPrice')}
                  className="flex-1 bg-[#0B0E11] border border-[#0ECB81]/20 rounded px-2 py-1.5 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#0ECB81] focus:outline-none" />
                <input type="number" step={orderTpSlMode === 'pct' ? 0.5 : priceStep} value={orderSlInput}
                  onChange={e => setOrderSlInput(e.target.value)}
                  placeholder={orderTpSlMode === 'pct' ? t('tp.slRoi') : t('tp.slPrice')}
                  className="flex-1 bg-[#0B0E11] border border-[#F6465D]/20 rounded px-2 py-1.5 text-xs font-mono text-[#D1D4DC] placeholder:text-[#848E9C]/30 focus:border-[#F6465D] focus:outline-none" />
              </div>
              {orderTpSlMode === 'pct' && (
                <div className="flex gap-1">
                  <div className="flex-1 flex gap-0.5">
                    {QUICK_PCT.map(p => (
                      <button key={`tp-${p}`} onClick={() => setOrderTpInput(String(p))}
                        className="flex-1 py-0.5 text-[8px] bg-[#0ECB81]/10 text-[#0ECB81]/70 rounded hover:bg-[#0ECB81]/20">{p}%</button>
                    ))}
                  </div>
                  <div className="flex-1 flex gap-0.5">
                    {QUICK_PCT.map(p => (
                      <button key={`sl-${p}`} onClick={() => setOrderSlInput(String(p))}
                        className="flex-1 py-0.5 text-[8px] bg-[#F6465D]/10 text-[#F6465D]/70 rounded hover:bg-[#F6465D]/20">{p}%</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Buy / Sell buttons — full width, thumb-friendly */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={() => handleOpen('long')}
          disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0 || isStale || isSubmitting}
          className="flex-1 py-3.5 bg-[#0ECB81] hover:bg-[#0ECB81]/90 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-sm rounded-lg transition-all active:scale-[0.97]"
        >
          {isSubmitting
            ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
            : <>{t('tp.buyLong')}<div className="text-[10px] font-normal opacity-70">{positionSize} → {notionalSize}U</div></>
          }
        </button>
        <button
          onClick={() => handleOpen('short')}
          disabled={account.tradesUsed >= account.tradesMax || currentPrice === 0 || isStale || isSubmitting}
          className="flex-1 py-3.5 bg-[#F6465D] hover:bg-[#F6465D]/90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-all active:scale-[0.97]"
        >
          {isSubmitting
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            : <>{t('tp.sellShort')}<div className="text-[10px] font-normal opacity-70">{positionSize} → {notionalSize}U</div></>
          }
        </button>
      </div>
    </div>
  );
}

export default memo(MobileTradingPanel);
