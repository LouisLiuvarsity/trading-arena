/**
 * Trading pair configuration types and utilities.
 * Actual symbol list is fetched dynamically from Binance USDⓈ-M Futures API
 * (see server/binance-symbols.ts). This file provides types and a fallback default.
 */

export interface TradingPairConfig {
  /** Full Binance symbol, e.g. "SOLUSDT", "BTCUSDT" */
  symbol: string;
  /** Base asset, e.g. "SOL", "BTC" */
  baseAsset: string;
  /** Quote asset, e.g. "USDT", "USDC" */
  quoteAsset: string;
  /** Lowercase symbol for Binance WebSocket streams */
  symbolLc: string;
  /** Price decimal places for display */
  priceDecimals: number;
  /** Quantity decimal places for display */
  qtyDecimals: number;
}

/** Default trading pair (used as fallback before server data loads) */
export const TRADING_PAIR: TradingPairConfig = {
  symbol: "SOLUSDT",
  baseAsset: "SOL",
  quoteAsset: "USDT",
  symbolLc: "solusdt",
  priceDecimals: 2,
  qtyDecimals: 2,
};

/**
 * Derive a TradingPairConfig from a symbol string.
 * Used as client-side fallback when the server hasn't provided the full config yet.
 * The server should always provide precise config via the `tradingPair` field in /api/state.
 */
export function getSymbolConfig(symbol: string): TradingPairConfig {
  if (!symbol || symbol === TRADING_PAIR.symbol) return TRADING_PAIR;

  // Derive base/quote from symbol string
  let quoteAsset = "USDT";
  let baseAsset = symbol;
  if (symbol.endsWith("USDC")) {
    quoteAsset = "USDC";
    baseAsset = symbol.slice(0, -4);
  } else if (symbol.endsWith("USDT")) {
    quoteAsset = "USDT";
    baseAsset = symbol.slice(0, -4);
  }

  return {
    symbol,
    baseAsset,
    quoteAsset,
    symbolLc: symbol.toLowerCase(),
    priceDecimals: 2, // default; server provides exact value
    qtyDecimals: 2,   // default; server provides exact value
  };
}
