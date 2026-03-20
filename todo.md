# Trading Arena TODO

## v2.0 Implementation ✅ Complete (2026-03-04)

### Phase 0: Infrastructure Foundation ✅
- [x] Drizzle schema: 8 new tables (seasons, competitions, competition_registrations, match_results, notifications, user_achievements, institutions, user_profiles)
- [x] Modified tables: arenaAccounts +role, positions +competitionId, chatMessages +competitionId
- [x] Shared types: competitionTypes.ts (CompetitionStatus, HubData, etc.)
- [x] AuthContext: extracted token/login/logout from App.tsx to context
- [x] Wouter routing: replaced useState state machine with 25-route wouter setup
- [x] AppShell: global nav bar (desktop top + mobile bottom tab bar)
- [x] NotificationBell: nav bar bell icon + dropdown panel
- [x] 18 stub pages → all implemented with real API calls

### Phase 1: Core Competition Flow ✅
- [x] competition-db.ts: 34 DB helper functions
- [x] CompetitionEngine: lifecycle state machine (tick, start, settle, register, review)
- [x] competition-routes.ts: ~25 API endpoints (public, user, admin)
- [x] ArenaEngine: legacyAutoRotate flag (backward compatible)
- [x] competition-api.ts: frontend API client functions
- [x] Server integration: routes registered in server/index.ts

### Phase 2: Settlement & History ✅
- [x] SettlementOverlay: framer-motion animated full-screen overlay
- [x] ResultsPage: podium + my result + full leaderboard table
- [x] MatchHistoryPage: expandable cards with trade details + close reason icons

### Phase 3: User Profile & Institutions ✅
- [x] profile-routes.ts: GET/PUT /api/me/profile, institution search/create
- [x] ProfilePage: dashboard with tier badge, country flag, institution, stats grid
- [x] ProfileEditPage: full form with institution search autocomplete
- [x] PublicProfilePage: read-only view of other users

### Phase 4: Notifications ✅
- [x] useNotifications hook: polling every 30s
- [x] NotificationBell: bell icon + badge + dropdown
- [x] NotificationsPage: full list with read/unread, mark all read
- [x] Server-side notification triggers in CompetitionEngine

### Phase 5: Trading Analytics ✅
- [x] analytics-routes.ts: comprehensive aggregation API
- [x] AnalyticsPage: equity curve, PnL distribution, direction analysis, close reason pie, hourly heatmap, hold duration scatter (all recharts)

### Phase 6: Geographic & Institutional Stats ✅
- [x] stats-routes.ts: overview, countries, institutions APIs
- [x] StatsOverviewPage: 6 stats cards + country ranking + institution ranking
- [x] InstitutionStatsPage: sortable list with expandable details

### Phase 7: Achievements + Admin ✅
- [x] achievements.ts: 24 achievement definitions (5 categories)
- [x] AchievementsPage: grid display with locked/unlocked state + progress bar
- [x] LeaderboardPage: multi-tab (current + season)
- [x] Admin CompetitionsPage: full management with status-based actions
- [x] Admin CompetitionFormPage: create/edit with all fields
- [x] Admin RegistrationsPage: review table with batch actions
- [x] Admin SeasonsPage: create + list
- [x] HubPage: 4-state hero + season progress + registrations + recent results + quick stats

---

## v1.0 Implementation ✅ Complete (Earlier)

- [x] Public landing page with Hero, rules, dual leaderboards, quant bot showcase
- [x] LoL-style tier system: Iron/Bronze/Silver/Gold/Platinum/Diamond
- [x] Server-authoritative trading engine (ArenaEngine)
- [x] Binance SOL/USDT live data (WebSocket + REST)
- [x] Log-sigmoid hold duration weight: weight(t) = 0.5 + 0.6/(1+(300/t)^1.5)
- [x] TP/SL system with chart double-click
- [x] Mobile responsive layout
- [x] i18n (Chinese/English)
- [x] Chat room, predictions, polls
- [x] Achievements (frontend-only in v1)
- [x] MySQL + Drizzle ORM migration from SQLite

