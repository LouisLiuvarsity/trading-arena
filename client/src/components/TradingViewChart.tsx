// ============================================================
// TradingView Advanced Chart Widget — free embedded chart
// Provides built-in indicators, drawing tools, and Binance data
// ============================================================

import { useEffect, useRef, memo } from 'react';
import { useTradingPair } from '@/contexts/TradingPairContext';
import { useT } from '@/lib/i18n';

interface Props {
  /** Controls the initial interval shown on the widget */
  interval?: string;
}

/**
 * Map our TimeframeKey to TradingView widget interval values.
 * TradingView uses: 1, 5, 15, 60, 240, D, W, M
 */
const TV_INTERVAL_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

function TradingViewChart({ interval = '5' }: Props) {
  const tradingPair = useTradingPair();
  const { lang } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Convert symbol to TradingView format: BINANCE:BTCUSDT.P
  const tvSymbol = `BINANCE:${tradingPair.symbol}.P`;
  const tvInterval = TV_INTERVAL_MAP[interval] || interval;
  const tvLocale = lang === 'zh' ? 'zh_CN' : 'en';

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    const container = containerRef.current;
    container.innerHTML = '';

    // Create widget container
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    // Create and configure script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1', // Candlestick
      locale: tvLocale,
      allow_symbol_change: false,
      calendar: false,
      details: false,
      hotlist: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      save_image: false,
      withdateranges: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#0B0E11',
      gridColor: 'rgba(255, 255, 255, 0.04)',
      studies: [],
      autosize: true,
    });

    container.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Cleanup on unmount or re-render
      container.innerHTML = '';
      scriptRef.current = null;
    };
  }, [tvSymbol, tvInterval, tvLocale]);

  return (
    <div className="flex flex-col h-full w-full">
      <div
        ref={containerRef}
        className="tradingview-widget-container flex-1"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

export default memo(TradingViewChart);
