// ============================================================
// Binance USDⓈ-M Futures Market Data Hooks (Performance Optimized)
// Primary: WebSocket via fstream.binance.com (futures)
// Fallback: REST polling via fapi.binance.com
// Key fix: Batched subscriptions to avoid excessive reconnections
// Supports dynamic symbol switching per-competition
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { KlineData, TickerData, OrderBook, TimeframeKey } from '@/lib/types';

const REST_BASE = 'https://fapi.binance.com/fapi/v1';
const WS_BASE = 'wss://fstream.binance.com/stream?streams=';

// ─── WebSocket Manager (Batched) ────────────────────────────
// Collects all subscriptions, then connects once with all streams
type StreamHandler = (data: any) => void;

class BinanceWSManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, StreamHandler> = new Map();
  private reconnectTimer: number | null = null;
  private batchTimer: number | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxAttempts = 5;
  private currentStreamsUrl = '';

  subscribe(stream: string, handler: StreamHandler) {
    this.handlers.set(stream, handler);
    // Batch: wait 100ms for all subscriptions to register, then connect once
    this.scheduleBatchConnect();
  }

  unsubscribe(stream: string) {
    this.handlers.delete(stream);
    if (this.handlers.size === 0) {
      this.disconnect();
    }
    // Don't reconnect on unsubscribe — streams still work, just handler removed
  }

  private scheduleBatchConnect() {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = window.setTimeout(() => {
      this.batchTimer = null;
      const newUrl = this.getStreamsUrl();
      // Only reconnect if streams actually changed
      if (newUrl !== this.currentStreamsUrl) {
        if (this.isConnected) {
          this.disconnect();
        }
        this.connect();
      }
    }, 150);
  }

  private getStreamsUrl(): string {
    return WS_BASE + Array.from(this.handlers.keys()).join('/');
  }

  private connect() {
    if (this.handlers.size === 0) return;
    if (this.connectionAttempts >= this.maxAttempts) return;

    const url = this.getStreamsUrl();
    this.currentStreamsUrl = url;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log(`[WS] Connected (${this.handlers.size} streams)`);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const stream = msg.stream;
        const data = msg.data;
        if (stream && data) {
          const handler = this.handlers.get(stream);
          if (handler) {
            handler(data);
          } else {
            // Partial match for kline streams (e.g., stream might have extra info)
            this.handlers.forEach((h, key) => {
              if (stream.includes(key) || key.includes(stream)) {
                h(data);
              }
            });
          }
        }
      } catch { /* ignore parse errors */ }
    };

    this.ws.onerror = () => {
      this.isConnected = false;
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.currentStreamsUrl = '';
      this.scheduleReconnect();
    };
  }

  private disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.currentStreamsUrl = '';
    this.connectionAttempts = 0; // Reset so reconnection works after navigating back
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (this.handlers.size === 0) return;
    this.connectionAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }
}

// Singleton
const wsManager = new BinanceWSManager();

