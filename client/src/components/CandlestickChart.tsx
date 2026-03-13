// ============================================================
// Candlestick Chart — lightweight-charts v5 integration
// Supports: TP/SL/Entry price lines, 6 overlay indicators,
// Multiple simultaneous sub-chart indicators with crosshair sync
// ============================================================

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createChart,
  createTextWatermark,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, ITextWatermarkPluginApi, Time } from 'lightweight-charts';
import type { KlineData, TimeframeKey, Position } from '@/lib/types';
import { useTradingPair } from '@/contexts/TradingPairContext';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import IndicatorSettings, { type ActiveIndicator } from './IndicatorSettings';
import {
  type IndicatorKey, type Candle,
  INDICATOR_REGISTRY,
  MA_COLORS, EMA_COLORS,
  calcMA, calcEMA, calcBOLL, calcSAR, calcAVL, calcSUPER,
  calcVOL, calcMACD, calcRSI, calcKDJ, calcOBV, calcWR,
} from '@/lib/indicators';

interface Props {
  klines: KlineData[];
  loading: boolean;
  timeframe: TimeframeKey;
  onTimeframeChange: (tf: TimeframeKey) => void;
  position?: Position | null;
  onSetTpSl?: (tp?: number | null, sl?: number | null) => void;
  lang?: 'zh' | 'en';
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(5);
  return price.toFixed(6);
}

interface TpSlPopover {
  type: 'tp' | 'sl';
  price: number;
  x: number;
  y: number;
  estimatedPnl: number;
  estimatedPnlPct: number;
}

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: '1m', label: '1m' },
  { key: '5m', label: '5m' },
  { key: '15m', label: '15m' },
  { key: '1h', label: '1H' },
  { key: '4h', label: '4H' },
];

// Storage key for persisting indicator state
const INDICATOR_STORAGE_KEY = 'arena_indicators';

