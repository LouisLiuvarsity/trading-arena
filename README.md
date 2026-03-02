# Trading Arena

> **24-Hour Crypto Trading Competition Platform** — A real-time, gamified trading arena built with React 19, featuring live Binance SOL/USDT market data, LoL-style rank tiers, fixed prize pools, and behavioral pressure mechanics designed for competitive trading at scale.

---

## Overview

Trading Arena is a **24-hour crypto trading competition simulator** where players compete using 5,000 USDT simulated capital on live Binance SOL/USDT perpetual contract data. The platform runs a monthly tournament structure — 15 regular matches plus a grand final — with a fixed 10,000 USDT monthly prize budget. Rankings are determined by **Weighted P&L** (hold-duration-adjusted returns), and a cumulative **season points** system drives progression through six LoL-inspired rank tiers (Iron → Diamond), each unlocking higher leverage multipliers.

The project currently operates as a **fully client-side frontend prototype**. All trading logic, ranking simulation, and competition mechanics run entirely in the browser. The architecture is designed for straightforward migration to a server-authoritative backend.

---

## Core Parameters

| Parameter | Value |
|---|---|
| **Monthly Budget** | 10,000 USDT (fixed) |
| **Regular Match Prize** | 500 USDT / match |
| **Grand Final Prize** | 2,500 USDT |
| **Monthly Schedule** | 15 regular + 1 grand final |
| **Match Duration** | 24 hours |
| **Starting Capital** | 5,000 USDT (simulated) |
| **Trading Pair** | SOL/USDT perpetual (Binance live data) |
| **Max Trades / Match** | 40 |
| **Concurrent Positions** | 1 at a time |
| **Min Trades for Prize** | 5 per match |
| **Last 30 Minutes** | No new positions (close-only) |

---

## Key Features

### Real-Time Market Data

The platform connects directly to Binance's public data streams for live SOL/USDT market information. A custom **WebSocket Manager** (`BinanceWSManager`) batches all subscriptions into a single connection, with automatic reconnection and exponential backoff. When WebSocket is unavailable, the system gracefully falls back to REST polling.

| Data Stream | Source | Update Frequency |
|---|---|---|
| Candlestick (K-line) | `solusdt@kline_{timeframe}` | Real-time per tick |
| 24h Ticker | `solusdt@ticker` | Real-time per tick |
| Order Book Depth | `solusdt@depth10@100ms` | Every 100ms |
| Recent Trades | `solusdt@trade` | Real-time per trade |

Five timeframes are supported: **1m, 5m, 15m, 1H, 4H**. Historical data is fetched via Binance REST API on initial load, then kept current through WebSocket updates.

### Simulated Trading Engine

The trading engine (`useTrading` hook) implements a complete position management system with realistic mechanics. Players can open long/short positions with configurable size (25%/50%/75%/100% of available equity), set take-profit and stop-loss levels, and manage a maximum of 40 trades per match. Only one position may be open at a time.

**Hold Duration Weighting** is the core mechanic that separates Trading Arena from simple P&L competitions. Every trade's profit or loss is multiplied by a weight based on how long the position was held:

| Hold Duration | Weight | Design Intent |
|---|---|---|
| < 1 minute | 0.2x | Heavy penalty — suppress noise trading |
| 1 – 3 minutes | 0.4x | Moderate penalty — allow tactical trades |
| 3 – 10 minutes | 0.7x | Light penalty — short conviction trades |
| 10 – 30 minutes | 1.0x | Baseline — thoughtful trading |
| 30 min – 2 hours | 1.15x | Reward — medium conviction holds |
| 2 – 4+ hours | 1.3x | Maximum reward — high conviction positions |

A quick 30-second scalp earning +50 USDT only counts as +10 USDT (0.2x), while a 2-hour hold earning the same +50 USDT counts as +65 USDT (1.3x). This fundamentally changes trading behavior — players must balance conviction with risk management.

### Rank Tier System (LoL-Style)

Players progress through six rank tiers driven by **cumulative season points**. Each tier unlocks a higher leverage multiplier, allowing higher-ranked players to amplify their returns. Leverage is applied automatically to all P&L calculations — it is not a user-selectable option, but a reward earned through consistent performance.

| Rank Tier | Points Required | Leverage | Color |
|---|---|---|---|
| **Iron** | 0 – 99 | 1.0x | Gray |
| **Bronze** | 100 – 299 | 1.2x | Bronze |
| **Silver** | 300 – 599 | 1.5x | Silver |
| **Gold** | 600 – 999 | 2.0x | Gold |
| **Platinum** | 1,000 – 1,499 | 2.5x | Teal |
| **Diamond** | 1,500+ | 3.0x | Purple |

