# Subplot Fix Observations - After Closing Settings Panel

## Current State
- The chart is now visible with VOL subchart active (Ind 1 shown)
- Main candlestick chart takes up the majority of the space
- Below the main chart, there's a "VOL" label separator
- The VOL subchart is visible showing volume histogram bars (colored red/green)
- The subchart area appears to have adequate height (~120px)
- The time axis is shown only on the subchart (bottom), not on the main chart - this is correct behavior
- The TradingPanel at the bottom is fully visible with buy/sell buttons

## Key Observations
1. The VOL subchart IS rendering correctly now
2. The subchart has its own price scale on the right showing volume values (16.16K)
3. The main chart's time axis is hidden when subchart is active (as intended)
4. The subchart shows the time axis at the bottom
5. There's a prediction notification popup (UP/DOWN buttons) overlaying the chart

## Layout Measurements (approximate from screenshot)
- StatusBar + NewsTicker: ~60px
- TickerBar: ~30px
- Main chart: ~400px (flex-1)
- VOL label: ~20px
- VOL subchart: ~120px (25% of container, min 120px)
- TradingPanel: ~80px

## Remaining Issue
- Need to test RSI, MACD, and other subchart indicators
- The RSI toggle didn't seem to activate (still shows Ind 1, not Ind 2)
- Need to check if RSI replaces VOL or if only one subchart indicator can be active at a time
