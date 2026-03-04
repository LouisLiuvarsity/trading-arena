# Trading Arena

> **24-Hour Crypto Trading Competition Platform** — A real-time, gamified trading arena built with React 19, featuring live Binance SOL/USDT market data, LoL-style rank tiers, fixed prize pools, and behavioral pressure mechanics designed for competitive trading at scale.

---

## Overview

Trading Arena is a **24-hour crypto trading competition simulator** where players compete using 5,000 USDT simulated capital on live Binance SOL/USDT market data. The platform runs a monthly tournament structure — 15 regular matches plus a grand final — with a fixed 10,000 USDT monthly prize budget. Single-match rankings are determined by **return percentage (pnlPct)**, while the season leaderboard uses a **Season Rank Score** that combines cumulative match points with a trade quality multiplier based on average hold duration weight. A six-tier LoL-inspired rank system (Iron → Diamond) drives progression, each unlocking higher leverage multipliers.

The project includes a **server-authoritative backend**:
- Session login and token auth (`/api/auth/login`, `/api/auth/quick-login`)
- Server-side position lifecycle (open/close/TP/SL/match-end close)
- Persistent MySQL storage via Drizzle ORM (`users`, `arena_accounts`, `sessions`, `matches`, `positions`, `trades`, `chat_messages`, `behavior_events`, `predictions`)
- Real-time state sync endpoint (`/api/arena/state`)
- Behavior event ingestion endpoint (`/api/arena/events`)

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

The trading engine is **server-authoritative** and persists all state in MySQL via Drizzle ORM. Players can open long/short positions with configurable size, set take-profit and stop-loss levels, and manage a maximum of 40 trades per match. Only one position may be open at a time.

### Hold Duration Weight — Log-Sigmoid Continuous Function

**Hold Duration Weighting** is a core mechanic that adjusts trade PnL and drives the season quality multiplier. v4.2 replaced the previous discrete 6-bucket table with a **continuous log-sigmoid function**, eliminating boundary gaming and preserving natural trading behavior for data collection.

**Formula:**

```
weight(t) = 0.5 + 0.6 / (1 + (300 / t)^1.5)
```

**Parameters:** `W_MIN = 0.5`, `W_MAX = 1.1`, `T_MID = 300s (5 min)`, `K = 1.5`

| Hold Duration | Weight | Note |
|---|---|---|
| 10 seconds | 0.50x | Floor — noise trades |
| 30 seconds | 0.52x | Minimal suppression |
| 1 minute | 0.55x | Quick trades |
| 3 minutes | 0.69x | Tactical trades |
| 5 minutes | 0.80x | Midpoint |
| 10 minutes | 0.96x | Near baseline |
| 30 minutes | 1.07x | Medium conviction |
| 1 hour | 1.09x | Near ceiling |
| 2+ hours | 1.10x | Ceiling — high conviction |

**Design rationale:**
- **Narrow range (0.5x–1.1x)**: Prevents traders from distorting their exit timing to game the weight system, preserving authentic behavioral data for reverse alpha signal extraction.
- **Continuous function**: No discrete boundaries to exploit — players can't identify "just hold 1 more second to jump to the next tier".
- **Log-time axis**: Hold durations span 3 orders of magnitude (10s to 12h); log-sigmoid provides natural transitions across all ranges.

### Season Rank Score — Quality-Weighted Points

The season leaderboard combines cumulative match points with a **trade quality multiplier**:

```
Season Rank Score = Season Points × Average Hold Weight
```

Where `Average Hold Weight` is the arithmetic mean of `holdWeight` across all completed trades in the season.

**Example:**
- Player A (steady): 450 pts × 1.01 avg weight = **454.5** rank score
- Player B (scalper): 450 pts × 0.55 avg weight = **247.5** rank score

Same points, but the quality trader ranks nearly 2x higher. This rewards deliberate, conviction-driven trading.

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

Each regular match awards season points based on final ranking. Points accumulate across the month, and the top 500 players by **Season Rank Score** qualify for the grand final.