**Monthly Points Decay**: At the end of each season (month), all players' cumulative points are multiplied by **0.8x**. This prevents inactive players from holding high ranks indefinitely and ensures the leaderboard reflects recent performance. A Diamond player (1,500 pts) who skips one month drops to 1,200 (Platinum); two months of inactivity drops them to 960 (Gold).

### Prize Distribution

**Regular Match (500 USDT per match):**

| Rank | Prize | Count | Subtotal |
|---|---|---|---|
| 1st | 55 USDT | 1 | 55 |
| 2nd | 35 USDT | 1 | 35 |
| 3rd | 25 USDT | 1 | 25 |
| 4th–5th | 15 USDT | 2 | 30 |
| 6th–10th | 10 USDT | 5 | 50 |
| 11th–20th | 6 USDT | 10 | 60 |
| 21st–50th | 4 USDT | 30 | 120 |
| 51st–100th | 2.5 USDT | 50 | 125 |
| **Total** | | **100** | **500 USDT** |

**Grand Final (2,500 USDT):**

| Rank | Prize | Count | Subtotal |
|---|---|---|---|
| Champion | 300 USDT | 1 | 300 |
| 2nd | 200 USDT | 1 | 200 |
| 3rd | 150 USDT | 1 | 150 |
| 4th–5th | 100 USDT | 2 | 200 |
| 6th–10th | 60 USDT | 5 | 300 |
| 11th–20th | 35 USDT | 10 | 350 |
| 21st–50th | 15 USDT | 30 | 450 |
| 51st–100th | 11 USDT | 50 | 550 |
| **Total** | | **100** | **2,500 USDT** |

**Prize Eligibility**: A minimum of **5 completed trades** per match is required to qualify for prizes and season points. This prevents single-trade luck from dominating results while keeping the barrier low enough for genuine participants.

### Match Points & Grand Final Qualification

Each regular match awards season points based on final ranking. Points accumulate across the month, and the top 500 players by total points qualify for the grand final.

| Rank Range | Points | Design Intent |
|---|---|---|
| 1st | 100 | Clear advantage for champions |
| 2nd–3rd | 70 | Podium has significant value |
| 4th–10th | 50 | Top 10 is the first psychological line |
| 11th–50th | 30 | Core players, steady point source |
| 51st–100th | 15 | Some points, creates chase motivation |
| 101st–300th | 5 | Participation accumulates over time |
| 301st–1000th | 0 | Must improve to accumulate |

### Quant Bot (AlphaEngine v3)

A quantitative trading bot competes alongside human players, displayed with a robot icon in all leaderboards. The bot's dedicated showcase section on the landing page displays:

- **Equity curve** with real-time performance tracking
- **Core metrics**: Total return, Sharpe ratio, max drawdown, win rate
- **Human vs. Bot comparison table**: Side-by-side performance metrics
- **Recent trades and current positions**

The bot data is currently mock-generated and designed to be replaced with live API data from the actual quantitative system.

### Psychological Pressure Mechanics

The **Rank Anxiety Strip** at the bottom of the trading interface provides constant competitive pressure through real-time indicators: current rank, distance to prize zone, number of recent overtakes, and crowding near the promotion line. A live scrolling feed shows ranking events (overtakes, promotions, rank volatility) with red flash effects.

The **Competition Notifications** panel is a draggable, closeable floating window that delivers alerts about rank changes, milestone achievements, and competitive events. It can be repositioned anywhere on screen and minimized to a bell icon.

### Public Landing Page

The landing page is a public-facing portal (no login required) featuring:

- **Hero section** with live match status and participant count
- **Rules overview** — 6 core rules presented as visual cards
- **Prize structure** — Regular match and grand final prize tables
- **Dual leaderboards** — Current match (sorted by return %) and season total (sorted by cumulative points)
- **Rank tier progression** — Visual display of all 6 tiers with leverage and points decay info
- **Quant bot showcase** — AlphaEngine performance dashboard
- **Call-to-action** — Direct entry to the competition

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
│       │   ├── LandingPage.tsx       # Public landing page (rules, leaderboards, bot)
│       │   ├── LoginPage.tsx         # Competition entry screen
│       │   ├── RulesPage.tsx         # Quick-start rules guide (single card)
│       │   └── TradingPage.tsx       # Main trading arena layout
│       ├── components/
│       │   ├── CandlestickChart.tsx  # TradingView Lightweight Charts
│       │   ├── OrderBookPanel.tsx    # Bid/ask depth display (grid layout)
│       │   ├── TradingPanel.tsx      # Order entry with leverage display
│       │   ├── StatusBar.tsx         # Top bar with account metrics
│       │   ├── TickerBar.tsx         # 24h price statistics
│       │   ├── NewsTicker.tsx        # Scrolling news headline bar
│       │   ├── ChatRoom.tsx          # Simulated trader chat
│       │   ├── Leaderboard.tsx       # Full ranking table (with bot icon)
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
├── docs/
│   └── Trading_Arena_v4.1.docx      # Full competition design document
├── server/                           # Placeholder (static-only project)
├── shared/                           # Shared constants
├── README.md
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

