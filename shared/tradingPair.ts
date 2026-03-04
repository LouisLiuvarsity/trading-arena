/**
 * Trading pair configuration — change these values to switch the entire platform to a different pair.
 */
export const TRADING_PAIR = {
  /** Full Binance symbol, e.g. "SOLUSDT", "BTCUSDT", "ETHUSDT" */
  symbol: "SOLUSDT",
  /** Base asset, e.g. "SOL", "BTC", "ETH" */
  baseAsset: "SOL",
  /** Quote asset, e.g. "USDT" */
  quoteAsset: "USDT",
  /** Lowercase symbol for Binance WebSocket streams */
  symbolLc: "solusdt",
  /** Price decimal places for display */
  priceDecimals: 2,
  /** Quantity decimal places for display */
  qtyDecimals: 2,
} as const;

export type TradingPairConfig = typeof TRADING_PAIR;