---

## v2.1 Registration Flow Redesign ✅ Complete (2026-03-06)
- [x] Replace invite code with email field in registration
- [x] Rename "Username" labels to "Nickname" (昵称) throughout UI and i18n
- [x] Add registration confirmation dialog (AlertDialog showing email + masked password)
- [x] Add real-time nickname uniqueness check (debounced 500ms, POST /api/auth/check-username)
- [x] Add password visibility toggle (Eye/EyeOff icon) on both registration and login forms
- [x] Add `email` column to `arena_accounts` schema (varchar 128)
- [x] Update server: registerSchema (email validation), engine.register(), checkUsernameAvailable()
- [x] Update client: api.ts, AuthContext, LoginPage, i18n (zh + en)
- [x] Update all documentation (README, API-REFERENCE, SYSTEM_DESIGN_V2, status-notes)

## Next Steps (Post v2.1)
- [ ] `pnpm db:push` — migrate schema to database (email column)
- [ ] Set first admin: `UPDATE arena_accounts SET role='admin' WHERE username='xxx'`
- [ ] Create first season + competition for end-to-end testing
- [ ] i18n: add ~200 translation keys for new pages
- [ ] Code splitting with React.lazy for page components
- [ ] Email/Push notification integration (optional)
- [ ] Achievement engine: server-side detection on match settlement
- [ ] Observation/spectator mode for non-participants watching live competitions
- [ ] Share competition results as image cards

## Fix Production Deployment Failure
- [x] Fix JWT_SECRET: derive 64-char key via HMAC-SHA256 when secret is <32 chars (no longer throws in production)
- [x] Fix DB migration: manually marked 0007_perfect_weapon_omega as applied (columns already existed)
- [x] Clear TS cache: all 24 TS errors resolved (Drizzle type cache stale)
- [x] Restart dev server: running normally
- [x] Tests: 21 passed, tsc 0 errors
- [ ] Redeploy via Publish button

## Database Schema Sync
- [x] Run pnpm db:push to sync coverImageUrl column to remote database
- [x] Verify SQL error "Unknown column 'coverimageurl'" is resolved (column already existed in DB, restart cleared stale connection cache)

## Database Reset
- [x] Sync latest GitHub changes (84b0d11 - CompetitionShowcase upgrade)
- [x] Clear all user data from all 17 tables (TRUNCATE with FK checks disabled)
- [x] Verify database is clean (all tables 0 rows) and server runs correctly

## Email Column Migration
- [x] Sync latest GitHub changes (675f4f8 - email registration flow)
- [x] Run npx drizzle-kit generate to generate migration for email column (0009_real_madripoor.sql)
- [x] Run drizzle-kit migrate to apply migration to database
- [x] Verify email column exists (varchar 128) and server runs correctly

## Admin Account Creation
- [x] Create admin account (Louis123) in arena_accounts — id=1, role=admin, email=admin@genfi.world

## Trading Page Layout Refactor
- [x] Simplify StatusBar: keep only Home + Language (left) + Countdown timer (center), remove all other metrics
- [x] Remove season progress mini bar (StatusBar row 2)
- [x] Move RankAnxietyStrip info into Leaderboard tab as a summary card at top
- [x] Remove RankAnxietyStrip from TradingPage bottom
- [x] TradingPanel: change "Available" to "Equity" with PnL% display (e.g. 5,230.5U (+4.6%))
- [x] Apply equivalent changes to mobile layout (MobileStatusBar simplified, MobileTradingPanel equity+pnl%)

## Rank Snapshot & Countdown Improvements
- [x] Change rankSnapshot refresh interval from 5s to 5min (300s)
- [x] Redesign StatusBar countdown timer to be larger, more prominent and visually interesting
- [x] Apply equivalent countdown redesign to MobileStatusBar

