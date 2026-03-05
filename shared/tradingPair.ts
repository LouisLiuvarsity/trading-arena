/**
 * Trading pair configuration registry.
 * Supports multiple symbols — each competition can use a different pair.
 */

export interface TradingPairConfig {
  /** Full Binance symbol, e.g. "SOLUSDT", "BTCUSDT" */
  symbol: string;
  /** Base asset, e.g. "SOL", "BTC" */
  baseAsset: string;
  /** Quote asset, e.g. "USDT" */
  quoteAsset: string;
  /** Lowercase symbol for Binance WebSocket streams */
  symbolLc: string;
  /** Price decimal places for display */
  priceDecimals: number;
  /** Quantity decimal places for display */
  qtyDecimals: number;
}

export const SYMBOL_REGISTRY: Record<string, TradingPairConfig> = {
  SOLUSDT: {
    symbol: "SOLUSDT",
    baseAsset: "SOL",
    quoteAsset: "USDT",
    symbolLc: "solusdt",
    priceDecimals: 2,
    qtyDecimals: 2,
  },
  BTCUSDT: {
    symbol: "BTCUSDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    symbolLc: "btcusdt",
    priceDecimals: 2,
    qtyDecimals: 5,
  },
  ETHUSDT: {
    symbol: "ETHUSDT",
    baseAsset: "ETH",
    quoteAsset: "USDT",
    symbolLc: "ethusdt",
    priceDecimals: 2,
    qtyDecimals: 4,
  },
  BNBUSDT: {
    symbol: "BNBUSDT",
    baseAsset: "BNB",
    quoteAsset: "USDT",
    symbolLc: "bnbusdt",
    priceDecimals: 2,
    qtyDecimals: 3,
  },
  DOGEUSDT: {
    symbol: "DOGEUSDT",
    baseAsset: "DOGE",
    quoteAsset: "USDT",
    symbolLc: "dogeusdt",
    priceDecimals: 5,
    qtyDecimals: 0,
  },
};

/** All supported symbol keys (for dashboard dropdown) */
export const SUPPORTED_SYMBOLS = Object.keys(SYMBOL_REGISTRY);

/** Lookup a symbol config from the registry. Falls back to SOLUSDT. */
export function getSymbolConfig(symbol: string): TradingPairConfig {
  return SYMBOL_REGISTRY[symbol] ?? SYMBOL_REGISTRY.SOLUSDT;
}

/** Default trading pair (backward compatible) */
export const TRADING_PAIR = SYMBOL_REGISTRY.SOLUSDT;
