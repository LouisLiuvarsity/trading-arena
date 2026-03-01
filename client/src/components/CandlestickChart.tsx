// ============================================================
// Candlestick Chart — lightweight-charts v5 integration
// Design: Dark background, Binance green/red candles, volume bars
// No technical indicators — intentionally bare (per blueprint)
// Supports TP/SL/Entry price lines when position is open
// ============================================================

import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, Time } from 'lightweight-charts';
import type { KlineData, TimeframeKey, Position } from '@/lib/types';

interface Props {
  klines: KlineData[];
  loading: boolean;
  timeframe: TimeframeKey;
  onTimeframeChange: (tf: TimeframeKey) => void;
  position?: Position | null;
}

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: '1m', label: '1m' },
  { key: '5m', label: '5m' },
  { key: '15m', label: '15m' },
  { key: '1h', label: '1H' },
  { key: '4h', label: '4H' },
];

export default function CandlestickChart({ klines, loading, timeframe, onTimeframeChange, position }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
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
        scaleMargins: { top: 0.05, bottom: 0.25 },
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

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    handleResize();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || klines.length === 0) return;

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
      color: k.close >= k.open ? 'rgba(14,203,129,0.3)' : 'rgba(246,70,93,0.3)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
  }, [klines]);

  // Update price lines for position (entry, TP, SL)
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    // Remove all existing price lines first
    const existingLines = series.priceLines();
    existingLines.forEach((line: any) => {
      series.removePriceLine(line);
    });

    if (!position) return;

    // Entry price line — white dashed
    series.createPriceLine({
      price: position.entryPrice,
      color: '#D1D4DC',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Entry ${position.direction === 'long' ? '▲' : '▼'} ${position.entryPrice.toFixed(2)}`,
      axisLabelColor: '#D1D4DC',
      axisLabelTextColor: '#0B0E11',
    });

    // Take Profit line — green dashed
    if (position.takeProfit) {
      series.createPriceLine({
        price: position.takeProfit,
        color: '#0ECB81',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP ${position.takeProfit.toFixed(2)}`,
        axisLabelColor: '#0ECB81',
        axisLabelTextColor: '#0B0E11',
      });
    }

    // Stop Loss line — red dashed
    if (position.stopLoss) {
      series.createPriceLine({
        price: position.stopLoss,
        color: '#F6465D',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `SL ${position.stopLoss.toFixed(2)}`,
        axisLabelColor: '#F6465D',
        axisLabelTextColor: '#0B0E11',
      });
    }
  }, [position?.entryPrice, position?.takeProfit, position?.stopLoss, position?.direction]);

  return (
    <div className="flex flex-col h-full">
      {/* Timeframe selector */}
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
        <div className="ml-auto text-[10px] text-[#848E9C] font-mono">
          BTCUSDT Perpetual
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E11]/80 z-10">
            <div className="text-[#848E9C] text-sm">Loading chart data...</div>
          </div>
        )}

        {/* Position indicator overlay */}
        {position && (
          <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
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
              position.unrealizedPnl >= 0
                ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
                : 'bg-[#F6465D]/10 text-[#F6465D]'
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
      </div>
    </div>
  );
}
