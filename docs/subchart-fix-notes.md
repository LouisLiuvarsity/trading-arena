# Sub-chart Layout Analysis

## Desktop Layout Structure:
```
h-screen flex flex-col
  ├── StatusBar (shrink-0)
  ├── NewsTicker (shrink-0)
  ├── CompetitionNotifications (shrink-0)
  ├── Main content (flex-1 overflow-hidden)
  │   ├── Left (flex-1 flex-col)
  │   │   ├── TickerBar (shrink-0)
  │   │   └── Chart + OrderBook (flex-1 overflow-hidden)
  │   │       ├── Chart container (flex-1 flex-col min-w-0)
  │   │       │   └── CandlestickChart (fills parent)
  │   │       │       ├── Toolbar (shrink-0)
  │   │       │       ├── Main chart (flex-[3] or flex-1)
  │   │       │       ├── Sub-chart label (shrink-0)
  │   │       │       └── Sub-chart (flex-[1] min-h-[80px])
  │   │       └── OrderBook (shrink-0, resizable width)
  │   └── Right panel (shrink-0, resizable width)
  └── TradingPanel (shrink-0)
```

## Problem:
The CandlestickChart uses `h-full` from its parent which is `flex-1 flex-col min-w-0`.
The parent gets its height from `flex-1 flex overflow-hidden`.
The sub-chart with `flex-[1]` should get 25% of the chart area (main is flex-[3]).
But the sub-chart container has `min-h-[80px]` which is very small.

## Root Cause:
The chart area height is correct (fills available space). The issue is likely:
1. The sub-chart div is created but the lightweight-charts instance inside it might not be rendering properly
2. The ResizeObserver might not be triggering correctly for the sub-chart
3. The sub-chart might need explicit height rather than relying on flex

## Fix:
- Give sub-chart a more explicit min-height like 120-150px
- Ensure the sub-chart container has proper overflow handling
- Make sure the chart instance gets the correct dimensions
