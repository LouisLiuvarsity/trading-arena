// ============================================================
// Binance Market Data Hook
// Uses data-api.binance.vision (REST) as primary source since
// fapi.binance.com is geo-restricted. WebSocket streams from
// stream.binance.com:9443 or data-stream.binance.vision as
// fallback with REST polling.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import type { KlineData, TickerData, OrderBook, TimeframeKey } from '@/lib/types';

const REST_BASE = 'https://data-api.binance.vision/api/v3';
const WS_ENDPOINTS = [
  'wss://data-stream.binance.vision/stream?streams=',
  'wss://stream.binance.com:9443/stream?streams=',
];
const SYMBOL = 'HYPERUSDT';
const SYMBOL_LC = 'hyperusdt';

// Helper: try WebSocket with fallback endpoints
function createWS(streams: string, onMessage: (data: any) => void, onError?: () => void): WebSocket | null {
  let wsIndex = 0;

  function tryConnect(): WebSocket {
    const url = WS_ENDPOINTS[wsIndex] + streams;
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage(msg.data || msg);
      } catch {}
    };

    ws.onerror = () => {
      wsIndex++;
      if (wsIndex < WS_ENDPOINTS.length) {
        ws.close();
        tryConnect();
      } else {
        onError?.();
      }
    };

    return ws;
  }

  return tryConnect();
}

export function useBinanceKline(timeframe: TimeframeKey = '1m') {
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch historical klines via REST
  const fetchKlines = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE}/klines?symbol=${SYMBOL}&interval=${timeframe}&limit=300`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const parsed: KlineData[] = data.map((d: any) => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));
        setKlines(parsed);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchKlines();
  }, [fetchKlines]);

  // Try WebSocket for real-time updates
  useEffect(() => {
    const stream = `${SYMBOL_LC}@kline_${timeframe}`;
    const ws = createWS(
      stream,
      (d) => {
        if (d?.k) {
          setWsConnected(true);
          const k = d.k;
          const newCandle: KlineData = {
            time: k.t / 1000,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          };
          setKlines(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].time === newCandle.time) {
              updated[lastIdx] = newCandle;
            } else {
              updated.push(newCandle);
              if (updated.length > 500) updated.shift();
            }
            return updated;
          });
        }
      },
      () => {
        // WebSocket failed, use polling
        setWsConnected(false);
      }
    );
    wsRef.current = ws;

    return () => {
      ws?.close();
    };
  }, [timeframe]);

  // Polling fallback if WS fails
  useEffect(() => {
    if (wsConnected) return;
    const interval = window.setInterval(fetchKlines, 3000);
    pollingRef.current = interval;
    return () => window.clearInterval(interval);
  }, [wsConnected, fetchKlines]);

  return { klines, loading };
}

export function useBinanceTicker() {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const prevPriceRef = useRef<number>(0);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [wsConnected, setWsConnected] = useState(false);

  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE}/ticker/24hr?symbol=${SYMBOL}`);
      const d = await res.json();
      if (d.lastPrice) {
        const lastPrice = parseFloat(d.lastPrice);
        if (prevPriceRef.current > 0) {
          setPriceDirection(lastPrice > prevPriceRef.current ? 'up' : lastPrice < prevPriceRef.current ? 'down' : 'neutral');
        }
        prevPriceRef.current = lastPrice;

        setTicker({
          symbol: SYMBOL,
          lastPrice,
          priceChange: parseFloat(d.priceChange),
          priceChangePct: parseFloat(d.priceChangePercent),
          high24h: parseFloat(d.highPrice),
          low24h: parseFloat(d.lowPrice),
          volume24h: parseFloat(d.quoteVolume),
          markPrice: lastPrice,
          indexPrice: lastPrice,
          fundingRate: 0.0001, // Mock funding rate for spot
          nextFundingTime: Date.now() + 3600000,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchTicker();
  }, [fetchTicker]);

  // Try WebSocket
  useEffect(() => {
    const streams = `${SYMBOL_LC}@ticker`;
    const ws = createWS(
      streams,
      (d) => {
        if (d?.e === '24hrTicker' || d?.c) {
          setWsConnected(true);
          const lastPrice = parseFloat(d.c);
          if (prevPriceRef.current > 0) {
            setPriceDirection(lastPrice > prevPriceRef.current ? 'up' : lastPrice < prevPriceRef.current ? 'down' : 'neutral');
          }
          prevPriceRef.current = lastPrice;

          setTicker(prev => ({
            symbol: SYMBOL,
            lastPrice,
            priceChange: parseFloat(d.p),
            priceChangePct: parseFloat(d.P),
            high24h: parseFloat(d.h),
            low24h: parseFloat(d.l),
            volume24h: parseFloat(d.q),
            markPrice: prev?.markPrice || lastPrice,
            indexPrice: prev?.indexPrice || lastPrice,
            fundingRate: prev?.fundingRate || 0.0001,
            nextFundingTime: prev?.nextFundingTime || Date.now() + 3600000,
          }));
        }
      },
      () => setWsConnected(false)
    );

    return () => ws?.close();
  }, []);

  // Polling fallback
  useEffect(() => {
    if (wsConnected) return;
    const interval = window.setInterval(fetchTicker, 2000);
    return () => window.clearInterval(interval);
  }, [wsConnected, fetchTicker]);

  return { ticker, priceDirection };
}