## TradingView Indicator Integration
- [x] Analyze current chart implementation (lightweight-charts v5, adding indicators on top)
- [x] Replace lightweight-charts with TradingView free Advanced Chart Widget
- [x] Ensure widget shows Binance perpetual data with built-in indicators (BINANCE:SYMBOL.P format)
- [x] TP/SL handled by TradingPanel (chart TP/SL overlay removed since widget is iframe)

## Indicator System (lightweight-charts)
- [x] Rollback to lightweight-charts CandlestickChart with TP/SL interaction
- [x] Create indicator calculation library (13 indicators)
- [x] Overlay indicators: MA, EMA, BOLL, SAR, AVL, SUPER
- [x] Sub-chart indicators: VOL, MACD, RSI, KDJ, OBV, WR
- [x] Indicator settings UI with editable parameters (like TradingView)
- [x] Wire indicators into CandlestickChart (TradingPage already uses kline data)

## Sub-chart Indicator Display Fix
- [x] Fix sub-chart indicators (VOL, RSI, MACD, etc.) not displaying — removed duplicate ResizeObserver, used requestAnimationFrame for initial sizing

## Multi-Subchart & Crosshair Sync
- [x] Support multiple simultaneous subchart indicators (VOL + RSI + MACD etc.)
- [x] Auto-distribute subchart heights based on number of active subcharts (1=25%, 2=17%, 3=14%, 4=12%)
- [x] Synchronize crosshair (vertical line) between main chart and all subcharts via setCrosshairPosition API

## Crosshair Sync Fix & Subchart Limit
- [x] Fix crosshair synchronization — hybrid approach: CSS overlay dashed line + setCrosshairPosition with cached series data for native crosshair on subcharts
- [x] Add max 4 subchart limit with toast notification when user tries to enable 5th

## News Module Not Displaying
- [x] Investigate why news is not showing in the trading arena
- [x] Fix the root cause and verify news displays correctly
- Root cause: Server was running old code with limit<=20 validation, while frontend requested limit=50. Server restart loaded updated code (limit<=50). News now displays correctly: 50 Chinese-translated articles in both NewsTicker (scrolling bar) and NewsFeed (panel), with article detail view and sentiment labels working.

## Agent Competition Demo Data
- [x] Investigate DB schema for competitions, agent profiles, and related tables
- [x] Create an Agent vs Agent competition (live or upcoming)
- [x] Create fake agent accounts with profiles (names, descriptions, avatars)
- [x] Populate fake trades, positions, and PnL data for agents
- [x] Populate fake chat messages from agents
- [x] Verify AgentSpectatorSection and competition pages display the data correctly

## Bug Fix: agentCurves is not iterable
- [x] Fix TypeError: showcaseQuery.data.agentCurves is not iterable in AgentSpectatorSection on /ai-arena
- Root cause: Server was running stale code that didn't include the agentCurves field in the API response. Server restart loaded the latest competition-routes.ts which returns agentCurves with 48 agents (10 real + 38 synthetic).

## New 24h Agent Competition for AI Arena Showcase
- [x] Create a new 24h live Agent competition
- [x] Register agents into the competition
- [x] Populate realistic trading data and chat messages
- [x] Verify /ai-arena page displays the live competition correctly

## UI/UX Deep Audit (Non-Trading Pages)
- [x] Audit Landing Page (LandingPage)
- [x] Audit Hub Page
- [x] Audit AI Arena Page (/ai-arena)
- [x] Audit Agent Entry Page
- [x] Audit Rules/About/FAQ/Prizes/Leaderboard sections
- [x] Research competitive benchmarks
- [x] Produce comprehensive UI/UX analysis report with optimization proposals

## Quick Fix Round 1 (UI/UX Audit)
- [x] Fix #1: Replace developer-facing copy with user-facing copy (Hero subtitle, AI Arena descriptions)
- [x] Fix #2: Slim down navbar - group page anchor links into dropdown menu
- [x] Fix #3: Clean AI Arena leaderboard - remove repetitive "点击切换图表对比" text
- [x] Fix #4: Fix Rules page "欢迎 ，" username display issue
- [x] Fix #5: Add footer component (social links, legal, contact)
