# Trading Arena

> **24-Hour Crypto Trading Competition Platform** â€” A real-time, gamified trading arena built with React 19, featuring live Binance SOL/USDT market data, LoL-style rank tiers, fixed prize pools, and behavioral pressure mechanics designed for competitive trading at scale.

---

## Overview

Trading Arena is a **24-hour crypto trading competition simulator** where players compete using 5,000 USDT simulated capital on live Binance SOL/USDT market data. The platform runs a monthly tournament structure â€” 15 regular matches plus a grand final â€” with a fixed 10,000 USDT monthly prize budget. Rankings are determined by **Weighted P&L** (hold-duration-adjusted returns), and a cumulative **season points** system drives progression through six LoL-inspired rank tiers (Iron â†’ Diamond), each unlocking higher leverage multipliers.

The project now includes a **server-authoritative backend**:
- Session login and token auth (`/api/auth/login`)
- Server-side position lifecycle (open/close/TP/SL/match-end close)
- Persistent SQLite storage (`users`, `sessions`, `accounts`, `trades`, `chat_messages`, `behavior_events`)
- Real-time state sync endpoint (`/api/state`)
- Behavior event ingestion endpoint (`/api/events`)

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

The trading engine is now **server-authoritative** and persists all state in SQLite. Players can open long/short positions with configurable size, set take-profit and stop-loss levels, and manage a maximum of 40 trades per match. Only one position may be open at a time.

**Hold Duration Weighting** is the core mechanic that separates Trading Arena from simple P&L competitions. Every trade's profit or loss is multiplied by a weight based on how long the position was held:

| Hold Duration | Weight | Design Intent |
|---|---|---|
| < 1 minute | 0.2x | Heavy penalty â€” suppress noise trading |
| 1 â€“ 3 minutes | 0.4x | Moderate penalty â€” allow tactical trades |
| 3 â€“ 10 minutes | 0.7x | Light penalty â€” short conviction trades |
| 10 â€“ 30 minutes | 1.0x | Baseline â€” thoughtful trading |
| 30 min â€“ 2 hours | 1.15x | Reward â€” medium conviction holds |
| 2 â€“ 4+ hours | 1.3x | Maximum reward â€” high conviction positions |

A quick 30-second scalp earning +50 USDT only counts as +10 USDT (0.2x), while a 2-hour hold earning the same +50 USDT counts as +65 USDT (1.3x). This fundamentally changes trading behavior â€” players must balance conviction with risk management.

### Rank Tier System (LoL-Style)

Players progress through six rank tiers driven by **cumulative season points**. Each tier unlocks a higher leverage multiplier, allowing higher-ranked players to amplify their returns. Leverage is applied automatically to all P&L calculations â€” it is not a user-selectable option, but a reward earned through consistent performance.

| Rank Tier | Points Required | Leverage | Color |
|---|---|---|---|
| **Iron** | 0 â€“ 99 | 1.0x | Gray |
| **Bronze** | 100 â€“ 299 | 1.2x | Bronze |
| **Silver** | 300 â€“ 599 | 1.5x | Silver |
| **Gold** | 600 â€“ 999 | 2.0x | Gold |
| **Platinum** | 1,000 â€“ 1,499 | 2.5x | Teal |
| **Diamond** | 1,500+ | 3.0x | Purple |

**Monthly Points Decay**: At the end of each season (month), all players' cumulative points are multiplied by **0.8x**. This prevents inactive players from holding high ranks indefinitely and ensures the leaderboard reflects recent performance. A Diamond player (1,500 pts) who skips one month drops to 1,200 (Platinum); two months of inactivity drops them to 960 (Gold).

### Prize Distribution

**Regular Match (500 USDT per match):**