export function useBinanceDepth() {
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [wsConnected, setWsConnected] = useState(false);

  const fetchDepth = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE}/depth?symbol=${SYMBOL}&limit=20`);
      const d = await res.json();
      if (d.bids && d.asks) {
        let bidTotal = 0;
        let askTotal = 0;
        setOrderBook({
          bids: d.bids.slice(0, 15).map((b: string[]) => {
            const qty = parseFloat(b[1]);
            bidTotal += qty;
            return { price: parseFloat(b[0]), quantity: qty, total: bidTotal };
          }),
          asks: d.asks.slice(0, 15).map((a: string[]) => {
            const qty = parseFloat(a[1]);
            askTotal += qty;
            return { price: parseFloat(a[0]), quantity: qty, total: askTotal };
          }),
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchDepth();
  }, [fetchDepth]);

  // Try WebSocket
  useEffect(() => {
    const ws = createWS(
      `${SYMBOL_LC}@depth20@1000ms`,
      (d) => {
        if (d?.b && d?.a) {
          setWsConnected(true);
          let bidTotal = 0;
          let askTotal = 0;
          setOrderBook({
            bids: d.b.slice(0, 15).map((b: string[]) => {
              const qty = parseFloat(b[1]);
              bidTotal += qty;
              return { price: parseFloat(b[0]), quantity: qty, total: bidTotal };
            }),
            asks: d.a.slice(0, 15).map((a: string[]) => {
              const qty = parseFloat(a[1]);
              askTotal += qty;
              return { price: parseFloat(a[0]), quantity: qty, total: askTotal };
            }),
          });
        }
      },
      () => setWsConnected(false)
    );

    return () => ws?.close();
  }, []);

  // Polling fallback
  useEffect(() => {
    if (wsConnected) return;
    const interval = window.setInterval(fetchDepth, 1500);
    return () => window.clearInterval(interval);
  }, [wsConnected, fetchDepth]);

  return { orderBook };
}

export function useBinanceAggTrades() {
  const [trades, setTrades] = useState<Array<{ price: number; qty: number; isBuyerMaker: boolean; time: number }>>([]);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE}/trades?symbol=${SYMBOL}&limit=30`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTrades(data.map((d: any) => ({
          price: parseFloat(d.price),
          qty: parseFloat(d.qty),
          isBuyerMaker: d.isBuyerMaker,
          time: d.time,
        })).reverse());
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Try WebSocket
  useEffect(() => {
    const ws = createWS(
      `${SYMBOL_LC}@aggTrade`,
      (d) => {
        if (d?.e === 'aggTrade' || d?.p) {
          setWsConnected(true);
          setTrades(prev => {
            const newTrade = {
              price: parseFloat(d.p),
              qty: parseFloat(d.q),
              isBuyerMaker: d.m,
              time: d.T || d.E || Date.now(),
            };
            return [newTrade, ...prev].slice(0, 50);
          });
        }
      },
      () => setWsConnected(false)
    );

    return () => ws?.close();
  }, []);

  // Polling fallback
  useEffect(() => {
    if (wsConnected) return;
    const interval = window.setInterval(fetchTrades, 2000);
    return () => window.clearInterval(interval);
  }, [wsConnected, fetchTrades]);

  return { trades };
}