function loadIndicatorState(): ActiveIndicator[] {
  try {
    const stored = localStorage.getItem(INDICATOR_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Default: VOL enabled
  return INDICATOR_REGISTRY.map(c => ({
    key: c.key,
    params: { ...c.defaultParams },
    enabled: c.key === 'VOL',
  }));
}

function saveIndicatorState(indicators: ActiveIndicator[]) {
  try {
    localStorage.setItem(INDICATOR_STORAGE_KEY, JSON.stringify(indicators));
  } catch {}
}

// Chart color constants
const CHART_BG = '#0B0E11';
const BOLL_COLORS = { mid: '#E6A817', upper: '#26a69a', lower: '#ef5350' };
const SAR_COLOR = '#E040FB';
const AVL_COLOR = '#00BCD4';
const PRICE_SCALE_MIN_WIDTH = 84;

// Sub-chart height strategy: returns height percentage per subchart
function getSubchartHeight(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 25;
  if (count === 2) return 17;
  return 13; // 3+
}

// Max simultaneous subcharts
const MAX_SUBCHARTS = 4;

// ─── Sub-pane instance type ────────────────────────────────
interface SubPaneInstance {
  paneIndex: number;
  series: (ISeriesApi<'Line'> | ISeriesApi<'Histogram'>)[];
  label: ITextWatermarkPluginApi<Time> | null;
}

function getSubchartLabel(ind: ActiveIndicator): string {
  switch (ind.key) {
    case 'VOL': return 'VOL';
    case 'MACD': { const p = ind.params as any; return `MACD(${p.fast},${p.slow},${p.signal})`; }
    case 'RSI': { const p = ind.params as any; return `RSI(${p.period})`; }
    case 'KDJ': { const p = ind.params as any; return `KDJ(${p.kPeriod},${p.dPeriod},${p.jSmooth})`; }
    case 'OBV': return 'OBV';
    case 'WR': { const p = ind.params as any; return `WR(${p.period})`; }
    default: return '';
  }
}

function getPaneStretchFactors(count: number): { main: number; sub: number } {
  if (count <= 0) return { main: 1, sub: 0 };

  const sub = getSubchartHeight(count);
  const main = Math.max(100 - sub * count, 35);
  return { main, sub };
}

function getSubchartLabelOptions(text: string) {
  return {
    visible: true,
    horzAlign: 'left' as const,
    vertAlign: 'top' as const,
    lines: [{
      text: ` ${text}`,
      color: '#848E9C',
      fontSize: 10,
      fontFamily: "'DM Mono', monospace",
      fontStyle: '',
    }],
  };
}

export default function CandlestickChart({ klines, loading, timeframe, onTimeframeChange, position, onSetTpSl, lang = 'en' }: Props) {
  const tradingPair = useTradingPair();

  // Single chart refs
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const mainVolumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const subPanesRef = useRef<Map<IndicatorKey, SubPaneInstance>>(new Map());

  // State
  const [tpSlPopover, setTpSlPopover] = useState<TpSlPopover | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [indicators, setIndicators] = useState<ActiveIndicator[]>(loadIndicatorState);

  // Memoize candles for indicator calculations
  const candles: Candle[] = useMemo(() =>
    klines.map(k => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    })),
    [klines]
  );

  // Active overlay and subchart indicators
  const activeOverlays = useMemo(
    () => indicators.filter(i => i.enabled && INDICATOR_REGISTRY.find(r => r.key === i.key)?.type === 'overlay'),
    [indicators]
  );
  const activeSubcharts = useMemo(
    () => indicators.filter(i => i.enabled && INDICATOR_REGISTRY.find(r => r.key === i.key)?.type === 'subchart').slice(0, MAX_SUBCHARTS),
    [indicators]
  );

  // Stable key for tracking which subcharts are active
  const activeSubchartKeys = useMemo(
    () => activeSubcharts.map(s => s.key).join(','),
    [activeSubcharts]
  );

  // ─── Indicator callbacks ──────────────────────────────────

  const handleToggle = useCallback((key: IndicatorKey) => {
    setIndicators(prev => {
      const ind = prev.find(i => i.key === key);
      if (!ind) return prev;

      // If trying to enable a subchart indicator, check the limit
      if (!ind.enabled) {
        const isSubchart = INDICATOR_REGISTRY.find(r => r.key === key)?.type === 'subchart';
        if (isSubchart) {
          const currentSubchartCount = prev.filter(
            i => i.enabled && INDICATOR_REGISTRY.find(r => r.key === i.key)?.type === 'subchart'
          ).length;
          if (currentSubchartCount >= MAX_SUBCHARTS) {
            toast.error(
              lang === 'zh'
                ? `最多同时显示 ${MAX_SUBCHARTS} 个副图指标`
                : `Maximum ${MAX_SUBCHARTS} sub-chart indicators allowed`,
              { duration: 2000 }
            );
            return prev;
          }
        }
      }

      const next = prev.map(i => i.key === key ? { ...i, enabled: !i.enabled } : i);
      saveIndicatorState(next);
      return next;
    });
  }, [lang]);

  const handleParamsChange = useCallback((key: IndicatorKey, params: Record<string, unknown>) => {
    setIndicators(prev => {
      const next = prev.map(i => i.key === key ? { ...i, params } : i);
      saveIndicatorState(next);
      return next;
    });
  }, []);

  const handleReset = useCallback((key: IndicatorKey) => {
    const config = INDICATOR_REGISTRY.find(c => c.key === key);
    if (!config) return;
    setIndicators(prev => {
      const next = prev.map(i => i.key === key ? { ...i, params: { ...config.defaultParams } } : i);
      saveIndicatorState(next);
      return next;
    });
  }, []);

  // Count active indicators for badge
  const activeCount = indicators.filter(i => i.enabled).length;

  const disposeSubPanes = useCallback((chart: IChartApi) => {
    Array.from(subPanesRef.current.values()).forEach(instance => {
      instance.label?.detach();
      instance.series.forEach(series => {
        try { chart.removeSeries(series); } catch {}
      });
    });
    subPanesRef.current.clear();

    while (chart.panes().length > 1) {
      try {
        chart.removePane(chart.panes().length - 1);
      } catch {
        break;
      }
    }
  }, []);

  const createSubPaneInstance = useCallback((chart: IChartApi, ind: ActiveIndicator, paneIndex: number): SubPaneInstance => {
    const pane = chart.panes()[paneIndex];
    pane.setPreserveEmptyPane(true);

    const label = createTextWatermark(pane, getSubchartLabelOptions(getSubchartLabel(ind)));
    const series: (ISeriesApi<'Line'> | ISeriesApi<'Histogram'>)[] = [];

    switch (ind.key) {
      case 'VOL': {
        const histS = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'vol',
        }, paneIndex);
        const maS = chart.addSeries(LineSeries, {
          color: '#E6A817',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'vol',
        }, paneIndex);
        series.push(histS, maS);
        break;
      }
      case 'MACD': {
        const histS = chart.addSeries(HistogramSeries, {
          priceScaleId: 'macd',
          priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
        }, paneIndex);
        const macdS = chart.addSeries(LineSeries, {
          color: '#2196F3',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'macd',
        }, paneIndex);
        const sigS = chart.addSeries(LineSeries, {
          color: '#FF9800',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'macd',
        }, paneIndex);
        series.push(histS, macdS, sigS);
        break;
      }
      case 'RSI': {
        const s = chart.addSeries(LineSeries, {
          color: '#E040FB',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
        }, paneIndex);
        s.createPriceLine({ price: 70, color: 'rgba(239,83,80,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
        s.createPriceLine({ price: 30, color: 'rgba(38,166,154,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
        series.push(s);
        break;
      }
      case 'KDJ': {
        const kS = chart.addSeries(LineSeries, { color: '#2196F3', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex);
        const dS = chart.addSeries(LineSeries, { color: '#FF9800', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex);
        const jS = chart.addSeries(LineSeries, { color: '#E040FB', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex);
        series.push(kS, dS, jS);
        break;
      }
      case 'OBV': {
        const obvS = chart.addSeries(LineSeries, {
          color: '#26a69a',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'obv',
        }, paneIndex);
        const maS = chart.addSeries(LineSeries, {
          color: '#FF9800',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'obv',
        }, paneIndex);
        series.push(obvS, maS);
        break;
      }
      case 'WR': {
        const s = chart.addSeries(LineSeries, {
          color: '#00BCD4',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
        }, paneIndex);
        s.createPriceLine({ price: -20, color: 'rgba(239,83,80,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
        s.createPriceLine({ price: -80, color: 'rgba(38,166,154,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
        series.push(s);
        break;
      }
    }

    return {
      paneIndex,
      series,
      label,
    };
  }, []);

  const updateSubPaneData = useCallback((instance: SubPaneInstance, ind: ActiveIndicator) => {
    instance.label?.applyOptions(getSubchartLabelOptions(getSubchartLabel(ind)));

    switch (ind.key) {
      case 'VOL': {
        const { bars, ma } = calcVOL(candles, ind.params as any);
        const [histS, maS] = instance.series as [ISeriesApi<'Histogram'>, ISeriesApi<'Line'>];
        histS.setData(bars.map(b => ({ time: b.time as Time, value: b.value, color: b.color })));
        maS.setData(ma.map(p => ({ time: p.time as Time, value: p.value })));
        break;
      }
      case 'MACD': {
        const { macd, signal, histogram } = calcMACD(candles, ind.params as any);
        const [histS, macdS, sigS] = instance.series as [ISeriesApi<'Histogram'>, ISeriesApi<'Line'>, ISeriesApi<'Line'>];
        histS.setData(histogram.map(h => ({ time: h.time as Time, value: h.value, color: h.color })));
        macdS.setData(macd.map(p => ({ time: p.time as Time, value: p.value })));
        sigS.setData(signal.map(p => ({ time: p.time as Time, value: p.value })));
        break;
      }
      case 'RSI': {
        const data = calcRSI(candles, ind.params as any);
        const [series] = instance.series as [ISeriesApi<'Line'>];
        series.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
        break;
      }
      case 'KDJ': {
        const { k, d, j } = calcKDJ(candles, ind.params as any);
        const [kS, dS, jS] = instance.series as [ISeriesApi<'Line'>, ISeriesApi<'Line'>, ISeriesApi<'Line'>];
        kS.setData(k.map(p => ({ time: p.time as Time, value: p.value })));
        dS.setData(d.map(p => ({ time: p.time as Time, value: p.value })));
        jS.setData(j.map(p => ({ time: p.time as Time, value: p.value })));
        break;
      }
      case 'OBV': {
        const { obv, ma } = calcOBV(candles, ind.params as any);
        const [obvS, maS] = instance.series as [ISeriesApi<'Line'>, ISeriesApi<'Line'>];
        obvS.setData(obv.map(p => ({ time: p.time as Time, value: p.value })));
        maS.setData(ma.map(p => ({ time: p.time as Time, value: p.value })));
        break;
      }
      case 'WR': {
        const data = calcWR(candles, ind.params as any);
        const [series] = instance.series as [ISeriesApi<'Line'>];
        series.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
        break;
      }
    }
  }, [candles]);

  // ─── Initialize main chart ────────────────────────────────

  useEffect(() => {
    if (!mainContainerRef.current) return;

    const chart = createChart(mainContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: '#848E9C',
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        panes: {
          enableResize: true,
          separatorColor: 'rgba(255,255,255,0.06)',
          separatorHoverColor: 'rgba(255,255,255,0.12)',
        },
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 2, labelBackgroundColor: '#1C2030' },
        horzLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 2, labelBackgroundColor: '#1C2030' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        scaleMargins: { top: 0.05, bottom: 0.15 },
        minimumWidth: PRICE_SCALE_MIN_WIDTH,
      },
      overlayPriceScales: {
        minimumWidth: PRICE_SCALE_MIN_WIDTH,
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    }, 0);

    // Volume as background on main chart
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    }, 0);
    chart.priceScale('volume', 0).applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    mainChartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    mainVolumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (mainContainerRef.current) {
        chart.applyOptions({
          width: mainContainerRef.current.clientWidth,
          height: mainContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mainContainerRef.current);
    handleResize();

    return () => {
      disposeSubPanes(chart);
      resizeObserver.disconnect();
      chart.remove();
      mainChartRef.current = null;
      candleSeriesRef.current = null;
      mainVolumeSeriesRef.current = null;
      overlaySeriesRef.current = [];
    };
  }, [disposeSubPanes]);

  // ─── Manage pane-based sub-charts ─────────────────────────

  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart) return;

    disposeSubPanes(chart);

    activeSubcharts.forEach(() => {
      chart.addPane(true);
    });

    const { main, sub } = getPaneStretchFactors(activeSubcharts.length);
    chart.panes().forEach((pane, idx) => {
      pane.setPreserveEmptyPane(idx !== 0);
      pane.setStretchFactor(idx === 0 ? main : sub);
    });

    activeSubcharts.forEach((ind, idx) => {
      const instance = createSubPaneInstance(chart, ind, idx + 1);
      subPanesRef.current.set(ind.key, instance);
    });

    return () => {
      disposeSubPanes(chart);
    };
  }, [activeSubcharts, activeSubchartKeys, createSubPaneInstance, disposeSubPanes]);

  // ─── Update candle + volume data ──────────────────────────

  useEffect(() => {
    if (!candleSeriesRef.current || !mainVolumeSeriesRef.current || klines.length === 0) return;

    const candleData: CandlestickData[] = klines.map(k => ({
      time: k.time as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    const volumeData: HistogramData[] = klines.map(k => ({
      time: k.time as Time,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)',
    }));

    candleSeriesRef.current.setData(candleData);
    mainVolumeSeriesRef.current.setData(volumeData);
  }, [klines]);

  // ─── Render overlay indicators on main chart ──────────────

  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || candles.length === 0) return;

    // Remove old overlay series
    overlaySeriesRef.current.forEach(s => {
      try { chart.removeSeries(s); } catch {}
    });
    overlaySeriesRef.current = [];

    const newSeries: ISeriesApi<'Line'>[] = [];

    for (const ind of activeOverlays) {
      switch (ind.key) {
        case 'MA': {
          const results = calcMA(candles, ind.params as any);
          results.forEach((r, idx) => {
            const s = chart.addSeries(LineSeries, {
              color: MA_COLORS[idx % MA_COLORS.length],
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            s.setData(r.data.map(p => ({ time: p.time as Time, value: p.value })));
            newSeries.push(s);
          });
          break;
        }
        case 'EMA': {
          const results = calcEMA(candles, ind.params as any);
          results.forEach((r, idx) => {
            const s = chart.addSeries(LineSeries, {
              color: EMA_COLORS[idx % EMA_COLORS.length],
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            s.setData(r.data.map(p => ({ time: p.time as Time, value: p.value })));
            newSeries.push(s);
          });
          break;
        }
        case 'BOLL': {
          const { mid, upper, lower } = calcBOLL(candles, ind.params as any);
          const addLine = (data: typeof mid, color: string) => {
            const s = chart.addSeries(LineSeries, {
              color,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
            newSeries.push(s);
          };
          addLine(mid, BOLL_COLORS.mid);
          addLine(upper, BOLL_COLORS.upper);
          addLine(lower, BOLL_COLORS.lower);
          break;
        }
        case 'SAR': {
          const data = calcSAR(candles, ind.params as any);
          const s = chart.addSeries(LineSeries, {
            color: SAR_COLOR,
            lineWidth: 1,
            pointMarkersVisible: true,
            pointMarkersRadius: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(s);
          break;
        }
        case 'AVL': {
          const data = calcAVL(candles, ind.params as any);
          const s = chart.addSeries(LineSeries, {
            color: AVL_COLOR,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(s);
          break;
        }
        case 'SUPER': {
          const data = calcSUPER(candles, ind.params as any);
          const s = chart.addSeries(LineSeries, {
            color: '#26a69a',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value, color: p.direction === 'up' ? '#26a69a' : '#ef5350' })));
          newSeries.push(s);
          break;
        }
      }
    }

    overlaySeriesRef.current = newSeries;
  }, [activeOverlays, candles]);

  // ─── Render sub-chart indicator data ──────────────────────

  useEffect(() => {
    if (candles.length === 0) return;

    for (const ind of activeSubcharts) {
      const instance = subPanesRef.current.get(ind.key);
      if (!instance) continue;
      updateSubPaneData(instance, ind);
    }
  }, [activeSubcharts, candles, updateSubPaneData]);

  // ─── Price lines for position (entry, TP, SL) ────────────

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;
    const existingLines = series.priceLines();
    existingLines.forEach((line: any) => series.removePriceLine(line));

    if (!position) return;

    series.createPriceLine({
      price: position.entryPrice, color: '#D1D4DC', lineWidth: 1, lineStyle: 2,
      axisLabelVisible: true,
      title: `Entry ${position.direction === 'long' ? '▲' : '▼'} ${position.entryPrice.toFixed(2)}`,
      axisLabelColor: '#D1D4DC', axisLabelTextColor: '#0B0E11',
    });

    if (position.takeProfit) {
      series.createPriceLine({
        price: position.takeProfit, color: '#0ECB81', lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: `TP ${position.takeProfit.toFixed(2)}`,
        axisLabelColor: '#0ECB81', axisLabelTextColor: '#0B0E11',
      });
    }

    if (position.stopLoss) {
      series.createPriceLine({
        price: position.stopLoss, color: '#F6465D', lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: `SL ${position.stopLoss.toFixed(2)}`,
        axisLabelColor: '#F6465D', axisLabelTextColor: '#0B0E11',
      });
    }
  }, [position?.entryPrice, position?.takeProfit, position?.stopLoss, position?.direction]);

  // ─── TP/SL interaction ────────────────────────────────────

  const computePnl = useCallback((exitPrice: number) => {
    if (!position) return { pnl: 0, pnlPct: 0 };
    const direction = position.direction === 'long' ? 1 : -1;
    const pnlPct = direction * (exitPrice - position.entryPrice) / position.entryPrice * 100;
    const pnl = position.size * pnlPct / 100;
    return { pnl, pnlPct };
  }, [position]);

  const detectTpOrSl = useCallback((price: number): 'tp' | 'sl' | null => {
    if (!position) return null;
    return position.direction === 'long'
      ? (price > position.entryPrice ? 'tp' : 'sl')
      : (price < position.entryPrice ? 'tp' : 'sl');
  }, [position]);

  const handleChartDblClick = useCallback((price: number, clientX: number, clientY: number) => {
    if (!position || !onSetTpSl) return;
    const type = detectTpOrSl(price);
    if (!type) return;
    const { pnl, pnlPct } = computePnl(price);
    setTpSlPopover({ type, price, x: clientX, y: clientY, estimatedPnl: pnl, estimatedPnlPct: pnlPct });
  }, [position, onSetTpSl, detectTpOrSl, computePnl]);

  useEffect(() => {
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series || !position || !onSetTpSl) return;

    const handler = (param: any) => {
      if (param.paneIndex !== 0 || !param.point) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price === null || price === undefined || price <= 0) return;
      const rect = mainContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      handleChartDblClick(price as number, rect.left + param.point.x, rect.top + param.point.y);
    };

    chart.subscribeDblClick(handler);
    return () => { chart.unsubscribeDblClick(handler); };
  }, [position, onSetTpSl, handleChartDblClick]);

  // Long-press for mobile
  useEffect(() => {
    const container = mainContainerRef.current;
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current;
    if (!container || !chart || !series || !position || !onSetTpSl) return;

    let startY = 0, startX = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      longPressTimerRef.current = setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const chartY = startY - rect.top;
        const mainPaneHeight = chart.panes()[0]?.getHeight() ?? container.clientHeight;
        if (chartY < 0 || chartY > mainPaneHeight) return;
        const price = series.coordinateToPrice(chartY);
        if (price === null || price === undefined || (price as number) <= 0) return;
        handleChartDblClick(price as number, startX, startY);
      }, 600);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!longPressTimerRef.current) return;
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 10 || dy > 10) { clearTimeout(longPressTimerRef.current!); longPressTimerRef.current = null; }
    };
    const onTouchEnd = () => {
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [position, onSetTpSl, handleChartDblClick]);

  const confirmTpSl = useCallback(() => {
    if (!tpSlPopover || !onSetTpSl) return;
    if (tpSlPopover.type === 'tp') onSetTpSl(tpSlPopover.price, undefined);
    else onSetTpSl(undefined, tpSlPopover.price);
    setTpSlPopover(null);
  }, [tpSlPopover, onSetTpSl]);

  // ─── Active indicator labels for header ───────────────────

  const overlayLabels = useMemo(() => {
    const labels: string[] = [];
    for (const ind of activeOverlays) {
      switch (ind.key) {
        case 'MA': {
          const p = ind.params as { periods: number[] };
          labels.push(`MA(${p.periods.join(',')})`);
          break;
        }
        case 'EMA': {
          const p = ind.params as { periods: number[] };
          labels.push(`EMA(${p.periods.join(',')})`);
          break;
        }
        case 'BOLL': {
          const p = ind.params as { period: number; multiplier: number };
          labels.push(`BOLL(${p.period},${p.multiplier})`);
          break;
        }
        case 'SAR': labels.push('SAR'); break;
        case 'AVL': labels.push('AVL'); break;
        case 'SUPER': labels.push('SUPER'); break;
      }
    }
    return labels;
  }, [activeOverlays]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Timeframe selector + indicator button */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[rgba(255,255,255,0.06)]">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.key}
            onClick={() => onTimeframeChange(tf.key)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              timeframe === tf.key
                ? 'bg-[#F0B90B]/15 text-[#F0B90B]'
                : 'text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/5'
            }`}
          >
            {tf.label}
          </button>
        ))}

        {/* Indicator settings button */}
        <button
          onClick={() => setShowSettings(true)}
          className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/5 text-[#848E9C] hover:text-[#D1D4DC]"
        >
          <Settings2 size={13} />
          <span className="font-mono">
            {lang === 'zh' ? '指标' : 'Ind'}
          </span>
          {activeCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0 rounded-full text-[9px] font-mono bg-[#F0B90B]/20 text-[#F0B90B]">
              {activeCount}
            </span>
          )}
        </button>

        <div className="ml-auto text-[10px] text-[#848E9C] font-mono truncate max-w-[200px]">
          {overlayLabels.length > 0 ? overlayLabels.join(' · ') : `${tradingPair.symbol} Perpetual`}
        </div>
        {position && onSetTpSl && (
          <div className="text-[9px] text-[#F0B90B]/60 ml-2 flex-shrink-0">
            {lang === 'zh' ? '双击设置TP/SL' : 'Dbl-click TP/SL'}
          </div>
        )}
      </div>

      <div ref={mainContainerRef} className="relative flex-1 min-h-0">
          {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E11]/80 z-10">
            <div className="text-[#848E9C] text-sm">Loading chart data...</div>
          </div>
        )}

          {/* Position overlay */}
          {position && (
          <div className="absolute top-2 left-3 z-10 flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono ${
              position.direction === 'long'
                ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/20'
                : 'bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/20'
            }`}>
              <span>{position.direction === 'long' ? '▲ LONG' : '▼ SHORT'}</span>
              <span className="text-[#848E9C]">|</span>
              <span>{position.size.toFixed(0)}U</span>
              <span className="text-[#848E9C]">@</span>
              <span>{position.entryPrice.toFixed(2)}</span>
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
              position.unrealizedPnl >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F6465D]/10 text-[#F6465D]'
            }`}>
              {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}U
              ({position.unrealizedPnlPct >= 0 ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%)
            </div>
            {position.takeProfit && (
              <div className="px-1.5 py-1 rounded text-[9px] font-mono bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/15">
                TP {position.takeProfit.toFixed(2)}
              </div>
            )}
            {position.stopLoss && (
              <div className="px-1.5 py-1 rounded text-[9px] font-mono bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/15">
                SL {position.stopLoss.toFixed(2)}
              </div>
            )}
          </div>
        )}

          {/* TP/SL Popover */}
          {tpSlPopover && (
          <>
            <div className="absolute inset-0 z-20" onClick={() => setTpSlPopover(null)} />
            <div
              className="absolute z-30 bg-[#1C2030] border border-[rgba(255,255,255,0.15)] rounded-lg shadow-2xl p-3 min-w-[200px]"
              style={{
                left: Math.min(tpSlPopover.x - (mainContainerRef.current?.getBoundingClientRect().left ?? 0), (mainContainerRef.current?.clientWidth ?? 300) - 220),
                top: Math.min(tpSlPopover.y - (mainContainerRef.current?.getBoundingClientRect().top ?? 0) - 80, (mainContainerRef.current?.clientHeight ?? 300) - 120),
              }}
            >
              <div className="text-xs font-medium mb-2">
                <span className={tpSlPopover.type === 'tp' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                  Set {tpSlPopover.type === 'tp' ? 'Take Profit' : 'Stop Loss'}
                </span>
              </div>
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#848E9C]">Price</span>
                  <span className="font-mono text-[#D1D4DC]">{formatPrice(tpSlPopover.price)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#848E9C]">Est. PnL</span>
                  <span className={`font-mono font-bold ${tpSlPopover.estimatedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {tpSlPopover.estimatedPnl >= 0 ? '+' : ''}{tpSlPopover.estimatedPnl.toFixed(2)} U
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#848E9C]">Est. ROI</span>
                  <span className={`font-mono font-bold ${tpSlPopover.estimatedPnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {tpSlPopover.estimatedPnlPct >= 0 ? '+' : ''}{tpSlPopover.estimatedPnlPct.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={confirmTpSl} className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                  tpSlPopover.type === 'tp' ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black' : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white'
                }`}>Confirm</button>
                <button onClick={() => setTpSlPopover(null)} className="flex-1 py-1.5 rounded text-xs font-medium bg-white/5 text-[#D1D4DC] hover:bg-white/10 transition-colors">Cancel</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Indicator Settings Panel */}
      {showSettings && (
        <IndicatorSettings
          activeIndicators={indicators}
          onToggle={handleToggle}
          onParamsChange={handleParamsChange}
          onReset={handleReset}
          onClose={() => setShowSettings(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
