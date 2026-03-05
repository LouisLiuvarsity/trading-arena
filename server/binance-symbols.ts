/**
 * Binance USDⓈ-M Futures symbol registry.
 * Fetches all perpetual contract symbols (USDT + USDC margined) from Binance
 * and caches the result. Refreshes every 24 hours.
 */

import type { TradingPairConfig } from "../shared/tradingPair";

const FAPI_EXCHANGE_INFO = "https://fapi.binance.com/fapi/v1/exchangeInfo";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface BinanceSymbolInfo {
  symbol: string;
  pair: string;
  contractType: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  marginAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
}

/** Cached symbol configs keyed by symbol (e.g. "BTCUSDT") */
let symbolCache: Map<string, TradingPairConfig> = new Map();
let lastFetchTime = 0;
let fetchPromise: Promise<void> | null = null;

async function fetchExchangeInfo(): Promise<void> {
  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10_000);
    const res = await fetch(FAPI_EXCHANGE_INFO, { signal: ac.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Binance exchangeInfo failed: ${res.status}`);
    }

    const data = await res.json() as { symbols: BinanceSymbolInfo[] };
    const newCache = new Map<string, TradingPairConfig>();

    for (const s of data.symbols) {
      // Only PERPETUAL contracts, only TRADING status, only USDT/USDC quote
      if (
        s.contractType !== "PERPETUAL" ||
        s.status !== "TRADING" ||
        (s.quoteAsset !== "USDT" && s.quoteAsset !== "USDC")
      ) {
        continue;
      }

      newCache.set(s.symbol, {
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        symbolLc: s.symbol.toLowerCase(),
        priceDecimals: s.pricePrecision,
        qtyDecimals: s.quantityPrecision,
      });
    }

    if (newCache.size > 0) {
      symbolCache = newCache;
      lastFetchTime = Date.now();
      console.log(`[binance-symbols] Loaded ${newCache.size} USDⓈ-M perpetual symbols`);
    }
  } catch (err) {
    console.error("[binance-symbols] Failed to fetch exchange info:", (err as Error).message);
  }
}

/** Ensure cache is populated. Call at server startup. */
export async function initBinanceSymbols(): Promise<void> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetchExchangeInfo();
  await fetchPromise;
  fetchPromise = null;
}

/** Background refresh — call periodically (e.g. every 24h). */
export function startSymbolRefresh(): NodeJS.Timeout {
  return setInterval(async () => {
    if (Date.now() - lastFetchTime > CACHE_TTL_MS) {
      await initBinanceSymbols();
    }
  }, 60 * 60 * 1000); // check every hour
}

/** Get config for a specific symbol. Returns undefined if not a valid perpetual. */
export function getBinanceSymbolConfig(symbol: string): TradingPairConfig | undefined {
  return symbolCache.get(symbol);
}

/** Get all available perpetual symbols as TradingPairConfig array, sorted by symbol name. */
export function getAllBinanceSymbols(): TradingPairConfig[] {
  return Array.from(symbolCache.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/** Check if a symbol is a valid Binance USDⓈ-M perpetual. */
export function isValidBinanceSymbol(symbol: string): boolean {
  return symbolCache.has(symbol);
}

/** Get the number of cached symbols. */
export function getSymbolCount(): number {
  return symbolCache.size;
}