// ─── Kline Hook ──────────────────────────────────────────────
export function useBinanceKline(symbol: string, timeframe: TimeframeKey = '1m') {
  const symbolLc = useMemo(() => symbol.toLowerCase(), [symbol]);
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [loading, setLoading] = useState(true);
  const wsActiveRef = useRef(false);

  // Clear stale data on symbol change
  useEffect(() => {
    setKlines([]);
    setLoading(true);
  }, [symbol]);

  // Fetch historical klines via REST
  const fetchKlines = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE}/klines?symbol=${symbol}&interval=${timeframe}&limit=300`);
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
  }, [symbol, timeframe]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchKlines();
  }, [fetchKlines]);

  // WebSocket subscription
  useEffect(() => {
    const stream = `${symbolLc}@kline_${timeframe}`;

    wsManager.subscribe(stream, (d) => {
      if (d?.k) {
        wsActiveRef.current = true;
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
    });

    return () => {
      wsManager.unsubscribe(stream);
      wsActiveRef.current = false;
    };
  }, [symbolLc, timeframe]);

  // Polling fallback (only if WS not active)
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!wsActiveRef.current) {
        fetchKlines();
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [fetchKlines]);

  return { klines, loading };
}

// ─── Ticker Hook ─────────────────────────────────────────────
export function useBinanceTicker(symbol: string) {
  const symbolLc = useMemo(() => symbol.toLowerCase(), [symbol]);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const prevPriceRef = useRef<number>(0);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const wsActiveRef = useRef(false);

  // Reset on symbol change
  useEffect(() => {
    setTicker(null);
    prevPriceRef.current = 0;
    setPriceDirection('neutral');
  }, [symbol]);

  const fetchTicker = useCallback(async () => {
    try {
      const [tickerRes, premiumRes] = await Promise.all([
        fetch(`${REST_BASE}/ticker/24hr?symbol=${symbol}`),
        fetch(`${REST_BASE}/premiumIndex?symbol=${symbol}`),
      ]);
      const d = await tickerRes.json();
      const p = premiumRes.ok ? await premiumRes.json() : null;
      if (d.lastPrice) {
        const lastPrice = parseFloat(d.lastPrice);
        if (prevPriceRef.current > 0) {
          setPriceDirection(lastPrice > prevPriceRef.current ? 'up' : lastPrice < prevPriceRef.current ? 'down' : 'neutral');
        }
        prevPriceRef.current = lastPrice;
        setTicker({
          symbol,
          lastPrice,
          priceChange: parseFloat(d.priceChange),
          priceChangePct: parseFloat(d.priceChangePercent),
          high24h: parseFloat(d.highPrice),
          low24h: parseFloat(d.lowPrice),
          volume24h: parseFloat(d.quoteVolume),
          markPrice: p ? parseFloat(p.markPrice) : lastPrice,
          indexPrice: p ? parseFloat(p.indexPrice) : lastPrice,
          fundingRate: p ? parseFloat(p.lastFundingRate) : 0,
          nextFundingTime: p ? p.nextFundingTime : Date.now() + 3600000,
        });
      }
    } catch { /* silent */ }
  }, [symbol]);

  // Initial fetch
  useEffect(() => {
    fetchTicker();
  }, [fetchTicker]);

  // WebSocket subscription for ticker + mark price
  useEffect(() => {
    const tickerStream = `${symbolLc}@ticker`;
    const markStream = `${symbolLc}@markPrice@1s`;

    wsManager.subscribe(tickerStream, (d) => {
      if (d?.c) {
        wsActiveRef.current = true;
        const lastPrice = parseFloat(d.c);
        if (prevPriceRef.current > 0) {
          setPriceDirection(lastPrice > prevPriceRef.current ? 'up' : lastPrice < prevPriceRef.current ? 'down' : 'neutral');
        }
        prevPriceRef.current = lastPrice;
        setTicker(prev => ({
          symbol,
          lastPrice,
          priceChange: parseFloat(d.p),
          priceChangePct: parseFloat(d.P),
          high24h: parseFloat(d.h),
          low24h: parseFloat(d.l),
          volume24h: parseFloat(d.q),
          markPrice: prev?.markPrice || lastPrice,
          indexPrice: prev?.indexPrice || lastPrice,
          fundingRate: prev?.fundingRate || 0,
          nextFundingTime: prev?.nextFundingTime || Date.now() + 3600000,
        }));
      }
    });

    wsManager.subscribe(markStream, (d) => {
      if (d?.p) {
        setTicker(prev => prev ? {
          ...prev,
          markPrice: parseFloat(d.p),
          indexPrice: parseFloat(d.i) || prev.indexPrice,
          fundingRate: parseFloat(d.r),
          nextFundingTime: d.T || prev.nextFundingTime,
        } : prev);
      }
    });

    return () => {
      wsManager.unsubscribe(tickerStream);
      wsManager.unsubscribe(markStream);
      wsActiveRef.current = false;
    };
  }, [symbol, symbolLc]);

  // Polling fallback
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!wsActiveRef.current) {
        fetchTicker();
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [fetchTicker]);

  return { ticker, priceDirection };
}

// ─── Depth Hook ──────────────────────────────────────────────
export function useBinanceDepth(symbol: string) {
  const symbolLc = useMemo(() => symbol.toLowerCase(), [symbol]);
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const wsActiveRef = useRef(false);

  // Reset on symbol change
  useEffect(() => {
    setOrderBook({ bids: [], asks: [] });
  }, [symbol]);

  const parseDepth = useCallback((bids: string[][], asks: string[][]) => {
    let bidTotal = 0;
    let askTotal = 0;
    setOrderBook({
      bids: bids.slice(0, 15).map((b) => {
        const qty = parseFloat(b[1]);
        bidTotal += qty;
        return { price: parseFloat(b[0]), quantity: qty, total: bidTotal };
      }),
      asks: asks.slice(0, 15).map((a) => {
        const qty = parseFloat(a[1]);
        askTotal += qty;
        return { price: parseFloat(a[0]), quantity: qty, total: askTotal };
      }),
    });
  }, []);

  const fetchDepth = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE}/depth?symbol=${symbol}&limit=20`);
      const d = await res.json();
      if (d.bids && d.asks) {
        parseDepth(d.bids, d.asks);
      }
    } catch { /* silent */ }
  }, [symbol, parseDepth]);

  // Initial fetch
  useEffect(() => {
    fetchDepth();
  }, [fetchDepth]);

  // WebSocket subscription for depth
  useEffect(() => {
    const stream = `${symbolLc}@depth20@1000ms`;

    wsManager.subscribe(stream, (d) => {
      if (d?.b && d?.a) {
        wsActiveRef.current = true;
        parseDepth(d.b, d.a);
      }
    });

    return () => {
      wsManager.unsubscribe(stream);
      wsActiveRef.current = false;
    };
  }, [symbolLc, parseDepth]);

  // Polling fallback
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!wsActiveRef.current) {
        fetchDepth();
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [fetchDepth]);

  return { orderBook };
}

// ─── Aggregate Trades Hook ───────────────────────────────────
export function useBinanceAggTrades(symbol: string) {
  const symbolLc = useMemo(() => symbol.toLowerCase(), [symbol]);
  const [trades, setTrades] = useState<Array<{ price: number; qty: number; isBuyerMaker: boolean; time: number }>>([]);
  const wsActiveRef = useRef(false);

  // Reset on symbol change
  useEffect(() => {
    setTrades([]);
  }, [symbol]);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE}/trades?symbol=${symbol}&limit=30`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTrades(data.map((d: any) => ({
          price: parseFloat(d.price),
          qty: parseFloat(d.qty),
          isBuyerMaker: d.isBuyerMaker,
          time: d.time,
        })).reverse());
      }
    } catch { /* silent */ }
  }, [symbol]);

  // Initial fetch
  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // WebSocket subscription for trades
  useEffect(() => {
    const stream = `${symbolLc}@aggTrade`;

    wsManager.subscribe(stream, (d) => {
      if (d?.p) {
        wsActiveRef.current = true;
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
    });

    return () => {
      wsManager.unsubscribe(stream);
      wsActiveRef.current = false;
    };
  }, [symbolLc]);

  // Polling fallback
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!wsActiveRef.current) {
        fetchTrades();
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [fetchTrades]);

  return { trades };
}