| Rank | Prize | Count | Subtotal |
|---|---|---|---|
| 1st | 55 USDT | 1 | 55 |
| 2nd | 35 USDT | 1 | 35 |
| 3rd | 25 USDT | 1 | 25 |
| 4thâ€“5th | 15 USDT | 2 | 30 |
| 6thâ€“10th | 10 USDT | 5 | 50 |
| 11thâ€“20th | 6 USDT | 10 | 60 |
| 21stâ€“50th | 4 USDT | 30 | 120 |
| 51stâ€“100th | 2.5 USDT | 50 | 125 |
| **Total** | | **100** | **500 USDT** |

**Grand Final (2,500 USDT):**

| Rank | Prize | Count | Subtotal |
|---|---|---|---|
| Champion | 300 USDT | 1 | 300 |
| 2nd | 200 USDT | 1 | 200 |
| 3rd | 150 USDT | 1 | 150 |
| 4thâ€“5th | 100 USDT | 2 | 200 |
| 6thâ€“10th | 60 USDT | 5 | 300 |
| 11thâ€“20th | 35 USDT | 10 | 350 |
| 21stâ€“50th | 15 USDT | 30 | 450 |
| 51stâ€“100th | 11 USDT | 50 | 550 |
| **Total** | | **100** | **2,500 USDT** |

**Prize Eligibility**: A minimum of **5 completed trades** per match is required to qualify for prizes and season points. This prevents single-trade luck from dominating results while keeping the barrier low enough for genuine participants.

### Match Points & Grand Final Qualification

Each regular match awards season points based on final ranking. Points accumulate across the month, and the top 500 players by total points qualify for the grand final.

| Rank Range | Points | Design Intent |
|---|---|---|
| 1st | 100 | Clear advantage for champions |
| 2ndâ€“3rd | 70 | Podium has significant value |
| 4thâ€“10th | 50 | Top 10 is the first psychological line |
| 11thâ€“50th | 30 | Core players, steady point source |
| 51stâ€“100th | 15 | Some points, creates chase motivation |
| 101stâ€“300th | 5 | Participation accumulates over time |
| 301stâ€“1000th | 0 | Must improve to accumulate |

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
- **Rules overview** â€” 6 core rules presented as visual cards
- **Prize structure** â€” Regular match and grand final prize tables
- **Dual leaderboards** â€” Current match (sorted by return %) and season total (sorted by cumulative points)
- **Rank tier progression** â€” Visual display of all 6 tiers with leverage and points decay info
- **Quant bot showcase** â€” AlphaEngine performance dashboard
- **Call-to-action** â€” Direct entry to the competition

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 with TypeScript |
| **Styling** | Tailwind CSS 4 + shadcn/ui components |
| **Charts** | Lightweight Charts (TradingView) v5 |
| **Backend** | Express + TypeScript (server-authoritative) |
| **Database** | SQLite (`better-sqlite3`) |
| **Animations** | Framer Motion |
| **State** | React hooks + refs (no external state library) |
| **Data** | Binance WebSocket + REST API (public, no key required) |
| **Build** | Vite 7 |
| **Package Manager** | pnpm |

---

## Project Structure

