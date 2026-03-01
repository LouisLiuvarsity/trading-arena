# Trading Arena

> **24-Hour Crypto Trading Competition Simulator** — A real-time, gamified trading experience built with React 19, featuring live Binance market data, competitive ranking mechanics, and a tiered profit-sharing system.

---

## Overview

Trading Arena is a fully client-side trading competition simulator that connects to **live Binance SOLUSDT market data** via WebSocket. Players compete in a 24-hour arena format with 5,000 USDT simulated capital, placing long/short trades on SOL perpetual contracts. The platform features a realistic exchange-grade interface with candlestick charts, order books, real-time leaderboards, and psychological pressure mechanics designed to simulate the emotional intensity of competitive trading.

This project serves as a **frontend demonstration and design prototype** for a gamified crypto trading competition platform. All trading logic runs entirely in the browser — no backend, no real money, no risk.

---

## Screenshots

| Login | Rules Guide | Trading Arena |
|-------|-------------|---------------|
| Dark-themed entry with competition stats | Step-by-step onboarding with arrow navigation | Full trading interface with live data |

---

## Key Features

### Real-Time Market Data

The platform connects directly to Binance's public data streams for live SOLUSDT market information. A custom **WebSocket Manager** (`BinanceWSManager`) batches all subscriptions into a single connection, with automatic reconnection and exponential backoff. When WebSocket is unavailable, the system gracefully falls back to REST polling.

| Data Stream | Source | Update Frequency |
|---|---|---|
| Candlestick (K-line) | `solusdt@kline_{timeframe}` | Real-time per tick |
| 24h Ticker | `solusdt@ticker` | Real-time per tick |
| Order Book Depth | `solusdt@depth10@100ms` | Every 100ms |
| Recent Trades | `solusdt@trade` | Real-time per trade |

Five timeframes are supported: **1m, 5m, 15m, 1H, 4H**. Historical data is fetched via Binance REST API on initial load, then kept current through WebSocket updates.

### Simulated Trading Engine

The trading engine (`useTrading` hook) implements a complete position management system with realistic mechanics:

- **Position Management**: Open long/short positions with configurable size (25%/50%/75%/100% of available equity). Only one position can be open at a time, with a maximum of 40 trades per match.
- **Take-Profit / Stop-Loss**: Set TP/SL levels that automatically trigger position closure when price conditions are met. The system checks triggers on every price update.
- **Hold Duration Weighting**: Trades are weighted by how long the position is held, incentivizing thoughtful trading over rapid scalping.

| Hold Duration | Weight Multiplier |
|---|---|
| < 1 minute | 0.2x |
| 1–3 minutes | 0.4x |
| 3–10 minutes | 0.7x |
| 10–30 minutes | 1.0x |
| 30 min – 2 hours | 1.15x |
| 2–4+ hours | 1.3x |

### Tiered Profit Sharing (5%–20%)

Profit sharing is determined by a player's **Participation Score**, which accumulates based on trade size multiplied by hold duration weight. Higher engagement unlocks better profit-sharing tiers:

| Tier | Participation Score | Profit Share |
|---|---|---|
| Bronze | 0 – 9,999 | 5% |
| Silver | 10,000 – 24,999 | 10% |
| Gold | 25,000 – 39,999 | 15% |
| Diamond | 40,000+ | 20% |

### Competition Structure

Each competition cycle consists of **3 consecutive matches**, with results aggregated across all three. Players cannot skip individual matches — all three must be completed. The three-match structure is divided into stages:

1. **Trial Stage** — Familiarize with the market, establish baseline
2. **Serious Stage** — Refine strategy, accumulate score
3. **Final Stage** — Optimize ranking, concentrate efforts

After completing a full 3-match cycle, players receive a **personal trading analysis report** covering behavioral patterns, position timing, risk/reward analysis, emotional trading detection, and comparison against the field average.

### Ranking & Psychological Pressure

The **Rank Anxiety Strip** at the bottom of the trading interface provides constant psychological pressure through real-time indicators:

- Current rank position and distance to the promotion line
- Number of traders who have overtaken you recently
- Count of players clustered near the promotion threshold
- Live scrolling feed of ranking events (overtakes, promotions, rank volatility)

The notification system delivers competition alerts via a **draggable, closeable floating panel** that can be repositioned anywhere on screen to avoid obstructing the trading view.