| Rank Range | Points | Design Intent |
|---|---|---|
| 1st | 100 | Clear advantage for champions |
| 2nd–3rd | 70 | Podium has significant value |
| 4th–10th | 50 | Top 10 is the first psychological line |
| 11th–50th | 30 | Core players, steady point source |
| 51st–100th | 15 | Some points, creates chase motivation |
| 101st–300th | 5 | Participation accumulates over time |
| 301st–1000th | 0 | Must improve to accumulate |

### Psychological Pressure Mechanics

The **Rank Anxiety Strip** at the bottom of the trading interface provides constant competitive pressure through real-time indicators: current rank, distance to prize zone, number of recent overtakes, and crowding near the promotion line. A live scrolling feed shows ranking events (overtakes, promotions, rank volatility) with red flash effects.

The **Competition Notifications** panel is a draggable, closeable floating window that delivers alerts about rank changes, milestone achievements, and competitive events. It can be repositioned anywhere on screen and minimized to a bell icon.

### Public Landing Page

The landing page is a public-facing portal (no login required) featuring:

- **Hero section** with live match status and participant count
- **Rules overview** — 6 core rules presented as visual cards
- **Prize structure** — Regular match and grand final prize tables
- **Dual leaderboards** — Current match (sorted by return %) and season total (sorted by season rank score)
- **Hold weight curve** — Visual display of the log-sigmoid weight function with sample data points
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
| **Backend** | Express + TypeScript (server-authoritative) |
| **Database** | MySQL + Drizzle ORM |
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
│   ├── public/                       # Static assets
│   └── src/
│       ├── App.tsx                   # Root component with screen routing
│       ├── main.tsx                  # React entry point
│       ├── index.css                 # Global styles & Tailwind theme
│       ├── pages/
│       │   ├── LandingPage.tsx       # Public landing page (rules, leaderboards, bot)
│       │   ├── LoginPage.tsx         # Competition entry screen
│       │   ├── RulesPage.tsx         # Quick-start rules guide
│       │   └── TradingPage.tsx       # Main trading arena layout (desktop + mobile)
│       ├── components/
│       │   ├── CandlestickChart.tsx  # TradingView Lightweight Charts
│       │   ├── OrderBookPanel.tsx    # Bid/ask depth display
│       │   ├── TradingPanel.tsx      # Desktop order entry with leverage display
│       │   ├── MobileTradingPanel.tsx # Mobile-optimized trading controls
│       │   ├── MobileStatusBar.tsx   # Compact 2-row mobile status
│       │   ├── MobileToolbarOverlay.tsx # Floating mobile menu
│       │   ├── MobileOrderBook.tsx   # Compact horizontal order book
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
│       │   ├── SocialBar.tsx         # Social metrics display
│       │   ├── AIChatBox.tsx         # AI trading assistant chat
│       │   └── ui/                   # shadcn/ui component library (90+)
│       ├── hooks/
│       │   ├── useArena.ts           # Arena state + trading operations
│       │   ├── useBinanceWS.ts       # Binance WebSocket/REST hooks
│       │   ├── useTrading.ts         # Client-side trading engine
│       │   └── useMobile.tsx         # Mobile detection
│       ├── lib/
│       │   ├── types.ts              # TypeScript type definitions + constants
│       │   ├── api.ts                # API request wrapper
│       │   ├── mockData.ts           # Mock data generators
│       │   └── utils.ts              # Utility functions
│       └── contexts/
│           └── ThemeContext.tsx       # Dark/light theme provider
├── server/
│   ├── index.ts                      # REST API route registration
│   ├── engine.ts                     # Core trading engine (ArenaEngine)
│   ├── db.ts                         # Database helpers (Drizzle ORM)
│   ├── market.ts                     # Binance market data service
│   ├── constants.ts                  # Game parameters & hold weight function
│   ├── routers.ts                    # tRPC routers
│   └── db.test.ts                    # Vitest tests
├── drizzle/
│   ├── schema.ts                     # Full database schema (9 tables)
│   ├── relations.ts                  # Schema relationships
│   └── meta/                         # Migration snapshots
├── shared/
│   ├── types.ts                      # Shared type definitions
│   └── _core/errors.ts              # Error classes
├── docs/
│   └── Trading_Arena_v4.2.docx       # Full competition design document
├── README.md
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- **pnpm** 10+
- **MySQL** database (with `DATABASE_URL` env var)

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

