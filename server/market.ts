import { TRADING_PAIR } from "../shared/tradingPair";

const FAPI_BASE = "https://fapi.binance.com/fapi/v1";
const STALE_THRESHOLD_MS = 10_000; // 10 seconds

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
  stale: boolean;
  lastUpdatedAt: number;
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

async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 4000);
    try {
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        throw new Error(`Market request failed: ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError!;
}

export class MarketService {
  private symbol: string;

  private ticker: TickerSnapshot;

  private orderBook: OrderBookSnapshot = { bids: [], asks: [] };
  private tickerTimer?: NodeJS.Timeout;
  private depthTimer?: NodeJS.Timeout;

  constructor(symbol?: string) {
    this.symbol = symbol ?? TRADING_PAIR.symbol;
    this.ticker = {
      symbol: this.symbol,
      lastPrice: 0,
      priceChange: 0,
      priceChangePct: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      markPrice: 0,
      indexPrice: 0,
      fundingRate: 0,
      nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
      stale: true,
      lastUpdatedAt: 0,
    };
  }

  /** Switch to a new symbol. Resets ticker and orderbook state. */
  setSymbol(newSymbol: string): void {
    if (this.symbol === newSymbol) return;
    console.log(`[market] Switching symbol: ${this.symbol} → ${newSymbol}`);
    this.symbol = newSymbol;
    this.ticker = {
      ...this.ticker,
      symbol: newSymbol,
      lastPrice: 0,
      stale: true,
      lastUpdatedAt: 0,
    };
    this.orderBook = { bids: [], asks: [] };
  }

  getSymbol(): string {
    return this.symbol;
  }

  async start() {
    await Promise.allSettled([this.refreshTicker(), this.refreshPremiumIndex(), this.refreshDepth()]);
    this.tickerTimer = setInterval(() => {
      void this.refreshTicker();
      void this.refreshPremiumIndex();
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

  isStale(): boolean {
    if (this.ticker.lastUpdatedAt === 0) return true;
    return Date.now() - this.ticker.lastUpdatedAt > STALE_THRESHOLD_MS;
  }

  getLastPrice(): number {
    return this.ticker.lastPrice;
  }

  getTicker(): TickerSnapshot {
    return {
      ...this.ticker,
      stale: this.isStale(),
    };
  }

  getOrderBook(): OrderBookSnapshot {
    return this.orderBook;
  }

  private async refreshTicker() {
    try {
      const raw = await fetchJson<{
        symbol: string;
        lastPrice: string;
        priceChange: string;
        priceChangePercent: string;
        highPrice: string;
        lowPrice: string;
        quoteVolume: string;
      }>(`${FAPI_BASE}/ticker/24hr?symbol=${this.symbol}`);

      const lastPrice = Number(raw.lastPrice);
      if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
        return;
      }

      this.ticker = {
        ...this.ticker,
        symbol: raw.symbol,
        lastPrice,
        priceChange: Number(raw.priceChange),
        priceChangePct: Number(raw.priceChangePercent),
        high24h: Number(raw.highPrice),
        low24h: Number(raw.lowPrice),
        volume24h: Number(raw.quoteVolume),
        stale: false,
        lastUpdatedAt: Date.now(),
      };
    } catch (err) {
      console.error("[market] refreshTicker failed:", (err as Error).message);
    }
  }

  private async refreshPremiumIndex() {
    try {
      const raw = await fetchJson<{
        markPrice: string;
        indexPrice: string;
        lastFundingRate: string;
        nextFundingTime: number;
      }>(`${FAPI_BASE}/premiumIndex?symbol=${this.symbol}`);

      this.ticker = {
        ...this.ticker,
        markPrice: Number(raw.markPrice) || this.ticker.lastPrice,
        indexPrice: Number(raw.indexPrice) || this.ticker.lastPrice,
        fundingRate: Number(raw.lastFundingRate),
        nextFundingTime: raw.nextFundingTime,
      };
    } catch (err) {
      console.error("[market] refreshPremiumIndex failed:", (err as Error).message);
    }
  }

  private async refreshDepth() {
    try {
      const raw = await fetchJson<{ bids: [string, string][]; asks: [string, string][] }>(
        `${FAPI_BASE}/depth?symbol=${this.symbol}&limit=20`,
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
    } catch (err) {
      console.error("[market] refreshDepth failed:", (err as Error).message);
    }
  }
}

export type { TickerSnapshot, OrderBookSnapshot };