### Information Panels

The right sidebar offers five tabbed panels:

| Tab | Content |
|---|---|
| **Chat** | Simulated chat room with trader messages, system alerts, and emotional reactions |
| **Trades** | Personal trade history with P&L, hold duration, and weighted scores |
| **Rank** | Live leaderboard showing top traders, your position, and promotion zone |
| **Stats** | Market statistics including L/S ratio, win rate, trading activity, and profit-sharing tier progress |
| **News** | Crypto news feed with sentiment indicators (bullish/bearish/neutral) and impact ratings |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 with TypeScript |
| **Styling** | Tailwind CSS 4 + shadcn/ui components |
| **Charts** | Lightweight Charts (TradingView) v5 |
| **Animations** | Framer Motion |
| **State** | React hooks + refs (no external state library) |
| **Data** | Binance WebSocket + REST API (public, no key required) |
| **Build** | Vite 7 |
| **Package Manager** | pnpm |

---

## Project Structure

```
trading-arena/
├── client/
│   ├── index.html                    # Entry HTML with Google Fonts
│   ├── public/                       # Static assets (favicon, robots.txt)
│   └── src/
│       ├── App.tsx                   # Root component with screen routing
│       ├── main.tsx                  # React entry point
│       ├── index.css                 # Global styles & Tailwind theme
│       ├── pages/
│       │   ├── LoginPage.tsx         # Competition entry screen
│       │   ├── RulesPage.tsx         # Interactive rules guide (4 sections)
│       │   └── TradingPage.tsx       # Main trading arena layout
│       ├── components/
│       │   ├── CandlestickChart.tsx  # TradingView Lightweight Charts
│       │   ├── OrderBookPanel.tsx    # Bid/ask depth display
│       │   ├── TradingPanel.tsx      # Order entry (buy/sell/TP/SL)
│       │   ├── StatusBar.tsx         # Top bar with account metrics
│       │   ├── TickerBar.tsx         # 24h price statistics
│       │   ├── NewsTicker.tsx        # Scrolling news headline bar
│       │   ├── ChatRoom.tsx          # Simulated trader chat
│       │   ├── Leaderboard.tsx       # Full ranking table
│       │   ├── MiniLeaderboard.tsx   # Compact ranking widget
│       │   ├── MarketStats.tsx       # Statistics & analytics panel
│       │   ├── NewsFeed.tsx          # News list with sentiment
│       │   ├── TradeHistory.tsx      # Personal trade log
│       │   ├── RankAnxietyStrip.tsx  # Bottom ranking pressure bar
│       │   ├── CompetitionNotifications.tsx  # Draggable alert panel
│       │   ├── RecentTrades.tsx      # Market trade feed
│       │   ├── SocialBar.tsx         # Social metrics display
│       │   └── ui/                   # shadcn/ui component library
│       ├── hooks/
│       │   ├── useBinanceWS.ts       # Binance WebSocket/REST hooks
│       │   └── useTrading.ts         # Trading engine & account state
│       ├── lib/
│       │   ├── types.ts              # TypeScript type definitions
│       │   ├── mockData.ts           # Mock data generators
│       │   └── utils.ts              # Utility functions
│       └── contexts/
│           └── ThemeContext.tsx       # Dark/light theme provider
├── server/                           # Placeholder (static-only project)
├── shared/                           # Shared constants
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 22+ 
- **pnpm** 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/trading-arena.git
cd trading-arena

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Build for Production

```bash
pnpm build
pnpm preview
```

---

## Design Philosophy

The visual design follows an **"Obsidian Exchange"** aesthetic — a fusion of professional crypto exchange interfaces with esports arena energy. Key design principles include:

- **Dark-first palette**: Deep navy/charcoal backgrounds (`#0B0E17`, `#141722`) with high-contrast text and strategic use of Binance-inspired accent colors (gold `#F0B90B`, green `#0ECB81`, red `#F6465D`).
- **Information density**: The trading interface maximizes data visibility within a single viewport, with no scrolling required during active trading. Every pixel serves a purpose.
- **Psychological tension**: The UI deliberately creates competitive pressure through real-time rank changes, overtake notifications, and proximity-to-promotion indicators.
- **Monospace data**: All numerical data uses monospace fonts for precise alignment, while headings use bold display typography for visual hierarchy.

---

## Game Mechanics Deep Dive

