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
