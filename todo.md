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

## Landing Page Information Architecture Restructure
- [x] Audit current 10 sections and decide which to keep/merge/move
- [x] Simplify LandingPage to 6 sections: Hero → Competitions → HowItWorks → Highlights(merged) → Leaderboard → CTA+Footer
- [x] Created HighlightsSection merging Rules/Prize/Tier into 3 compact cards with link to /rules
- [x] Update navbar "探索" dropdown links to match new section anchors

## AI Arena Layout Optimization (Esports Live UI)
- [x] Compress AI Arena header info into a single compact bar
- [x] Make equity chart the dominant visual element (50%+ width)
- [x] Redesign layout to feel like an esports live broadcast
- [x] Verify both Landing Page and AI Arena look correct in browser

## Optimize CompetitionShowcase, FAQ, and Rules Modules
- [x] Remove "最多40笔交易" / trade count upper limit references (i18n zh+en, HighlightsSection)
- [x] Change minimum trades to 4 for humans (was 5) (i18n zh+en, HighlightsSection, RulesPage)
- [x] Audit and optimize CompetitionShowcase: fix developer copy, English-mixed text, add lang-aware labels
- [x] Audit and optimize FAQ: fix invite code → registration, fix trade count references
- [x] Audit and optimize Rules/HighlightsSection: updated trade rules text
- [x] Fix Footer: broken #faq and #rules anchors → /rules route links

## Bug Fix: recharts LineEndpointDot key prop spread warning
- [x] Fix React key prop spread warning from recharts LineEndpointDot on landing page (/)

## Landing Page Round 2 Fixes
- [x] Slim down CompetitionShowcase left card: removed 2x2 info grid + progress bar, replaced with single-row key stats
- [x] Fix HighlightsSection "查看完整规则" - moved from standalone link to integrated button inside Rules card
- [x] Restore FAQ section to Landing Page (FAQSection component already existed, re-added to LandingPage between Leaderboard and CTA)
- [x] Update prize withdrawal rule: "每参加3次比赛可提取一次奖金，循环往复" - updated 10 i18n strings (zh+en): land.rules.card6, hub.prizeEligibility/Settlement, profileEdit.wallet*, land.faq.q4/a4

## CompetitionShowcase Redesign (Round 3)
- [x] Redesign competition cards: show only type (Human vs Human / Agent vs Agent), trading pair, start time, prize pool (only if > 0), registration progress (only if open)
- [x] Differentiate card states: registration_open shows progress bar, live shows distinct visual (pulsing Radio icon, green accent)
- [x] Remove completed competitions from landing page showcase (only show live + upcoming)
- [x] Add "Past Competitions" (往期比赛) nav entry in LandingNavbar + create PastCompetitionsPage + route in App.tsx
- [x] Make "View Details" (查看详情) link to dedicated /competitions/:slug page (public, no auth required) + added login prompt for unauthenticated users
- [x] Remove left panel from CompetitionShowcase (pure card grid/carousel layout)
- [x] Update subtitle to not mention completed count
- [x] Add i18n strings for new elements (loginToRegister zh+en)

## Round 4: Horizontal Card Layout + Rich Competition Detail
- [x] Add DB fields: coverImage (already existed), description (already existed), rulesDetail (added) to competitions table
- [x] Update API to return new fields (description added to public list + hub list; detail endpoint already returns ...comp spread)
- [x] Redesign CompetitionShowcase: horizontal full-width cards (left text + right image), max 3 visible, vertical scroll for overflow
- [x] Default placeholder: show trading pair logo (SOL) when no coverImage — uploaded to CDN
- [x] Enrich CompetitionDetailPage: show coverImage as hero, render description (Markdown), display rulesDetail section, prize breakdown table
- [x] Update PastCompetitionsPage cards to match new horizontal layout

## Round 5: Withdrawal Progress, History, Agent FAQ, AI Spectator Discussion
- [x] Add withdrawal progress indicator (●●○ 3/3) to Hub page showing competitions until next withdrawal
- [x] Add withdrawal history list to ProfileEditPage wallet section (empty state placeholder with i18n)
- [x] Add Agent FAQ entry to landing page FAQ section (q7/a7 zh+en, FAQSection updated to 7 items)
- [x] Deep-think and discuss AI spectator feature design with user (chose social spectator: viewer count + emoji reactions)

## Round 5b: Social Spectator Features
- [x] Add server-side API for viewer count tracking (heartbeat-based)
- [x] Add server-side API for emoji reactions (POST + GET recent)
- [x] Display live viewer count in AgentSpectatorSection InfoBar
- [x] Build emoji reaction bar (selectable emoji buttons)
- [x] Build floating emoji animation component (emojis float up over chart area)
- [x] Integrate reaction bar and floating emojis into AgentSpectatorSection
- [x] Add i18n strings for viewer count and reactions (inline in components)

## Round 6: Human vs AI Duel Dashboard (replace /ai-arena)
- [x] Add duelPairId field to competitions table in DB schema + migration pushed
- [x] Create server API endpoint /api/public/duel-dashboard for paired Human vs AI data (avg fund curves, stats, top 10 each side) + /api/public/duel-chat
- [x] Rewrite AgentSpectatorSection as HumanVsAI duel dashboard with: duel banner, dual avg fund curves (blue vs gold), comparison stats cards, dual Top 10 leaderboards
- [x] Replace agent-only chat with public chat room (humans + agents can both post)
- [x] Update nav text: "围观AI比赛" → "围观人类 vs AI" (in LandingNavbar + HubPage)
- [x] Keep emoji reaction bar and floating animation
- [x] Update i18n strings for new dashboard (inline in HumanVsAIDashboard component)

## Round 6b: Create Duel Test Data
- [x] Create a pair of live competitions (one human, one agent) with matching duelPairId (comp 90003 human + comp 300001 agent, duelPairId=1)
- [x] Verify duel dashboard API returns active data with stats and curves
- [x] Verify frontend renders the full duel dashboard UI

## Round 6c: Duel Chat Fixes
- [x] Shorten chat box height (700px → 420px, max 520px on xl)
- [x] Allow logged-in humans to send messages in duel chat (already working, updated hint text)
- [x] Chat content lifecycle: messages tied to competitionId, only fetched for active duel pair
- [x] Make chat panel height match chart area height (grid items-stretch)
- [x] Fix chart+chat grid: chart area defines row height, chat stretches to match (no empty space below emoji bar)
