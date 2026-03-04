# Trading Arena TODO

## Completed (Previous Sessions)
- [x] Public landing page (LandingPage.tsx) with Hero, rules, dual leaderboards, quant bot showcase
- [x] LoL-style tier system: Iron/Bronze/Silver/Gold/Platinum/Diamond with leverage 1x-3x
- [x] Leverage integrated into P&L calculations and UI display
- [x] Minimum 5 trades per match for prize eligibility
- [x] Monthly point decay (×0.8) as demotion mechanism
- [x] Updated all rules across components to reflect v4.1 design document
- [x] Changed trading pair from BTC/USDT to SOL/USDT with live Binance data
- [x] Enhanced UI: draggable/closable notification panel, pulsing Next button, bordered tabs
- [x] Updated branding to "Varsity Tech"
- [x] Created comprehensive README.md
- [x] Added design document to docs/ folder
- [x] Synced code to GitHub
- [x] Pulled server-side architecture from GitHub (SQLite + Express API)
- [x] Upgraded to web-db-user template

## Current: Resolve Template Upgrade Conflicts
- [x] Add getUserByOpenId and upsertUser exports to server/db.ts (required by _core/sdk.ts)
- [x] Register custom arena API routes in _core/index.ts Express app
- [x] Fix App.tsx to use custom screen-based routing with tRPC provider wrapper
- [x] Remove better-sqlite3 dependency, migrate arena engine to use MySQL/Drizzle
- [x] Add arena tables to drizzle/schema.ts (matches, positions, trades, etc.)
- [x] Fix all TypeScript errors
- [x] Write vitest tests for key server functionality
- [x] Test full integration between frontend and backend
- [x] Save checkpoint

## Mobile Portrait Layout Redesign
- [x] Audit current mobile layout issues across all pages
- [x] Write mobile layout redesign proposal document (design only, no code changes)
- [x] Deliver proposal to user

## Data Reset
- [x] Reset all user data in database (truncate all arena tables)

## Mobile Trading Page Optimization
- [x] Audit current TradingPage layout and device detection
- [x] Use existing useIsMobile hook for responsive device detection
- [x] Create MobileToolbarOverlay component (floating overlay for Chat/Rank/Stats/News/Trades)
- [x] Create MobileStatusBar component (compact 2-row status)
- [x] Create MobileTradingPanel component (vertical stacked trade controls)
- [x] Create MobileOrderBook component (compact horizontal layout)
- [x] Modify TradingPage to detect mobile and render mobile layout
- [x] Add Chart/OrderBook/Info tab switching for mobile main content area
- [x] Test on mobile viewport and fix issues (TypeScript 0 errors, vitest 20 pass)
- [x] Run vitest tests (20 passed)

## Always Start on Landing Page with Quick Login
- [x] Remove auto-restore session to trading page on app load
- [x] Always show Landing Page on first visit
- [x] Remember username in localStorage for quick re-entry (already stored in localStorage)
- [x] Show "Welcome back, xxx" quick login option on Landing/Login page (LoginPage already has Returning Player tab with pre-filled username)
- [x] Test the new flow end-to-end (tsc 0 errors, vitest 20 passed)

## Fix TradingPanel Overlapping Layout
- [x] Investigate overlapping elements in TradingPanel bottom bar (StatusBar, input, toggle, slider, buttons)
- [x] Fix the layout overlap issue
- [x] Test and verify the fix (tsc 0 errors, vitest 20 passed)

## Fix Slider Thumb Overlapping USDT/SOL Toggle
- [x] Fix vertical overlap between Slider thumb and USDT/SOL toggle button in TradingPanel

## Hide Number Input Spinners
- [x] Hide browser default up/down arrows on number inputs in TradingPanel

## TP/SL System Redesign
- [x] Audit current TP/SL implementation (backend engine, TradingPanel, CandlestickChart)
- [x] Write comprehensive TP/SL design proposal (chart double-click, price/percentage modes, adjust/cancel)
- [x] Deliver design proposal to user

## TP/SL System Implementation
- [x] Backend: Adjust setTpSl API to support partial updates (undefined = keep existing)
- [x] Backend: Adjust useArena hook to support independent setTp/setSl
- [x] Frontend: Order entry TP/SL with price/percentage dual mode + quick buttons
- [x] Frontend: Position view independent TP/SL edit/cancel
- [x] Frontend: Chart double-click to set TP/SL with confirmation popover
- [x] Frontend: Mobile long-press (600ms) as alternative to double-click for chart TP/SL
- [x] Frontend: Wire up data flow in TradingPage (desktop + mobile)
- [x] Frontend: Update MobileTradingPanel with same TP/SL improvements
- [x] Test all flows: tsc 0 errors, vitest 20 passed

## Fix Trading Page Errors
- [x] Investigate all error sources (logs, TS, browser console)
- [x] Fix poll query SQL error (MySQL only_full_group_by + Drizzle column reference mismatch)
- [x] Fix identified errors - switched to raw db.execute() for poll aggregation
- [x] Run tests and verify fixes (21 tests passed, 0 red error banner on trading page)