## User Flow

```
Landing Page (public)
    │
    ├── Browse rules, leaderboards, bot stats
    │
    └── Click "进入竞技场" (Enter Arena)
            │
            ├── Login Page → Enter username
            │
            ├── Rules Quick Guide → Confirm 6 core rules
            │
            └── Trading Arena → 24h competition
                    ├── Candlestick chart (5 timeframes)
                    ├── Order book (real-time depth)
                    ├── Trading panel (buy/sell with leverage)
                    ├── Right sidebar (Chat/Trades/Rank/Stats/News)
                    ├── Rank anxiety strip (bottom)
                    └── Competition notifications (draggable)
```

---

## Design Philosophy

The visual design follows an **"Obsidian Exchange"** aesthetic — a fusion of professional crypto exchange interfaces with esports arena energy:

- **Dark-first palette**: Deep backgrounds (`#0B0E17`, `#141722`) with Binance-inspired accents — gold (`#F0B90B`), green (`#0ECB81`), red (`#F6465D`).
- **Information density**: The trading interface maximizes data visibility within a single viewport. Every pixel serves a purpose during active trading.
- **Psychological tension**: Real-time rank changes, overtake notifications, and proximity-to-prize indicators create constant competitive pressure — this is a deliberate data collection mechanism.
- **Monospace precision**: All numerical data uses monospace fonts for alignment. Display typography provides visual hierarchy.

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
    ├── Leverage application (tier-based)
    ├── Prize eligibility check (min 5 trades)
    ├── Season points tracking
    └── Account state (equity, P&L, rank, tier)

    ↓

UI Components
    ├── CandlestickChart (TradingView Lightweight Charts)
    ├── OrderBookPanel (grid-aligned depth display)
    ├── TradingPanel (order entry + leverage badge)
    ├── StatusBar (account metrics + rank tier)
    ├── RankAnxietyStrip (competitive pressure)
    └── Right Sidebar (Chat/Trades/Rank/Stats/News)
```

---

## Configuration

### Changing the Trading Pair

To switch from SOL/USDT to another pair, update the constants in `client/src/hooks/useBinanceWS.ts`:

```typescript
const SYMBOL = 'BTCUSDT';      // Change to desired symbol
const SYMBOL_LC = 'btcusdt';   // Lowercase version for WebSocket streams
```

Also update references in `OrderBookPanel.tsx` (column header), `TickerBar.tsx`, and `TradingPage.tsx`.

### Adjusting Game Parameters

Key parameters are defined in `client/src/lib/types.ts`:

```typescript
// Rank tiers — points thresholds and leverage
export const RANK_TIERS = [
  { name: 'iron',     minPoints: 0,    leverage: 1.0 },
  { name: 'bronze',   minPoints: 100,  leverage: 1.2 },
  { name: 'silver',   minPoints: 300,  leverage: 1.5 },
  { name: 'gold',     minPoints: 600,  leverage: 2.0 },
  { name: 'platinum', minPoints: 1000, leverage: 2.5 },
  { name: 'diamond',  minPoints: 1500, leverage: 3.0 },
];

// Monthly points decay factor
export const POINTS_DECAY_FACTOR = 0.8;

// Minimum trades per match for prize eligibility
export const MIN_TRADES_FOR_PRIZE = 5;
```

---

## Implementation Roadmap

The project is designed for three-phase migration to production:

**Phase 1 — Core Competition Engine (Weeks 1–4)**
Server-side trading engine, position management, weighted P&L, server-side price validation via independent Binance WebSocket, fixed prize pool distribution, points system, and grand final qualification logic.

**Phase 2 — Anti-Cheat Infrastructure (Weeks 3–6)**
Device fingerprinting, IP correlation graph, behavioral detection batch processing (position correlation, time synchronization, open/close pairing, size mirroring), and review dashboard.

**Phase 3 — Engagement & Growth (Weeks 5–8)**
Grand final qualification tracker, badge and achievement system, cheat reporting interface, post-match trading analysis reports, and tier progression system.

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
- **Framer Motion** — Animation library for landing page and UI transitions