```
trading-arena/
â”œâ”€â”€ client/
â”‚   â”œâ”€â”€ index.html                    # Entry HTML with Google Fonts
â”‚   â”œâ”€â”€ public/                       # Static assets (favicon, robots.txt)
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ App.tsx                   # Root component with screen routing
â”‚       â”œâ”€â”€ main.tsx                  # React entry point
â”‚       â”œâ”€â”€ index.css                 # Global styles & Tailwind theme
â”‚       â”œâ”€â”€ pages/
â”‚       â”‚   â”œâ”€â”€ LandingPage.tsx       # Public landing page (rules, leaderboards, bot)
â”‚       â”‚   â”œâ”€â”€ LoginPage.tsx         # Competition entry screen
â”‚       â”‚   â”œâ”€â”€ RulesPage.tsx         # Quick-start rules guide (single card)
â”‚       â”‚   â””â”€â”€ TradingPage.tsx       # Main trading arena layout
â”‚       â”œâ”€â”€ components/
â”‚       â”‚   â”œâ”€â”€ CandlestickChart.tsx  # TradingView Lightweight Charts
â”‚       â”‚   â”œâ”€â”€ OrderBookPanel.tsx    # Bid/ask depth display (grid layout)
â”‚       â”‚   â”œâ”€â”€ TradingPanel.tsx      # Order entry with leverage display
â”‚       â”‚   â”œâ”€â”€ StatusBar.tsx         # Top bar with account metrics
â”‚       â”‚   â”œâ”€â”€ TickerBar.tsx         # 24h price statistics
â”‚       â”‚   â”œâ”€â”€ NewsTicker.tsx        # Scrolling news headline bar
â”‚       â”‚   â”œâ”€â”€ ChatRoom.tsx          # Simulated trader chat
â”‚       â”‚   â”œâ”€â”€ Leaderboard.tsx       # Full ranking table (with bot icon)
â”‚       â”‚   â”œâ”€â”€ MiniLeaderboard.tsx   # Compact ranking widget
â”‚       â”‚   â”œâ”€â”€ MarketStats.tsx       # Statistics & analytics panel
â”‚       â”‚   â”œâ”€â”€ NewsFeed.tsx          # News list with sentiment
â”‚       â”‚   â”œâ”€â”€ TradeHistory.tsx      # Personal trade log
â”‚       â”‚   â”œâ”€â”€ RankAnxietyStrip.tsx  # Bottom ranking pressure bar
â”‚       â”‚   â”œâ”€â”€ CompetitionNotifications.tsx  # Draggable alert panel
â”‚       â”‚   â”œâ”€â”€ RecentTrades.tsx      # Market trade feed
â”‚       â”‚   â”œâ”€â”€ SocialBar.tsx         # Social metrics display
â”‚       â”‚   â””â”€â”€ ui/                   # shadcn/ui component library
â”‚       â”œâ”€â”€ hooks/
â”‚       â”‚   â”œâ”€â”€ useBinanceWS.ts       # Binance WebSocket/REST hooks
â”‚       â”‚   â””â”€â”€ useTrading.ts         # Trading engine & account state
â”‚       â”œâ”€â”€ lib/
â”‚       â”‚   â”œâ”€â”€ types.ts              # TypeScript type definitions
â”‚       â”‚   â”œâ”€â”€ mockData.ts           # Mock data generators
â”‚       â”‚   â””â”€â”€ utils.ts              # Utility functions
â”‚       â””â”€â”€ contexts/
â”‚           â””â”€â”€ ThemeContext.tsx       # Dark/light theme provider
â”œâ”€â”€ docs/
â”‚   â””â”€â”€ Trading_Arena_v4.1.docx      # Full competition design document
â”œâ”€â”€ server/                           # Placeholder (static-only project)
â”œâ”€â”€ shared/                           # Shared constants
â”œâ”€â”€ README.md
â””â”€â”€ package.json
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

### Run Production Server

```bash
pnpm build
NODE_ENV=production PORT=3000 node dist/index.js
```

Optional environment variables:

- `PORT`: server listen port (default `3000`)
- `DATABASE_PATH`: SQLite database path (default `./data/trading-arena.db`)
- `VITE_API_BASE`: frontend API base URL (default same-origin)

---

## User Flow

```
Landing Page (public)
    â”‚
    â”œâ”€â”€ Browse rules, leaderboards, bot stats
    â”‚
    â””â”€â”€ Click "è¿›å…¥ç«žæŠ€åœº" (Enter Arena)
            â”‚
            â”œâ”€â”€ Login Page â†’ Enter username
            â”‚
            â”œâ”€â”€ Rules Quick Guide â†’ Confirm 6 core rules
            â”‚
            â””â”€â”€ Trading Arena â†’ 24h competition
                    â”œâ”€â”€ Candlestick chart (5 timeframes)
                    â”œâ”€â”€ Order book (real-time depth)
                    â”œâ”€â”€ Trading panel (buy/sell with leverage)
                    â”œâ”€â”€ Right sidebar (Chat/Trades/Rank/Stats/News)
                    â”œâ”€â”€ Rank anxiety strip (bottom)
                    â””â”€â”€ Competition notifications (draggable)