### Participation Score

The Participation Score is the core progression metric. It is calculated as:

```
Participation Score = Σ (Trade Size × Hold Duration Weight)
```

This formula rewards traders who commit meaningful capital for sustained periods, discouraging both micro-scalping (low weight) and idle observation (no trades). The score directly determines the profit-sharing tier, creating a natural incentive to trade actively and hold positions thoughtfully.

### Weighted P&L

Raw profit/loss is adjusted by the hold duration weight:

```
Weighted P&L = Raw P&L × Hold Duration Weight
```

A quick 30-second scalp that earns +50 USDT only counts as +10 USDT (0.2x weight), while a 30-minute position earning the same +50 USDT counts at full value (1.0x weight). This mechanic fundamentally changes trading behavior — players must balance conviction with risk management.

### Promotion System

After completing a 3-match cycle, players are evaluated based on their **average promotion score** across all three matches. Strong performers advance to higher tiers with increased capital allocation and leverage access:

| Current Tier | Capital | Leverage | Promotion Target |
|---|---|---|---|
| Starter | 5,000 USDT | 1x | Advance to 10,000U / 2x |
| Intermediate | 10,000 USDT | 2x | Advance to 20,000U / 3x |
| Advanced | 20,000 USDT | 3x | Top-tier status |

---

## Data Flow Architecture

```
Binance Public API
    │
    ├── WebSocket (Primary)
    │   └── BinanceWSManager (Singleton)
    │       ├── Batched subscriptions (150ms debounce)
    │       ├── Auto-reconnect with exponential backoff
    │       └── Max 5 connection attempts
    │
    └── REST API (Fallback)
        └── Polling every 3-5 seconds when WS inactive

    ↓

React Hooks Layer
    ├── useBinanceKline()   → KlineData[]
    ├── useBinanceTicker()  → TickerData + priceDirection
    ├── useBinanceDepth()   → OrderBook (bids/asks)
    └── useBinanceTrades()  → RecentTrade[]

    ↓

Trading Engine (useTrading)
    ├── Position management (open/close/TP/SL)
    ├── Hold duration weight calculation
    ├── Participation score accumulation
    ├── Profit-sharing tier determination
    └── Account state (equity, P&L, rank)

    ↓

UI Components
    ├── CandlestickChart (TradingView Lightweight Charts)
    ├── OrderBookPanel (grid-aligned depth display)
    ├── TradingPanel (order entry)
    ├── StatusBar (account metrics)
    ├── RankAnxietyStrip (competitive pressure)
    └── Right Sidebar (Chat/Trades/Rank/Stats/News)
```

---

## Configuration

### Changing the Trading Pair

To switch from SOLUSDT to another pair, update the constants in `client/src/hooks/useBinanceWS.ts`:

```typescript
const SYMBOL = 'BTCUSDT';      // Change to desired symbol
const SYMBOL_LC = 'btcusdt';   // Lowercase version for WebSocket streams
```

Also update references in `OrderBookPanel.tsx` (column header), `TickerBar.tsx`, and `TradingPage.tsx`.

### Adjusting Game Parameters

Key parameters in `client/src/hooks/useTrading.ts`:

```typescript
// Hold duration weight tiers
const HOLD_WEIGHTS = [
  { maxSeconds: 60, weight: 0.2 },   // < 1 min
  { maxSeconds: 180, weight: 0.4 },  // 1-3 min
  // ... customize as needed
];

// Profit sharing tiers
function getProfitShareTier(score: number): number {
  if (score >= 40000) return 20;  // Diamond: 20%
  if (score >= 25000) return 15;  // Gold: 15%
  if (score >= 10000) return 10;  // Silver: 10%
  return 5;                        // Bronze: 5%
}
```

---

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 90+ | Fully supported |
| Firefox 90+ | Fully supported |
| Safari 15+ | Fully supported |
| Edge 90+ | Fully supported |

WebSocket connectivity requires an unblocked connection to `data-stream.binance.vision`. If WebSocket is blocked (e.g., corporate firewalls), the application automatically falls back to REST polling with slightly reduced update frequency.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Binance** — Public market data API (WebSocket + REST)
- **TradingView** — Lightweight Charts library for candlestick rendering
- **shadcn/ui** — Component library foundation
- **Radix UI** — Accessible primitive components
- **Lucide** — Icon set used throughout the interface