### Run Production Server

```bash
pnpm build
NODE_ENV=production PORT=3000 node dist/index.js
```

Required environment variables:

- `DATABASE_URL`: MySQL connection string (required)

Optional environment variables:

- `PORT`: server listen port (default `3000`)
- `VITE_API_BASE`: frontend API base URL (default same-origin)

---

## User Flow

```
Landing Page (public)
    │
    ├── Browse rules, leaderboards, bot stats
    │
    └── Click "进入竞技场" (Enter Arena)
            │
            ├── Login Page → New player (invite code + username) or Returning player (quick login)
            │
            ├── Rules Quick Guide → Confirm 6 core rules
            │
            └── Trading Arena → 24h competition
                    ├── Candlestick chart (5 timeframes)
                    ├── Order book (real-time depth)
                    ├── Trading panel (buy/sell with leverage)
                    ├── TP/SL system (price/percentage modes, chart double-click)
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
    ├── WebSocket (Primary — Client)
    │   └── BinanceWSManager (Singleton)
    │       ├── Batched subscriptions (150ms debounce)
    │       ├── Auto-reconnect with exponential backoff
    │       └── Max 5 connection attempts
    │
    └── REST API (Server — Price Feed)
        └── MarketService polling (1s ticker, 2s depth)

    ↓

React Hooks Layer
    ├── useBinanceKline()   → KlineData[]
    ├── useBinanceTicker()  → TickerData + priceDirection
    ├── useBinanceDepth()   → OrderBook (bids/asks)
    └── useBinanceTrades()  → RecentTrade[]

    ↓

Server Engine (Express + MySQL/Drizzle ORM)
    ├── Session auth + account bootstrap
    ├── Position management (open/close/TP/SL)
    ├── Hold duration weight (log-sigmoid) and P&L settlement
    ├── Match rotation + points allocation
    ├── Season rank score (points × avg hold weight)
    ├── Chat + behavior event persistence
    ├── Prediction system (hourly price direction)
    └── /api/arena/state snapshot for frontend sync

    ↓

UI Components
    ├── CandlestickChart (TradingView Lightweight Charts)
    ├── OrderBookPanel (grid-aligned depth display)
    ├── TradingPanel / MobileTradingPanel (order entry + weight display)
    ├── StatusBar / MobileStatusBar (account metrics + rank tier)
    ├── RankAnxietyStrip (competitive pressure)
    └── Right Sidebar (Chat/Trades/Rank/Stats/News)
```

---

## Implementation Roadmap

The project is designed for three-phase migration to production:

**Phase 1 — Core Competition Engine (Weeks 1–4)** ✅ Complete
Server-side trading engine, position management, log-sigmoid hold weight, server-side price validation via Binance REST, fixed prize pool distribution, points system, season rank score, TP/SL system, and grand final qualification logic.

**Phase 2 — Anti-Cheat Infrastructure (Weeks 3–6)**
Device fingerprinting, IP correlation graph, behavioral detection batch processing (position correlation, time synchronization, open/close pairing, size mirroring), and review dashboard.

**Phase 3 — Engagement & Growth (Weeks 5–8)**
Grand final qualification tracker, badge and achievement system, cheat reporting interface, post-match trading analysis reports, and tier progression visualization.

---

## v4.2 Changelog

- **Hold duration weight**: Discrete 6-bucket table → log-sigmoid continuous function `weight(t) = 0.5 + 0.6/(1+(300/t)^1.5)`, range narrowed from 0.2x–1.3x to 0.5x–1.1x
- **Season rank score**: New formula `seasonRankScore = seasonPoints × avgHoldWeight` combining points with trade quality
- **Rank system**: 3-tier promotion (Starter/Intermediate/Advanced) → 6-tier LoL-style (Iron→Diamond)
- **Database**: SQLite → MySQL + Drizzle ORM
- **Mobile**: Full responsive mobile trading interface with dedicated components

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
