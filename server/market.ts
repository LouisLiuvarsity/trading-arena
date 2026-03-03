import { SYMBOL } from "./constants.js";

const REST_BASE = "https://data-api.binance.vision/api/v3";

type TickerSnapshot = {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
};

type DepthEntry = {
  price: number;
  quantity: number;
  total: number;
};

type OrderBookSnapshot = {
  bids: DepthEntry[];
  asks: DepthEntry[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) {
      throw new Error(`Market request failed: ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export class MarketService {
  private ticker: TickerSnapshot = {
    symbol: SYMBOL,
    lastPrice: 150,
    priceChange: 0,
    priceChangePct: 0,
    high24h: 150,
    low24h: 150,
    volume24h: 0,
    markPrice: 150,
    indexPrice: 150,
    fundingRate: 0,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
  };

  private orderBook: OrderBookSnapshot = { bids: [], asks: [] };
  private tickerTimer?: NodeJS.Timeout;
  private depthTimer?: NodeJS.Timeout;

  async start() {
    await Promise.allSettled([this.refreshTicker(), this.refreshDepth()]);
    this.tickerTimer = setInterval(() => {
      void this.refreshTicker();
    }, 1000);
    this.depthTimer = setInterval(() => {
      void this.refreshDepth();
    }, 2000);
  }

  stop() {
    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
      this.tickerTimer = undefined;
    }
    if (this.depthTimer) {
      clearInterval(this.depthTimer);
      this.depthTimer = undefined;
    }
  }

  getLastPrice(): number {
    return this.ticker.lastPrice;
  }

  getTicker(): TickerSnapshot {
    return this.ticker;
  }

  getOrderBook(): OrderBookSnapshot {
    return this.orderBook;
  }

  private async refreshTicker() {
    const raw = await fetchJson<{
      symbol: string;
      lastPrice: string;
      priceChange: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    }>(`${REST_BASE}/ticker/24hr?symbol=${SYMBOL}`);

    const lastPrice = Number(raw.lastPrice);
    if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
      return;
    }

    this.ticker = {
      symbol: raw.symbol,
      lastPrice,
      priceChange: Number(raw.priceChange),
      priceChangePct: Number(raw.priceChangePercent),
      high24h: Number(raw.highPrice),
      low24h: Number(raw.lowPrice),
      volume24h: Number(raw.quoteVolume),
      markPrice: lastPrice,
      indexPrice: lastPrice,
      fundingRate: this.ticker.fundingRate,
      nextFundingTime: this.ticker.nextFundingTime,
    };
  }

  private async refreshDepth() {
    const raw = await fetchJson<{ bids: [string, string][]; asks: [string, string][] }>(
      `${REST_BASE}/depth?symbol=${SYMBOL}&limit=20`,
    );

    let bidTotal = 0;
    let askTotal = 0;

    this.orderBook = {
      bids: raw.bids.slice(0, 15).map(([price, qty]) => {
        const quantity = Number(qty);
        bidTotal += quantity;
        return { price: Number(price), quantity, total: bidTotal };
      }),
      asks: raw.asks.slice(0, 15).map(([price, qty]) => {
        const quantity = Number(qty);
        askTotal += quantity;
        return { price: Number(price), quantity, total: askTotal };
      }),
    };
  }
}

export type { TickerSnapshot, OrderBookSnapshot };