```

---

## Design Philosophy

The visual design follows an **"Obsidian Exchange"** aesthetic â€” a fusion of professional crypto exchange interfaces with esports arena energy:

- **Dark-first palette**: Deep backgrounds (`#0B0E17`, `#141722`) with Binance-inspired accents â€” gold (`#F0B90B`), green (`#0ECB81`), red (`#F6465D`).
- **Information density**: The trading interface maximizes data visibility within a single viewport. Every pixel serves a purpose during active trading.
- **Psychological tension**: Real-time rank changes, overtake notifications, and proximity-to-prize indicators create constant competitive pressure â€” this is a deliberate data collection mechanism.
- **Monospace precision**: All numerical data uses monospace fonts for alignment. Display typography provides visual hierarchy.

---

## Data Flow Architecture

```
Binance Public API
    â”‚
    â”œâ”€â”€ WebSocket (Primary)
    â”‚   â””â”€â”€ BinanceWSManager (Singleton)
    â”‚       â”œâ”€â”€ Batched subscriptions (150ms debounce)
    â”‚       â”œâ”€â”€ Auto-reconnect with exponential backoff
    â”‚       â””â”€â”€ Max 5 connection attempts
    â”‚
    â””â”€â”€ REST API (Fallback)
        â””â”€â”€ Polling every 3-5 seconds when WS inactive

    â†“

React Hooks Layer
    â”œâ”€â”€ useBinanceKline()   â†’ KlineData[]
    â”œâ”€â”€ useBinanceTicker()  â†’ TickerData + priceDirection
    â”œâ”€â”€ useBinanceDepth()   â†’ OrderBook (bids/asks)
    â””â”€â”€ useBinanceTrades()  â†’ RecentTrade[]

    â†“

Server Engine (Express + SQLite)
    â”œâ”€â”€ Session auth + account bootstrap
    â”œâ”€â”€ Position management (open/close/TP/SL)
    â”œâ”€â”€ Hold duration weight and P&L settlement
    â”œâ”€â”€ Match rotation + points allocation
    â”œâ”€â”€ Chat + behavior event persistence
    â””â”€â”€ `/api/state` snapshot for frontend sync

    â†“

UI Components
    â”œâ”€â”€ CandlestickChart (TradingView Lightweight Charts)
    â”œâ”€â”€ OrderBookPanel (grid-aligned depth display)
    â”œâ”€â”€ TradingPanel (order entry + leverage badge)
    â”œâ”€â”€ StatusBar (account metrics + rank tier)
    â”œâ”€â”€ RankAnxietyStrip (competitive pressure)
    â””â”€â”€ Right Sidebar (Chat/Trades/Rank/Stats/News)
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
// Rank tiers â€” points thresholds and leverage
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

**Phase 1 â€” Core Competition Engine (Weeks 1â€“4)**
Server-side trading engine, position management, weighted P&L, server-side price validation via independent Binance WebSocket, fixed prize pool distribution, points system, and grand final qualification logic.

**Phase 2 â€” Anti-Cheat Infrastructure (Weeks 3â€“6)**
Device fingerprinting, IP correlation graph, behavioral detection batch processing (position correlation, time synchronization, open/close pairing, size mirroring), and review dashboard.

**Phase 3 â€” Engagement & Growth (Weeks 5â€“8)**
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

- **Binance** â€” Public market data API (WebSocket + REST)
- **TradingView** â€” Lightweight Charts library for candlestick rendering
- **shadcn/ui** â€” Component library foundation
- **Radix UI** â€” Accessible primitive components
- **Lucide** â€” Icon set used throughout the interface
- **Framer Motion** â€” Animation library for landing page and UI transitions

