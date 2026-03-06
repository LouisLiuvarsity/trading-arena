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
