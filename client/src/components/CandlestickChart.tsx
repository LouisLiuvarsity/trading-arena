// ============================================================
// Candlestick Chart — lightweight-charts v5 integration
// Supports: TP/SL/Entry price lines, 6 overlay indicators,
// Multiple simultaneous sub-chart indicators with crosshair sync
// ============================================================

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData, Time } from 'lightweight-charts';
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

// ─── Sub-chart instance type ───────────────────────────────
interface SubChartInstance {
  chart: IChartApi;
  container: HTMLDivElement;
  series: (ISeriesApi<'Line'> | ISeriesApi<'Histogram'>)[];
  primarySeries: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> | null;
  resizeObserver: ResizeObserver;
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

export default function CandlestickChart({ klines, loading, timeframe, onTimeframeChange, position, onSetTpSl, lang = 'en' }: Props) {
  const tradingPair = useTradingPair();

  // Main chart refs
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const mainVolumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<'Line'>[]>([]);

  // Multi sub-chart refs: keyed by indicator key
  const subChartsRef = useRef<Map<IndicatorKey, SubChartInstance>>(new Map());
  const subContainersWrapperRef = useRef<HTMLDivElement>(null);

  // State
  const [tpSlPopover, setTpSlPopover] = useState<TpSlPopover | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [indicators, setIndicators] = useState<ActiveIndicator[]>(loadIndicatorState);

  // Crosshair overlay: custom vertical line that spans all charts
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const crosshairLineRef = useRef<HTMLDivElement>(null);
  const setOverlayCrosshairX = useCallback((x: number | null) => {
    const line = crosshairLineRef.current;
    const area = chartAreaRef.current;
    if (!line) return;
    if (x === null || !Number.isFinite(x) || !area) {
      line.style.opacity = '0';
      return;
    }

    const clampedX = Math.max(0, Math.min(x, area.clientWidth));
    line.style.transform = `translateX(${clampedX}px)`;
    line.style.opacity = '1';
  }, []);

  const syncOverlayCrosshair = useCallback((chart: IChartApi, time?: Time) => {
    if (time === undefined) {
      setOverlayCrosshairX(null);
      return;
    }

    const x = chart.timeScale().timeToCoordinate(time);
    setOverlayCrosshairX(x ?? null);
  }, [setOverlayCrosshairX]);

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
  const hasSubchart = activeSubcharts.length > 0;

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

  // ─── Initialize main chart ────────────────────────────────

  useEffect(() => {
    if (!mainContainerRef.current) return;

    const chart = createChart(mainContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: '#848E9C',
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
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
    });

    // Volume as background on main chart
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
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
      resizeObserver.disconnect();
      chart.remove();
      mainChartRef.current = null;
      candleSeriesRef.current = null;
      mainVolumeSeriesRef.current = null;
      overlaySeriesRef.current = [];
    };
  }, []);

  // ─── Manage sub-charts lifecycle ──────────────────────────

  useEffect(() => {
    const wrapper = subContainersWrapperRef.current;
    if (!wrapper) return;

    const currentKeys = new Set(activeSubcharts.map(s => s.key));
    const existingMap = subChartsRef.current;

    // Remove subcharts that are no longer active
    Array.from(existingMap.entries()).forEach(([key, instance]) => {
      if (!currentKeys.has(key)) {
        instance.resizeObserver.disconnect();
        instance.chart.remove();
        // Remove the label div too
        const labelEl = wrapper.querySelector(`[data-subchart-label="${key}"]`);
        if (labelEl && labelEl.parentNode) labelEl.parentNode.removeChild(labelEl);
        if (instance.container.parentNode) {
          instance.container.parentNode.removeChild(instance.container);
        }
        existingMap.delete(key);
      }
    });

    if (activeSubcharts.length === 0) return;

    const heightPct = getSubchartHeight(activeSubcharts.length);

    // Create or update each subchart
    activeSubcharts.forEach((ind, idx) => {
      const isLast = idx === activeSubcharts.length - 1;

      if (existingMap.has(ind.key)) {
        // Update existing: resize height and time axis visibility
        const instance = existingMap.get(ind.key)!;
        instance.container.style.height = `${heightPct}%`;
        instance.chart.timeScale().applyOptions({ visible: isLast });
        // Trigger resize
        instance.chart.applyOptions({
          width: instance.container.clientWidth,
          height: instance.container.clientHeight,
        });
        return;
      }

      // Find or create the label+container pair in the wrapper
      // We need a label div + chart container div for each subchart
      const labelDiv = document.createElement('div');
      labelDiv.className = 'flex items-center px-3 py-0.5 border-t border-[rgba(255,255,255,0.06)] bg-[#0B0E11] shrink-0';
      labelDiv.setAttribute('data-subchart-label', ind.key);
      const labelSpan = document.createElement('span');
      labelSpan.className = 'text-[10px] font-mono text-[#848E9C]';
      labelSpan.textContent = getSubchartLabel(ind);
      labelDiv.appendChild(labelSpan);

      const containerDiv = document.createElement('div');
      containerDiv.className = 'shrink-0';
      containerDiv.style.height = `${heightPct}%`;
      containerDiv.style.minHeight = '80px';
      containerDiv.setAttribute('data-subchart', ind.key);

      wrapper.appendChild(labelDiv);
      wrapper.appendChild(containerDiv);

      const chart = createChart(containerDiv, {
        layout: {
          background: { type: ColorType.Solid, color: CHART_BG },
          textColor: '#848E9C',
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
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
        minimumWidth: PRICE_SCALE_MIN_WIDTH,
      },
      overlayPriceScales: {
        minimumWidth: PRICE_SCALE_MIN_WIDTH,
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        visible: !hasSubchart,
      },
        handleScroll: true,
        handleScale: true,
      });

      const handleResize = () => {
        chart.applyOptions({
          width: containerDiv.clientWidth,
          height: containerDiv.clientHeight,
        });
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerDiv);
      requestAnimationFrame(handleResize);

      existingMap.set(ind.key, {
        chart,
        container: containerDiv,
        series: [],
        primarySeries: null,
        resizeObserver,
      });
    });

    // Reorder DOM children to match activeSubcharts order
    const orderedKeys = activeSubcharts.map(s => s.key);
    for (const key of orderedKeys) {
      const labelEl = wrapper.querySelector(`[data-subchart-label="${key}"]`);
      const chartEl = wrapper.querySelector(`[data-subchart="${key}"]`);
      if (labelEl) wrapper.appendChild(labelEl);
      if (chartEl) wrapper.appendChild(chartEl);
    }

    // Hide main chart time axis when subcharts are active
    const mainChart = mainChartRef.current;
    if (mainChart) {
      mainChart.timeScale().applyOptions({ visible: activeSubcharts.length === 0 });
    }

    // Cleanup on unmount
    return () => {
      // Don't cleanup here — we handle it in the removal logic above
      // Only cleanup everything on full unmount
    };
  }, [activeSubchartKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show main chart time axis when no subcharts
  useEffect(() => {
    const mainChart = mainChartRef.current;
    if (!mainChart) return;
    mainChart.timeScale().applyOptions({ visible: !hasSubchart });
  }, [hasSubchart]);

  // Cleanup all subcharts on component unmount
  useEffect(() => {
    return () => {
      Array.from(subChartsRef.current.values()).forEach(instance => {
        instance.resizeObserver.disconnect();
        try { instance.chart.remove(); } catch {}
      });
      subChartsRef.current.clear();
    };
  }, []);

  // ─── Sync time scales across all charts ───────────────────

  useEffect(() => {
    const mainChart = mainChartRef.current;
    if (!mainChart) return;

    const allCharts: IChartApi[] = [mainChart];
    Array.from(subChartsRef.current.values()).forEach(instance => {
      allCharts.push(instance.chart);
    });

    if (allCharts.length <= 1) return;

    let isSyncingRange = false;

    const unsubscribers: (() => void)[] = [];

    // Sync visible logical range (scroll/zoom)
    allCharts.forEach((sourceChart, sourceIdx) => {
      const handler = () => {
        if (isSyncingRange) return;
        isSyncingRange = true;
        const range = sourceChart.timeScale().getVisibleLogicalRange();
        if (range) {
          allCharts.forEach((targetChart, targetIdx) => {
            if (targetIdx !== sourceIdx) {
              targetChart.timeScale().setVisibleLogicalRange(range);
            }
          });
        }
        isSyncingRange = false;
      };
      sourceChart.timeScale().subscribeVisibleLogicalRangeChange(handler);
      unsubscribers.push(() => {
        try { sourceChart.timeScale().unsubscribeVisibleLogicalRangeChange(handler); } catch {}
      });
    });

    return () => {
      unsubscribers.forEach(fn => fn());
    };
  }, [activeSubchartKeys]);

  // ─── Crosshair overlay: hide when leaving the full chart area ─────
  useEffect(() => {
    const area = chartAreaRef.current;
    if (!area) return;

    const onMouseLeave = () => {
      setOverlayCrosshairX(null);
    };

    area.addEventListener('mouseleave', onMouseLeave);

    return () => {
      area.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [setOverlayCrosshairX]);

  // ─── Crosshair sync: propagate crosshair time between main chart and subcharts ───
  // We cache each subchart's first series data keyed by time for O(1) lookup
  const subSeriesDataRef = useRef<Map<IndicatorKey, Map<number, number>>>(new Map());

  // Build the data cache whenever subchart data changes
  useEffect(() => {
    const cache = new Map<IndicatorKey, Map<number, number>>();
    for (const [key, instance] of Array.from(subChartsRef.current.entries())) {
      if (instance.primarySeries) {
        const dataMap = new Map<number, number>();
        try {
          // Get all data points from the primary series
          const data = (instance.primarySeries as any).data?.() ?? [];
          for (const point of data) {
            const t = typeof point.time === 'number' ? point.time : 0;
            const v = point.value ?? point.close ?? 0;
            if (t > 0) dataMap.set(t, v);
          }
        } catch {}
        cache.set(key, dataMap);
      }
    }
    subSeriesDataRef.current = cache;
  }, [activeSubcharts, candles, activeSubchartKeys]);

  // Subscribe to crosshair moves and sync across charts
  const isSyncingRef = useRef(false);
  useEffect(() => {
    const mainChart = mainChartRef.current;
    const mainSeries = candleSeriesRef.current;
    if (!mainChart || !mainSeries) return;

    const unsubs: (() => void)[] = [];

    // Main chart -> subcharts
    const mainHandler = (param: any) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const time = param.time as Time | undefined;
        syncOverlayCrosshair(mainChart, time);
        if (time === undefined) {
          for (const instance of Array.from(subChartsRef.current.values())) {
            try { instance.chart.clearCrosshairPosition(); } catch {}
          }
          return;
        }
        for (const [key, instance] of Array.from(subChartsRef.current.entries())) {
          if (!instance.primarySeries) continue;
          try {
            // Look up cached data for this time
            const dataMap = subSeriesDataRef.current.get(key);
            const value = dataMap?.get(time as number);
            if (value !== undefined) {
              instance.chart.setCrosshairPosition(value, time, instance.primarySeries);
            }
          } catch {}
        }
      } finally {
        isSyncingRef.current = false;
      }
    };
    mainChart.subscribeCrosshairMove(mainHandler);
    unsubs.push(() => { try { mainChart.unsubscribeCrosshairMove(mainHandler); } catch {} });

    if (subChartsRef.current.size === 0) {
      return () => unsubs.forEach(fn => fn());
    }

    // Subcharts -> main chart (and other subcharts)
    for (const [srcKey, srcInstance] of Array.from(subChartsRef.current.entries())) {
      const handler = (param: any) => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        try {
          const time = param.time as Time | undefined;
          syncOverlayCrosshair(srcInstance.chart, time);
          if (time === undefined) {
            try { mainChart.clearCrosshairPosition(); } catch {}
            for (const [k, inst] of Array.from(subChartsRef.current.entries())) {
              if (k !== srcKey) try { inst.chart.clearCrosshairPosition(); } catch {}
            }
            return;
          }
          // Sync to main chart
          try {
            const mainData = param.seriesData?.get(mainSeries);
            if (!mainData) {
              // Get candle data at this time from klines
              const kline = klines.find(k => k.time === time);
              if (kline) {
                mainChart.setCrosshairPosition(kline.close, time, mainSeries);
              }
            }
          } catch {}
          // Sync to other subcharts
          for (const [k, inst] of Array.from(subChartsRef.current.entries())) {
            if (k === srcKey || !inst.primarySeries) continue;
            try {
              const dataMap = subSeriesDataRef.current.get(k);
              const value = dataMap?.get(time as number);
              if (value !== undefined) {
                inst.chart.setCrosshairPosition(value, time, inst.primarySeries);
              }
            } catch {}
          }
        } finally {
          isSyncingRef.current = false;
        }
      };
      srcInstance.chart.subscribeCrosshairMove(handler);
      unsubs.push(() => { try { srcInstance.chart.unsubscribeCrosshairMove(handler); } catch {} });
    }

    return () => unsubs.forEach(fn => fn());
  }, [activeSubchartKeys, candles, klines, syncOverlayCrosshair]);

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
    if (candles.length === 0 || activeSubcharts.length === 0) return;

    for (const ind of activeSubcharts) {
      const instance = subChartsRef.current.get(ind.key);
      if (!instance) continue;

      const chart = instance.chart;

      // Remove old series
      instance.series.forEach(s => {
        try { chart.removeSeries(s); } catch {}
      });
      instance.series = [];

      const newSeries: (ISeriesApi<'Line'> | ISeriesApi<'Histogram'>)[] = [];

      switch (ind.key) {
        case 'VOL': {
          const { bars, ma } = calcVOL(candles, ind.params as any);
          const histS = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'vol',
          });
          histS.setData(bars.map(b => ({ time: b.time as Time, value: b.value, color: b.color })));
          newSeries.push(histS);
          const maS = chart.addSeries(LineSeries, {
            color: '#E6A817',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: 'vol',
          });
          maS.setData(ma.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(maS);
          break;
        }
        case 'MACD': {
          const { macd, signal, histogram } = calcMACD(candles, ind.params as any);
          const histS = chart.addSeries(HistogramSeries, {
            priceScaleId: 'macd',
            priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
          });
          histS.setData(histogram.map(h => ({ time: h.time as Time, value: h.value, color: h.color })));
          newSeries.push(histS);
          const macdS = chart.addSeries(LineSeries, {
            color: '#2196F3',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: 'macd',
          });
          macdS.setData(macd.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(macdS);
          const sigS = chart.addSeries(LineSeries, {
            color: '#FF9800',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: 'macd',
          });
          sigS.setData(signal.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(sigS);
          break;
        }
        case 'RSI': {
          const data = calcRSI(candles, ind.params as any);
          const s = chart.addSeries(LineSeries, {
            color: '#E040FB',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(s);
          s.createPriceLine({ price: 70, color: 'rgba(239,83,80,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
          s.createPriceLine({ price: 30, color: 'rgba(38,166,154,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
          break;
        }
        case 'KDJ': {
          const { k, d, j } = calcKDJ(candles, ind.params as any);
          const kS = chart.addSeries(LineSeries, { color: '#2196F3', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          kS.setData(k.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(kS);
          const dS = chart.addSeries(LineSeries, { color: '#FF9800', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          dS.setData(d.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(dS);
          const jS = chart.addSeries(LineSeries, { color: '#E040FB', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          jS.setData(j.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(jS);
          break;
        }
        case 'OBV': {
          const { obv, ma } = calcOBV(candles, ind.params as any);
          const obvS = chart.addSeries(LineSeries, {
            color: '#26a69a',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: 'obv',
          });
          obvS.setData(obv.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(obvS);
          const maS = chart.addSeries(LineSeries, {
            color: '#FF9800',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: 'obv',
          });
          maS.setData(ma.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(maS);
          break;
        }
        case 'WR': {
          const data = calcWR(candles, ind.params as any);
          const s = chart.addSeries(LineSeries, {
            color: '#00BCD4',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          newSeries.push(s);
          s.createPriceLine({ price: -20, color: 'rgba(239,83,80,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
          s.createPriceLine({ price: -80, color: 'rgba(38,166,154,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
          break;
        }
      }

      instance.series = newSeries;
      // Set the first series as primary for crosshair sync
      instance.primarySeries = newSeries.length > 0 ? newSeries[0] : null;
    }
  }, [activeSubcharts, candles, activeSubchartKeys]);

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
      if (!param.point) return;
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

      {/* Chart area wrapper for crosshair overlay */}
      <div ref={chartAreaRef} className="relative flex-1 min-h-0 flex flex-col">
        {/* Crosshair overlay line */}
        <div
          ref={crosshairLineRef}
          className="absolute top-0 bottom-0 pointer-events-none z-[50]"
          style={{
            width: '1px',
            backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 4px, transparent 4px, transparent 8px)',
            opacity: 0,
            willChange: 'transform',
          }}
        />

        {/* Main chart */}
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
        </div> {/* end mainContainerRef */}

        {/* Sub-charts wrapper — dynamically managed by useEffect */}
        <div ref={subContainersWrapperRef} className="flex flex-col shrink-0" />
      </div> {/* end chartAreaRef wrapper */}

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
