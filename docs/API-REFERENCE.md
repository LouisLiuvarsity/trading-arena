# TRADING ARENA -- COMPLETE API REFERENCE

## Table of Contents

1. [Constants & Configuration](#1-constants--configuration)
2. [Shared Type Definitions](#2-shared-type-definitions)
3. [Competition Status State Machine](#3-competition-status-state-machine)
4. [All Zod Validation Schemas](#4-all-zod-validation-schemas)
5. [Rate Limiters](#5-rate-limiters)
6. [Endpoint Reference -- Public (No Auth)](#6-public-endpoints)
7. [Endpoint Reference -- Arena Auth (Bearer Token)](#7-arena-auth-endpoints)
8. [Endpoint Reference -- Legacy API (Bearer Token)](#8-legacy-api-endpoints)
9. [Endpoint Reference -- Competition System](#9-competition-system-endpoints)
10. [Endpoint Reference -- Profile & Institution](#10-profile--institution-endpoints)
11. [Endpoint Reference -- Analytics](#11-analytics-endpoints)
12. [Endpoint Reference -- Public Stats](#12-public-stats-endpoints)
13. [Endpoint Reference -- Admin](#13-admin-endpoints)
14. [Endpoint Reference -- tRPC Router](#14-trpc-router-endpoints)
15. [Endpoint Reference -- OAuth](#15-oauth-endpoints)
16. [Complete Response Shapes for Complex Endpoints](#16-complete-response-shapes)
17. [All Error Message Strings](#17-all-error-message-strings)

---

## 1. Constants & Configuration

**File:** `server/constants.ts`

| Constant | Value | Description |
|---|---|---|
| `SYMBOL` | `"SOLUSDT"` | Trading pair (from `shared/tradingPair.ts`) |
| `BASE_ASSET` | `"SOL"` | Base asset |
| `QUOTE_ASSET` | `"USDT"` | Quote asset |
| `STARTING_CAPITAL` | `5000` | Starting capital per match (USDT) |
| `SESSION_TTL_MS` | `604800000` (7 days) | Arena session lifetime |
| `MAX_TRADES_PER_MATCH` | `40` | Maximum trades allowed per match per user |
| `MIN_TRADES_FOR_PRIZE` | `5` | Minimum trades required for prize eligibility |
| `MATCH_DURATION_MS` | `86400000` (24 hours) | Duration of one match |
| `CLOSE_ONLY_SECONDS` | `1800` (30 minutes) | Close-only period at end of match |
| `FEE_RATE` | `0.0005` (0.05%) | Fee rate per side |
| `HOLD_WEIGHT_MIN` | `0.5` | Minimum hold duration weight |
| `HOLD_WEIGHT_MAX` | `1.1` | Maximum hold duration weight |
| `HOLD_WEIGHT_MID_SECONDS` | `300` (5 minutes) | Midpoint for hold weight sigmoid |
| `HOLD_WEIGHT_STEEPNESS` | `1.5` | Steepness of hold weight sigmoid |

**`COOKIE_NAME`** (from `shared/const.ts`): `"app_session_id"`
**`ONE_YEAR_MS`**: `31536000000`

### Hold Weight Formula

```
weight(t) = W_MIN + (W_MAX - W_MIN) / (1 + (T_MID / t)^K)
```
- If `seconds <= 0`, returns `HOLD_WEIGHT_MIN` (0.5).
- Result is rounded to 2 decimal places.

### Prize Table (`REGULAR_PRIZE_TABLE`)

| Rank Range | Prize (USDT) |
|---|---|
| 1 | 55 |
| 2 | 35 |
| 3 | 25 |
| 4-5 | 15 |
| 6-10 | 10 |
| 11-20 | 6 |
| 21-50 | 4 |
| 51-100 | 2.5 |
| 101+ | 0 |

### Match Points Table (`MATCH_POINTS_TABLE`)

| Rank Range | Points |
|---|---|
| 1 | 100 |
| 2-3 | 70 |
| 4-10 | 50 |
| 11-50 | 30 |
| 51-100 | 15 |
| 101-300 | 5 |
| 301-1000 | 0 |

### Rank Tiers (`RANK_TIERS`)

| Tier | Min Points | Max Points | Leverage |
|---|---|---|---|
| `"iron"` | 0 | 99 | 1x |
| `"bronze"` | 100 | 299 | 1.2x |
| `"silver"` | 300 | 599 | 1.5x |
| `"gold"` | 600 | 999 | 2x |
| `"platinum"` | 1000 | 1499 | 2.5x |
| `"diamond"` | 1500 | Infinity | 3x |

---

## 2. Shared Type Definitions

**File:** `shared/competitionTypes.ts`

### Enums

```typescript
type RankTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

type CompetitionStatus =
  | "draft" | "announced" | "registration_open" | "registration_closed"
  | "live" | "settling" | "completed" | "cancelled";

type CompetitionType = "regular" | "grand_final" | "special" | "practice";

type RegistrationStatus = "pending" | "accepted" | "rejected" | "waitlisted" | "withdrawn";
```

### Interfaces (full listing)

- `SeasonSummary` -- `{ id: number, name: string, slug: string, status: string, startDate: number, endDate: number, competitionCount: number, completedCount: number }`
- `CompetitionSummary` -- `{ id: number, slug: string, title: string, competitionNumber: number, competitionType: CompetitionType, status: CompetitionStatus, maxParticipants: number, registeredCount: number, acceptedCount: number, prizePool: number, symbol: string, startTime: number, endTime: number, registrationOpenAt: number | null, registrationCloseAt: number | null, myRegistrationStatus: RegistrationStatus | null }`
- `CompetitionDetail` extends `CompetitionSummary` with: `{ seasonId: number, description: string | null, startingCapital: number, maxTradesPerMatch: number, closeOnlySeconds: number, feeRate: number, requireMinSeasonPoints: number, requireMinTier: string | null, inviteOnly: boolean, participants: Array<{ username: string, rankTier: RankTier, seasonPoints: number, institutionName: string | null, country: string | null }> }`
- `MyRegistration` -- `{ competitionId: number, competitionTitle: string, competitionType: CompetitionType, status: RegistrationStatus, startTime: number, appliedAt: number }`
- `AdminRegistration` -- `{ id: number, competitionId: number, arenaAccountId: number, username: string, status: RegistrationStatus, seasonPoints: number, rankTier: RankTier, matchesPlayed: number, institutionName: string | null, country: string | null, appliedAt: number, reviewedAt: number | null }`
- `MatchResultSummary` -- `{ competitionId: number, competitionTitle: string, competitionNumber: number, finalRank: number, totalPnl: number, totalPnlPct: number, totalWeightedPnl: number, tradesCount: number, winCount: number, lossCount: number, pointsEarned: number, prizeWon: number, prizeEligible: boolean, participantCount: number, createdAt: number }`
- `MatchResultDetail` extends `MatchResultSummary` with: `{ bestTradePnl: number | null, worstTradePnl: number | null, avgHoldDuration: number | null, avgHoldWeight: number | null, rankTierAtTime: string | null, finalEquity: number, closeReasonStats: Record<string, number> | null }`
- `HubData` -- see [Section 16](#getHubData-response-shape) for full shape.
- `NotificationItem` -- `{ id: number, type: string, title: string, message: string | null, competitionId: number | null, actionUrl: string | null, isRead: boolean, createdAt: number }`
- `InstitutionSummary` -- `{ id: number, name: string, nameEn: string | null, shortName: string | null, type: string, country: string, region: string | null, verified: boolean, memberCount: number }`
- `UserProfileData` -- `{ arenaAccountId: number, username: string, displayName: string | null, bio: string | null, country: string | null, region: string | null, city: string | null, institutionId: number | null, institutionName: string | null, department: string | null, graduationYear: number | null, participantType: string, isProfilePublic: boolean, rankTier: RankTier, seasonPoints: number }`
- `CountryStats` -- `{ country: string, participantCount: number, competitionCount: number, avgPnlPct: number, avgWinRate: number, totalPrizeWon: number, bestPlayer: { username: string, seasonPoints: number } | null }`
- `InstitutionStats` -- `{ id: number, name: string, nameEn: string | null, shortName: string | null, type: string, country: string, verified: boolean, memberCount: number, activeMembers: number, avgPnlPct: number, avgWinRate: number, totalPrizeWon: number, bestRank: number, topPlayers: Array<{ username: string, seasonPoints: number, rankTier: RankTier }> }`

---

## 3. Competition Status State Machine

**File:** `server/competition-engine.ts` (line 20-27)

```
VALID_TRANSITIONS = {
  "draft"                 -> ["announced", "cancelled"]
  "announced"             -> ["registration_open", "cancelled"]
  "registration_open"     -> ["registration_closed", "cancelled"]
  "registration_closed"   -> ["live", "cancelled"]
  "live"                  -> ["settling"]
  "settling"              -> ["completed"]
}
```

**Automatic time-driven transitions** (in `CompetitionEngine.autoTransitions()`):
- `announced` -> `registration_open`: when `now >= comp.registrationOpenAt`
- `registration_open` -> `registration_closed`: when `now >= comp.registrationCloseAt`
- `registration_closed` -> `live`: when `now >= comp.startTime` (calls `startCompetition`)

**Automatic expiration** (in `tickLiveCompetitions()`):
- `live` -> `settling` -> `completed`: when `now >= comp.endTime` (calls `settleCompetition`)

**Special: cancelled on insufficient participants:**
If `acceptedCount < comp.minParticipants` at `startCompetition`, the status is set to `"cancelled"` directly (bypassing `VALID_TRANSITIONS`).

---

## 4. All Zod Validation Schemas

### From `server/index.ts`

**`loginSchema`**
```typescript
{
  inviteCode: z.string().trim().min(4).max(32),  // 4-32 chars after trim
  username:   z.string().trim().min(2).max(20),   // 2-20 chars after trim
  password:   z.string().min(4).max(128),          // 4-128 chars (no trim)
}
```

**`quickLoginSchema`**
```typescript
{
  username: z.string().trim().min(2).max(20),  // 2-20 chars after trim
  password: z.string().min(1).max(128),         // 1-128 chars (no trim)
}
```

**`openSchema`**
```typescript
{
  direction: z.enum(["long", "short"]),
  size:      z.number().positive(),                   // must be > 0
  tp:        z.number().positive().nullable().optional(), // > 0, or null, or absent
  sl:        z.number().positive().nullable().optional(), // > 0, or null, or absent
}
```

**`tpslSchema`**
```typescript
{
  tp: z.number().positive().nullable().optional(),  // > 0, or null, or absent
  sl: z.number().positive().nullable().optional(),  // > 0, or null, or absent
}
```

**`chatSchema`**
```typescript
{
  message: z.string().trim().min(1).max(280),  // 1-280 chars after trim
}
```

**`eventSchema`**
```typescript
{
  type:    z.string().trim().min(1).max(64),         // 1-64 chars
  payload: z.unknown().optional(),                     // any value, optional
  source:  z.string().trim().max(32).optional(),       // max 32 chars, optional
}
```

**`predictionSchema`**
```typescript
{
  direction:  z.enum(["up", "down"]),
  confidence: z.number().int().min(1).max(5).default(3),  // integer 1-5, defaults to 3
}
```

**`pollSchema`**
```typescript
{
  direction: z.enum(["long", "short", "neutral"]),
}
```

### From `server/competition-routes.ts`

**`createSeasonSchema`**
```typescript
{
  name:      z.string().min(1).max(128),
  slug:      z.string().min(1).max(32),
  startDate: z.number().positive(),
  endDate:   z.number().positive(),
}
```

**`createCompetitionSchema`**
```typescript
{
  seasonId:               z.number().positive(),
  title:                  z.string().min(1).max(256),
  slug:                   z.string().min(1).max(64),
  description:            z.string().optional(),
  competitionNumber:      z.number().int().positive(),
  competitionType:        z.enum(["regular", "grand_final", "special", "practice"]).default("regular"),
  maxParticipants:        z.number().int().positive().default(50),
  minParticipants:        z.number().int().positive().default(5),
  registrationOpenAt:     z.number().positive().optional(),
  registrationCloseAt:    z.number().positive().optional(),
  startTime:              z.number().positive(),
  endTime:                z.number().positive(),
  symbol:                 z.string().default("SOLUSDT"),
  startingCapital:        z.number().positive().default(5000),
  maxTradesPerMatch:      z.number().int().positive().default(40),
  closeOnlySeconds:       z.number().int().nonnegative().default(1800),
  feeRate:                z.number().nonnegative().default(0.0005),
  prizePool:              z.number().nonnegative().default(500),
  requireMinSeasonPoints: z.number().int().nonnegative().default(0),
  requireMinTier:         z.string().optional(),
  inviteOnly:             z.boolean().default(false),
}
```

**`updateCompetitionSchema`**: `createCompetitionSchema.partial()` -- all fields optional.

**`transitionSchema`**
```typescript
{
  status: z.enum(["announced", "registration_open", "registration_closed", "live", "cancelled"]),
}
```

**`reviewSchema`**
```typescript
{
  decision: z.enum(["accepted", "rejected", "waitlisted"]),
}
```

**`batchReviewSchema`**
```typescript
{
  action: z.enum(["accepted", "rejected"]),
  ids:    z.array(z.number().positive()),
}
```

### From `server/profile-routes.ts`

**`updateProfileSchema`**
```typescript
{
  country:         z.string().length(2).regex(/^[A-Z]{2}$/).optional(),  // exactly 2 uppercase letters
  region:          z.string().max(64).optional(),
  city:            z.string().max(64).optional(),
  institutionId:   z.number().positive().nullable().optional(),
  institutionName: z.string().max(128).nullable().optional(),
  department:      z.string().max(128).nullable().optional(),
  graduationYear:  z.number().int().min(1990).max(2040).nullable().optional(),
  participantType: z.enum(["student", "professional", "independent"]).optional(),
  bio:             z.string().max(280).nullable().optional(),
  displayName:     z.string().max(64).nullable().optional(),
}
```

**`createInstitutionSchema`**
```typescript
{
  name:      z.string().min(1).max(256),
  nameEn:    z.string().max(256).optional(),
  shortName: z.string().max(64).optional(),
  type:      z.enum(["university", "college", "high_school", "company", "organization"]).default("university"),
  country:   z.string().length(2),       // exactly 2 chars
  region:    z.string().max(64).optional(),
  city:      z.string().max(64).optional(),
}
```

### From `server/_core/systemRouter.ts`

**`system.health` input**
```typescript
{
  timestamp: z.number().min(0, "timestamp cannot be negative"),
}
```

**`system.notifyOwner` input** (admin only)
```typescript
{
  title:   z.string().min(1, "title is required"),
  content: z.string().min(1, "content is required"),
}
```

---

## 5. Rate Limiters

All window-based per IP, defined in `server/index.ts`:

| Route Prefix | Window | Max Requests | Error Message |
|---|---|---|---|
| `/api/auth/` | 60s | 10 | `"Too many login attempts, try again later"` |
| `/api/arena/trade/` | 60s | 60 | `"Too many trade requests, slow down"` |
| `/api/trade/` | 60s | 60 | `"Too many trade requests, slow down"` |
| `/api/arena/chat` | 60s | 30 | `"Too many messages, slow down"` |
| `/api/chat` | 60s | 30 | `"Too many messages, slow down"` |
| `/api/` (general) | 60s | 120 | `"Too many requests"` |

---

## 6. Public Endpoints

### `GET /api/health`

**Auth:** None
**Rate Limit:** General (120/min)

**Response (200):**
```json
{
  "ok": true,          // boolean (always true)
  "ts": 1709538000000  // number (Date.now())
}
```

---

### `POST /api/auth/login`

**Auth:** None
**Rate Limit:** Auth (10/min)
**Side Effects:** Creates an `arena_accounts` row (if new user via invite code), creates an `arena_sessions` row.

**Request Body:** `loginSchema`
```json
{
  "inviteCode": "string",  // 4-32 chars
  "username": "string",    // 2-20 chars
  "password": "string"     // 4-128 chars
}
```

**Response (200):**
```json
{
  "token": "string",  // 48-char hex string (24 random bytes)
  "user": {
    "id": 1,           // number
    "username": "string"  // string
  }
}
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Invalid invite code or username" }` | Zod validation fails |
| 400 | `{ "error": "Username length must be between 2 and 20" }` | Server-side length check fails |
| 400 | `{ "error": "Invalid invite code" }` | Code is empty or < 4 chars |
| 400 | `{ "error": "Password must be at least 4 characters" }` | Password < 4 chars |
| 400 | `{ "error": "<any error from registerArenaAccount>" }` | DB registration error |

---

### `POST /api/auth/quick-login`

**Auth:** None
**Rate Limit:** Auth (10/min)
**Side Effects:** Creates an `arena_sessions` row.

**Request Body:** `quickLoginSchema`
```json
{
  "username": "string",  // 2-20 chars
  "password": "string"   // 1-128 chars
}
```

**Response (200):**
```json
{
  "token": "string",  // 48-char hex string
  "user": {
    "id": 1,
    "username": "string"
  }
}
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Invalid username" }` | Zod validation fails |
| 400 | `{ "error": "Invalid username" }` | Server-side length check fails |
| 400 | `{ "error": "Password is required" }` | Empty password |
| 400 | `{ "error": "Account not found. Please register with an invite code first." }` | Username not in DB |
| 400 | `{ "error": "Account has no password set. Please re-register with your invite code to set a password." }` | No passwordHash stored |
| 400 | `{ "error": "Incorrect password" }` | Password mismatch |

---

### `GET /api/public/summary`

**Auth:** None
**Rate Limit:** General (120/min)

**Response (200):**
```json
{
  "participants": 42,      // number -- count of leaderboard rows
  "matchNumber": 7,        // number -- ((matchNumber-1) % 15) + 1, range 1-15
  "prizePool": 500,        // number -- always 500
  "symbol": "SOLUSDT",     // string
  "leader": {              // object | null
    "username": "string",
    "weightedPnl": 123.45, // number (rounded to 2 decimals)
    "pnlPct": 5.67         // number (rounded to 2 decimals)
  }
}
```

**Error Responses:**
| Status | Body |
|---|---|
| 500 | `{ "error": "<message>" }` |

---

### `GET /api/public/leaderboard`

**Auth:** None
**Rate Limit:** General (120/min)
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 50 | Max rows to return. Falls back to 50 if non-finite. |

**Response (200):** `Array<LeaderboardEntry>`
```json
[
  {
    "rank": 1,               // number (1-indexed)
    "username": "string",
    "pnlPct": 5.67,          // number (rounded to 2 decimals)
    "pnl": 283.50,           // number (rounded to 2 decimals)
    "weightedPnl": 270.12,   // number (rounded to 2 decimals)
    "matchPoints": 100,      // number (from MATCH_POINTS_TABLE)
    "prizeEligible": true,   // boolean (tradesUsed >= MIN_TRADES_FOR_PRIZE)
    "prizeAmount": 55,       // number (from REGULAR_PRIZE_TABLE, 0 if not eligible)
    "rankTier": "gold",      // "iron"|"bronze"|"silver"|"gold"|"platinum"|"diamond"
    "isBot": false            // boolean (always false)
  }
]
```

**Error Responses:**
| Status | Body |
|---|---|
| 500 | `{ "error": "<message>" }` |

---

## 7. Arena Auth Endpoints

**Authentication:** `Authorization: Bearer <token>` header required.
Middleware checks `req.path.startsWith("/api/arena/")`. Attaches `req.arenaAccountId` and `req.arenaUsername`.

**Auth Error Responses:**
| Status | Body | When |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No token or token not found in DB |
| 503 | `{ "error": "Service temporarily unavailable" }` | Database error during auth lookup |

---

### `GET /api/arena/state`

**Auth:** Arena token
**Rate Limit:** General (120/min)
**Side Effects:** May trigger match rotation (creates new match, closes all positions, awards season points).

**Response (200):** See [Section 16 -- `getStateForUser` Full Response Shape](#getstateforuser-full-response-shape).

**Error Responses:**
| Status | Body |
|---|---|
| 500 | `{ "error": "<message>" }` |

---

### `POST /api/arena/trade/open`

**Auth:** Arena token
**Rate Limit:** Trade (60/min)
**Side Effects:** Creates a position row, records a `"order_open"` behavior event. May trigger match rotation.

**Request Body:** `openSchema`
```json
{
  "direction": "long",     // "long" | "short"
  "size": 1000,            // number > 0
  "tp": 150.5,             // number > 0 | null | absent
  "sl": 140.0              // number > 0 | null | absent
}
```

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Invalid open payload" }` | Zod validation fails |
| 400 | `{ "error": "Close-only mode in last 30 minutes" }` | Match has < 1800s remaining |
| 400 | `{ "error": "Invalid size" }` | Size is not a finite positive number |
| 400 | `{ "error": "Minimum position size is 10 USDT" }` | Size < 10 |
| 400 | `{ "error": "Price feed unavailable" }` | Last price <= 0 |
| 400 | `{ "error": "Market data is stale, trading temporarily disabled" }` | Market data stale |
| 400 | `{ "error": "Take profit must be above current price for long positions" }` | TP <= price on long |
| 400 | `{ "error": "Take profit must be below current price for short positions" }` | TP >= price on short |
| 400 | `{ "error": "Stop loss must be below current price for long positions" }` | SL >= price on long |
| 400 | `{ "error": "Stop loss must be above current price for short positions" }` | SL <= price on short |
| 400 | `{ "error": "Only one position is allowed" }` | Already has an open position |
| 400 | `{ "error": "Trade limit reached" }` | tradesUsed >= 40 |
| 400 | `{ "error": "Insufficient equity" }` | size > current equity |

---

### `POST /api/arena/trade/close`

**Auth:** Arena token
**Rate Limit:** Trade (60/min)
**Side Effects:** Deletes position row, inserts trade row (atomic transaction), records `"order_close"` behavior event. May trigger match rotation.

**Response (200):**
```json
{
  "ok": true,
  "tradeId": "trade-abc123xyz789"  // string -- "trade-" + nanoid(12)
}
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "No open position" }` | No position exists |
| 400 | `{ "error": "Position already closed" }` | Race condition -- position closed between check and transaction |

---

### `POST /api/arena/trade/tpsl`

**Auth:** Arena token
**Rate Limit:** Trade (60/min)
**Side Effects:** Updates position's takeProfit/stopLoss, records `"set_tpsl"` behavior event.

**Request Body:** `tpslSchema`
```json
{
  "tp": 155.0,  // number > 0 | null | absent (undefined = keep existing, null = clear)
  "sl": 139.0   // number > 0 | null | absent
}
```

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Invalid TP/SL payload" }` | Zod validation fails |
| 400 | `{ "error": "No open position" }` | No position exists |
| 400 | `{ "error": "Take profit must be above entry price for long positions" }` | newTp <= entryPrice on long |
| 400 | `{ "error": "Take profit must be below entry price for short positions" }` | newTp >= entryPrice on short |
| 400 | `{ "error": "Stop loss must be below entry price for long positions" }` | newSl >= entryPrice on long |
| 400 | `{ "error": "Stop loss must be above entry price for short positions" }` | newSl <= entryPrice on short |

---

### `POST /api/arena/chat`

**Auth:** Arena token
**Rate Limit:** Chat (30/min)
**Side Effects:** Inserts chat message row (id = `"chat-" + nanoid(12)`, type = `"user"`), records `"chat_send"` behavior event.

**Request Body:** `chatSchema`
```json
{
  "message": "Hello world"  // 1-280 chars after trim
}
```

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body |
|---|---|
| 400 | `{ "error": "Invalid message" }` |
| 400 | `{ "error": "<message>" }` |

---

### `POST /api/arena/events`

**Auth:** Arena token
**Rate Limit:** General (120/min)
**Side Effects:** Inserts a behavior_events row.

**Request Body:** `eventSchema`
```json
{
  "type": "page_view",     // 1-64 chars
  "payload": { "any": "value" },  // unknown, optional
  "source": "client"       // max 32 chars, optional (defaults to "client")
}
```

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body |
|---|---|
| 400 | `{ "error": "Invalid event payload" }` |
| 400 | `{ "error": "<message>" }` |

---

### `POST /api/arena/prediction`

**Auth:** Arena token
**Rate Limit:** General (120/min)
**Side Effects:** Inserts prediction row, records `"prediction_submit"` behavior event.

**Request Body:** `predictionSchema`
```json
{
  "direction": "up",     // "up" | "down"
  "confidence": 3        // integer 1-5, default 3
}
```

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Invalid prediction payload" }` | Zod validation fails |
| 400 | `{ "error": "Prediction window is closed" }` | Not within first 60 seconds of UTC hour |
| 400 | `{ "error": "Already submitted prediction for this round" }` | Duplicate submission for this hour |

---

### `POST /api/arena/poll`

**Auth:** Arena token
**Rate Limit:** General (120/min)
**Side Effects:** Records `"poll_vote"` behavior event (with `{ direction }` payload).

**Request Body:** `pollSchema`
```json
{
  "direction": "long"  // "long" | "short" | "neutral"
}
```

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body |
|---|---|
| 400 | `{ "error": "Invalid poll payload" }` |
| 400 | `{ "error": "<message>" }` |

---

## 8. Legacy API Endpoints

These duplicate the arena endpoints but perform their own auth lookup from the Bearer token rather than relying on the arena middleware. They exist at paths without the `/arena/` prefix.

### `GET /api/state`

Identical response to `GET /api/arena/state`. Performs its own token lookup.

**Additional Error Responses:**
| Status | Body | When |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Token invalid |
| 500 | `{ "error": "<message>" }` | Engine error |

### `POST /api/trade/open`

Identical to `POST /api/arena/trade/open`.
**Additional error:** `503 { "error": "Service temporarily unavailable" }` on DB auth error.

### `POST /api/trade/close`

Identical to `POST /api/arena/trade/close`.
**Additional error:** `503 { "error": "Service temporarily unavailable" }` on DB auth error.

### `POST /api/trade/tpsl`

Identical to `POST /api/arena/trade/tpsl`.
**Additional error:** `503 { "error": "Service temporarily unavailable" }` on DB auth error.

### `POST /api/chat`

Identical to `POST /api/arena/chat`.
**Additional error:** `503 { "error": "Service temporarily unavailable" }` on DB auth error.

### `POST /api/events`

Identical to `POST /api/arena/events`.
**Additional error:** `503 { "error": "Service temporarily unavailable" }` on DB auth error.

### `POST /api/prediction`

Identical to `POST /api/arena/prediction`.
**Additional error:** `503 { "error": "Service temporarily unavailable" }` on DB auth error.

---

## 9. Competition System Endpoints

### `GET /api/competitions`

**Auth:** Optional (used to enrich with `myRegistrationStatus` if token provided)
**Rate Limit:** General (120/min)
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `seasonId` | number | undefined | Filter by season |
| `status` | string | undefined | Filter by competition status |

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,                          // number
      "slug": "comp-week-1",            // string
      "title": "Week 1 Regular",        // string
      "competitionNumber": 1,            // number
      "competitionType": "regular",      // "regular"|"grand_final"|"special"|"practice"
      "status": "live",                  // CompetitionStatus
      "maxParticipants": 50,             // number
      "registeredCount": 32,             // number (all statuses)
      "acceptedCount": 28,               // number (only "accepted")
      "prizePool": 500,                  // number
      "symbol": "SOLUSDT",              // string
      "startTime": 1709538000000,        // number (ms)
      "endTime": 1709624400000,          // number (ms)
      "registrationOpenAt": 1709451600000, // number | null
      "registrationCloseAt": 1709524800000, // number | null
      "myRegistrationStatus": "accepted" // RegistrationStatus | null
    }
  ],
  "total": 1  // number (items.length)
}
```

**Error Responses:**
| Status | Body |
|---|---|
| 500 | `{ "error": "<message>" }` |

---

### `GET /api/competitions/:slug`

**Auth:** Optional (enriches `myRegistration` if token provided)
**Rate Limit:** General (120/min)

**Response (200):** The full competition DB row spread, plus:
```json
{
  "id": 1,
  "seasonId": 1,
  "title": "string",
  "slug": "string",
  "description": "string | null",
  "competitionNumber": 1,
  "competitionType": "regular",
  "status": "live",
  "maxParticipants": 50,
  "minParticipants": 5,
  "registrationOpenAt": 1709451600000,
  "registrationCloseAt": 1709524800000,
  "startTime": 1709538000000,
  "endTime": 1709624400000,
  "matchId": 42,
  "symbol": "SOLUSDT",
  "startingCapital": 5000,
  "maxTradesPerMatch": 40,
  "closeOnlySeconds": 1800,
  "feeRate": 0.0005,
  "prizePool": 500,
  "prizeTableJson": "string | null",
  "pointsTableJson": "string | null",
  "requireMinSeasonPoints": 0,
  "requireMinTier": "string | null",
  "inviteOnly": true,             // boolean (coerced from DB integer)
  "createdBy": 1,
  "createdAt": 1709000000000,
  "updatedAt": 1709500000000,
  "registeredCount": 32,          // number (added)
  "acceptedCount": 28,            // number (added)
  "myRegistration": {             // object | null (added)
    "status": "accepted",         // RegistrationStatus
    "appliedAt": 1709450000000    // number
  }
}
```

**Error Responses:**
| Status | Body |
|---|---|
| 404 | `{ "error": "Competition not found" }` |
| 500 | `{ "error": "<message>" }` |

---

### `GET /api/competitions/:slug/leaderboard`

**Auth:** None
**Rate Limit:** General (120/min)

**Response (200)** when `status === "completed"`:
```json
[
  {
    "rank": 1,               // number (from matchResults.finalRank)
    "username": "",           // string (always "" -- TODO: join)
    "pnl": 283.50,           // number (matchResults.totalPnl)
    "pnlPct": 5.67,          // number (matchResults.totalPnlPct)
    "weightedPnl": 270.12,   // number (matchResults.totalWeightedPnl)
    "pointsEarned": 100,     // number (matchResults.pointsEarned)
    "prizeWon": 55            // number (matchResults.prizeWon)
  }
]
```

**Response (200)** when `status === "live"` and `matchId` exists:
```json
[
  {
    "rank": 1,
    "username": "string",
    "pnlPct": 5.67,
    "pnl": 283.50,
    "weightedPnl": 270.12,
    "matchPoints": 100,
    "prizeEligible": true,
    "prizeAmount": 55,
    "rankTier": "gold",
    "isBot": false
  }
]
```
(Max 100 entries, sliced from full leaderboard.)

**Response (200)** for all other statuses: `[]` (empty array)

**Error Responses:**
| Status | Body |
|---|---|
| 404 | `{ "error": "Competition not found" }` |
| 500 | `{ "error": "<message>" }` |

---

### `GET /api/seasons`

**Auth:** None
**Rate Limit:** General (120/min)

**Response (200):** `Array<Season DB Row>` ordered by `startDate` descending.
```json
[
  {
    "id": 1,
    "name": "Season 1",
    "slug": "season-1",
    "status": "active",
    "startDate": 1704067200000,
    "endDate": 1706745600000,
    "pointsDecayFactor": 0.8,
    "createdAt": 1704067200000
  }
]
```

---

### `POST /api/competitions/:slug/register`

**Auth:** Bearer token required
**Rate Limit:** General (120/min)
**Side Effects:** Creates a `competition_registrations` row with status `"pending"`.

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Invalid token |
| 404 | `{ "error": "Competition not found" }` | Slug not found |
| 400 | `{ "error": "Registration is not open" }` | Status is not `"registration_open"` |
| 400 | `{ "error": "Account not found" }` | Arena account missing |
| 400 | `{ "error": "Minimum X season points required" }` | Insufficient season points |
| 400 | `{ "error": "Minimum <tier> tier required" }` | Insufficient tier |
| 400 | `{ "error": "Already registered" }` | Existing non-withdrawn registration |
| 400 | `{ "error": "Competition is full" }` | accepted + pending >= maxParticipants |

---

### `POST /api/competitions/:slug/withdraw`

**Auth:** Bearer token required
**Rate Limit:** General (120/min)
**Side Effects:** Sets registration status to `"withdrawn"`.

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Invalid token |
| 404 | `{ "error": "Competition not found" }` | Slug not found |
| 400 | `{ "error": "Not registered" }` | No registration found |
| 400 | `{ "error": "Already withdrawn" }` | Registration already withdrawn |
| 400 | `{ "error": "Cannot withdraw from an active or completed competition" }` | Status is `"live"`, `"settling"`, or `"completed"` |

---

### `GET /api/hub`

**Auth:** Bearer token required
**Rate Limit:** General (120/min)

**Response (200):** See [Section 16 -- `getHubData` Full Response Shape](#gethubdata-full-response-shape).

**Error Responses:**
| Status | Body |
|---|---|
| 401 | `{ "error": "Unauthorized" }` |
| 500 | `{ "error": "<message>" }` |

---

### `GET /api/me/history`

**Auth:** Bearer token required
**Rate Limit:** General (120/min)
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 50 | Max results |

**Response (200):** `Array<matchResults DB row>` -- the raw `matchResults` table rows ordered by `createdAt` desc.
```json
[
  {
    "id": 1,
    "competitionId": 1,
    "arenaAccountId": 42,
    "finalRank": 3,
    "totalPnl": 150.25,
    "totalPnlPct": 3.01,
    "totalWeightedPnl": 140.00,
    "tradesCount": 12,
    "winCount": 8,
    "lossCount": 4,
    "bestTradePnl": 50.00,
    "worstTradePnl": -15.00,
    "avgHoldDuration": 420.5,
    "avgHoldWeight": 0.85,
    "pointsEarned": 70,
    "prizeWon": 25,
    "prizeEligible": 1,
    "rankTierAtTime": "silver",
    "finalEquity": 5150.25,
    "closeReasonStats": "{\"manual\":8,\"tp\":2,\"sl\":2}",
    "createdAt": 1709624400000
  }
]
```

---

### `GET /api/me/notifications`

**Auth:** Bearer token required
**Rate Limit:** General (120/min)
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 50 | Max notifications |

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "arenaAccountId": 42,
      "type": "competition_ended",
      "title": "Week 1 已结束",
      "message": "第3名 · PnL +3.0% · +70pts",
      "competitionId": 1,
      "actionUrl": "/results/1",
      "isRead": 0,            // number (0 or 1, DB integer)
      "createdAt": 1709624400000
    }
  ],
  "unreadCount": 3  // number
}
```

---

### `GET /api/me/notifications/unread-count`

**Auth:** Bearer token required

**Response (200):**
```json
{ "count": 3 }  // number
```

---

### `POST /api/me/notifications/:id/read`

**Auth:** Bearer token required
**Side Effects:** Sets `isRead = 1` for the specified notification (only if owned by the authenticated user).

**Response (200):**
```json
{ "ok": true }
```

---

### `POST /api/me/notifications/read-all`

**Auth:** Bearer token required
**Side Effects:** Sets `isRead = 1` for ALL unread notifications belonging to the authenticated user.

**Response (200):**
```json
{ "ok": true }
```

---

## 10. Profile & Institution Endpoints

### `GET /api/me/profile`

**Auth:** Bearer token required
**Side Effects:** Creates a `user_profiles` row if one does not exist (with defaults: `participantType = "independent"`, `isProfilePublic = 1`).

**Response (200):**
```json
{
  "id": 1,                          // number (from userProfiles)
  "arenaAccountId": 42,             // number
  "displayName": "Alpha Trader",    // string | null
  "bio": "Trading is life",         // string | null
  "country": "CN",                  // string | null
  "region": "Shanghai",             // string | null
  "city": "Pudong",                 // string | null
  "institutionId": 5,               // number | null
  "institutionName": "Fudan University", // string | null
  "department": "Finance",          // string | null
  "graduationYear": 2024,           // number | null
  "participantType": "student",     // string
  "isProfilePublic": 1,             // number (0 or 1)
  "updatedAt": 1709500000000,       // number
  "username": "trader_wang",        // string (added from account)
  "seasonPoints": 350,              // number (added from account)
  "capital": 5000                   // number (added from account)
}
```

---

### `PUT /api/me/profile`

**Auth:** Bearer token required
**Side Effects:** Updates profile row, creates if not exists.

**Request Body:** `updateProfileSchema` (all fields optional)

**Response (200):** Same shape as `GET /api/me/profile` (re-fetched after update).

**Error Responses:**
| Status | Body |
|---|---|
| 400 | `{ "error": "Invalid profile data", "details": { ... } }` |
| 500 | `{ "error": "<message>" }` |

---

### `GET /api/users/:username/profile`

**Auth:** None
**Rate Limit:** General (120/min)

**Response (200)** when profile is NOT public or doesn't exist:
```json
{
  "username": "trader_wang",
  "seasonPoints": 350,
  "isProfilePublic": false
}
```

**Response (200)** when profile IS public:
```json
{
  "username": "trader_wang",
  "seasonPoints": 350,
  "isProfilePublic": true,
  "profile": {
    "displayName": "Alpha Trader",    // string | null
    "bio": "Trading is life",         // string | null
    "country": "CN",                  // string | null
    "region": "Shanghai",             // string | null
    "city": "Pudong",                 // string | null
    "institutionName": "Fudan University", // string | null
    "department": "Finance",          // string | null
    "participantType": "student"      // string
  },
  "stats": {
    "totalMatches": 12,               // number
    "winRate": 65.5,                  // number (rounded to 1 decimal)
    "totalPnl": 1234.56,             // number (rounded to 2 decimals)
    "avgHoldDuration": 420,           // number (rounded to integer, seconds)
    "totalPrize": 150.00,            // number (rounded to 2 decimals)
    "bestRank": 2                     // number (min of all finalRank values, 0 if no results)
  }
}
```

**Error Responses:**
| Status | Body |
|---|---|
| 404 | `{ "error": "User not found" }` |
| 500 | `{ "error": "<message>" }` |

---

### `GET /api/institutions/search`

**Auth:** None
**Rate Limit:** General (120/min)
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | "" | Search query (LIKE `%query%`). Returns `[]` if < 1 char. |
| `limit` | number | 10 | Max results (capped at 50) |

**Response (200):** `Array<institutions DB row>`
```json
[
  {
    "id": 1,
    "name": "Fudan University",
    "nameEn": "Fudan University",
    "shortName": "FDU",
    "type": "university",
    "country": "CN",
    "region": "Shanghai",
    "city": "Shanghai",
    "logoUrl": null,
    "verified": 0,
    "memberCount": 0,
    "createdAt": 1709000000000
  }
]
```

---

### `POST /api/institutions`

**Auth:** Bearer token required
**Side Effects:** Creates an `institutions` row.

**Request Body:** `createInstitutionSchema`

**Response (200):**
```json
{ "id": 5 }  // number -- the newly created institution ID
```

**Error Responses:**
| Status | Body |
|---|---|
| 401 | `{ "error": "Unauthorized" }` |
| 400 | `{ "error": "Invalid institution data", "details": { ... } }` |
| 400 | `{ "error": "<message>" }` |

---

## 11. Analytics Endpoints

### `GET /api/me/analytics`

**Auth:** Bearer token required
**Rate Limit:** General (120/min)

**Query Parameters:** None (a `?competitionId=X` is mentioned in the doc comment but is NOT implemented in the code; the query filters only by `arenaAccountId`).

**Response (200) when no trades:**
```json
{
  "summary": {
    "totalTrades": 0,
    "winRate": 0,
    "avgPnlPerTrade": 0,
    "avgHoldDuration": 0,
    "avgHoldWeight": 0,
    "profitFactor": 0
  },
  "pnlDistribution": [],
  "byDirection": {
    "long":  { "count": 0, "wins": 0, "losses": 0, "totalPnl": 0, "avgPnl": 0, "avgHoldDuration": 0 },
    "short": { "count": 0, "wins": 0, "losses": 0, "totalPnl": 0, "avgPnl": 0, "avgHoldDuration": 0 }
  },
  "byCloseReason": {},
  "holdDurationVsPnl": [],
  "equityCurve": [],
  "streaks": { "currentStreak": 0, "longestWinStreak": 0, "longestLossStreak": 0 },
  "byHour": []
}
```

**Response (200) when trades exist:** See [Section 16 -- Analytics Full Response Shape](#analytics-full-response-shape).

---

## 12. Public Stats Endpoints

### `GET /api/stats/overview`

**Auth:** None
**Rate Limit:** General (120/min)

**Response (200):**
```json
{
  "totalPlayers": 1234,         // number
  "totalTrades": 56789,         // number
  "totalCompetitions": 42,      // number
  "totalPrize": 12500.00,       // number (rounded to 2 decimals)
  "totalCountries": 15,         // number
  "totalInstitutions": 28       // number
}
```

---

### `GET /api/stats/countries`

**Auth:** None
**Rate Limit:** General (120/min)

**Response (200):** Array filtered to exclude null countries, ordered by `participantCount` desc, max 50.
```json
[
  {
    "country": "CN",              // string
    "participantCount": 150,      // number
    "totalPrize": 5000.00,        // number (rounded to 2 decimals)
    "avgPnlPct": 2.5,             // number (rounded to 1 decimal)
    "competitionCount": 340       // number
  }
]
```

---

### `GET /api/stats/institutions`

**Auth:** None
**Rate Limit:** General (120/min)
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 50 | Max results (capped at 100) |

Note: `type` and `country` query params are mentioned in the comment but are NOT implemented in the code.

**Response (200):** Array ordered by `memberCount` desc.
```json
[
  {
    "institutionId": 5,           // number | null
    "name": "Fudan University",   // string | null
    "country": "CN",              // string | null
    "memberCount": 25,            // number
    "totalPrize": 2500.00,        // number (rounded to 2 decimals)
    "avgPnlPct": 3.2,             // number (rounded to 1 decimal)
    "competitionCount": 120,      // number
    "bestRank": 1                 // number (999 if no results)
  }
]
```

---

## 13. Admin Endpoints

All admin endpoints require Bearer token authentication AND the account must have `role === "admin"` in the `arena_accounts` table.

**Admin Auth Error Responses:**
| Status | Body | When |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No/invalid token |
| 403 | `{ "error": "Admin access required" }` | Account role is not `"admin"` |

### `POST /api/admin/seasons`

**Request Body:** `createSeasonSchema`

**Response (200):**
```json
{ "id": 1 }  // number -- newly created season ID
```

### `GET /api/admin/seasons`

**Response (200):** Same as `GET /api/seasons`.

### `POST /api/admin/competitions`

**Request Body:** `createCompetitionSchema`
**Side Effects:** Creates competition row with `status = "draft"` (DB default), `createdBy = adminId`.

**Response (200):**
```json
{ "id": 1 }  // number -- newly created competition ID
```

**Error (400) on validation failure:**
```json
{ "error": "Invalid payload", "details": { ... } }  // Zod flatten output
```

### `PUT /api/admin/competitions/:id`

**Request Body:** `updateCompetitionSchema` (partial)
**Side Effects:** Updates competition row, converts `inviteOnly` boolean to integer.

**Response (200):**
```json
{ "ok": true }
```

### `POST /api/admin/competitions/:id/transition`

**Request Body:** `transitionSchema`
**Side Effects:** Transitions competition status per state machine. May create a match row on `"live"` transition. May cancel competition if insufficient participants. Sends notifications on key transitions.

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Invalid status" }` | Zod validation fails |
| 400 | `{ "error": "Competition not found" }` | ID not found |
| 400 | `{ "error": "Cannot transition from \"X\" to \"Y\"" }` | Invalid transition per VALID_TRANSITIONS |

### `GET /api/admin/competitions/:id/registrations`

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | string | undefined | Filter by registration status |

**Response (200):** `Array<competitionRegistrations DB row>`

### `POST /api/admin/registrations/:id/review`

**Request Body:** `reviewSchema`
**Side Effects:** Updates registration status. Sends notification to user on `"accepted"` or `"rejected"`.

**Notification types sent:**
- `"accepted"` -> notification type `"registration_accepted"`, title `"入选通知"`, message `"你已入选 <title>！"`, actionUrl `/competitions/<slug>`
- `"rejected"` -> notification type `"registration_rejected"`, title `"未入选通知"`, message `"很遗憾，<title> 名额已满"`, actionUrl `/competitions`

**Response (200):**
```json
{ "ok": true }
```

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Registration not found" }` | ID not found |
| 400 | `{ "error": "Cannot review registration with status \"X\"" }` | Status is not `"pending"` or `"waitlisted"` |

### `POST /api/admin/competitions/:id/registrations/batch`

**Request Body:** `batchReviewSchema`

**Response (200):**
```json
{
  "ok": true,
  "processed": 5  // number -- count of successfully processed reviews
}
```

### `POST /api/admin/competitions/:id/duplicate`

**Side Effects:** Creates a copy of the competition with:
- Title: `"<original title> (副本)"`
- Slug: `"<original slug>-copy-<Date.now()>"`
- `competitionNumber`: original + 1
- All times shifted +24 hours
- New `createdBy` = adminId
- Status defaults to `"draft"`

**Response (200):**
```json
{ "id": 5 }  // number -- newly created competition ID
```

**Error Responses:**
| Status | Body |
|---|---|
| 404 | `{ "error": "Not found" }` |
| 400 | `{ "error": "<message>" }` |

---

## 14. tRPC Router Endpoints

**File:** `server/routers.ts`

### `system.health` (Query)

**Input:** `{ timestamp: number }` (must be >= 0)
**Response:**
```json
{ "ok": true }
```

### `system.notifyOwner` (Mutation, admin-only)

**Input:** `{ title: string, content: string }` (both min 1 char)
**Response:**
```json
{ "success": true }   // or { "success": false } if delivery failed
```

### `auth.me` (Query)

**Input:** None
**Response:** The `ctx.user` object (the currently authenticated user, or `null`).

### `auth.logout` (Mutation)

**Input:** None
**Side Effects:** Clears the `app_session_id` cookie (sets maxAge to -1).
**Response:**
```json
{ "success": true }
```

---

## 15. OAuth Endpoints

**File:** `server/_core/oauth.ts`

### `GET /api/oauth/callback`

**Auth:** None
**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | OAuth authorization code |
| `state` | string | Yes | OAuth state parameter |

**Side Effects:**
1. Exchanges code for access token via SDK
2. Fetches user info (openId, name, email, loginMethod)
3. Upserts user record in the database
4. Creates a session token (1 year expiry)
5. Sets `app_session_id` cookie (maxAge = 1 year)
6. Redirects to `/`

**Response (302):** Redirect to `"/"`

**Error Responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "code and state are required" }` | Missing query params |
| 400 | `{ "error": "openId missing from user info" }` | SDK returned no openId |
| 500 | `{ "error": "OAuth callback failed" }` | Any other error |

---

## 16. Complete Response Shapes for Complex Endpoints

### `getStateForUser` Full Response Shape

**Endpoint:** `GET /api/arena/state` and `GET /api/state`

This is the most complex response in the entire API. Every field is documented below:

```typescript
{
  account: {
    capital: number,              // Starting capital (typically 5000)
    equity: number,               // capital + totalPnl (rounded to 2)
    pnl: number,                  // realized PnL + unrealized PnL (rounded to 2)
    pnlPct: number,               // (totalPnl / capital) * 100 (rounded to 2)
    weightedPnl: number,          // realized weighted + unrealized weighted (rounded to 2)
    tradesUsed: number,           // Current trade number (from position or DB count)
    tradesMax: number,            // Always 40 (MAX_TRADES_PER_MATCH)
    rank: number,                 // 1-indexed rank in current leaderboard
    matchPoints: number,          // Points from MATCH_POINTS_TABLE for current rank
    seasonPoints: number,         // account.seasonPoints + matchPoints (rounded to 2)
    avgHoldWeight: number,        // Average hold weight across user's trades (rounded to 2)
    seasonRankScore: number,      // seasonPoints * (avgHoldWeight || 1) (rounded to 2)
    grandFinalQualified: boolean, // seasonPoints >= 200
    grandFinalLine: number,       // Always 200
    prizeEligible: boolean,       // tradesUsed >= MIN_TRADES_FOR_PRIZE (5)
    rankTier: string,             // "iron"|"bronze"|"silver"|"gold"|"platinum"|"diamond"
    tierLeverage: number,         // 1 | 1.2 | 1.5 | 2 | 2.5 | 3
    prizeAmount: number,          // Prize from REGULAR_PRIZE_TABLE (0 if not eligible)
    directionConsistency: number, // Ratio of consistent direction trades (0-1)
    directionBonus: boolean,      // directionConsistency > 0.7
  },

  position: null | {
    direction: string,            // "long" | "short"
    size: number,                 // Notional size (includes leverage)
    entryPrice: number,           // Entry price at open
    openTime: number,             // Timestamp (ms)
    unrealizedPnl: number,        // Current unrealized PnL after fees (rounded to 2)
    unrealizedPnlPct: number,     // (unrealizedPnl / size) * 100 (rounded to 2)
    unrealizedFee: number,        // Estimated round-trip fee (rounded to 2)
    holdDurationWeight: number,   // Current hold weight (0.5-1.1)
    tradeNumber: number,          // Which trade this is (1-40)
    takeProfit: number | null,    // TP price or null
    stopLoss: number | null,      // SL price or null
  },

  trades: Array<{
    id: string,                   // "trade-<nanoid12>"
    direction: string,            // "long" | "short"
    size: number,                 // Notional size
    entryPrice: number,
    exitPrice: number,
    pnl: number,                  // Realized PnL
    pnlPct: number,               // PnL percentage
    fee: number,                  // Fee paid (0 if null in DB)
    weightedPnl: number,          // PnL * holdWeight
    holdDuration: number,         // Seconds held
    holdDurationWeight: number,   // Hold weight at close time
    closeReason: string,          // "manual" | "tp" | "sl" | "match_end"
    openTime: number,             // Timestamp (ms)
    closeTime: number,            // Timestamp (ms)
  }>,

  leaderboard: Array<{
    rank: number,                 // 1-indexed
    username: string,
    pnlPct: number,               // Rounded to 2 decimals
    pnl: number,                  // Rounded to 2 decimals
    weightedPnl: number,          // Rounded to 2 decimals
    matchPoints: number,          // From MATCH_POINTS_TABLE
    prizeEligible: boolean,       // tradesUsed >= 5
    prizeAmount: number,          // From REGULAR_PRIZE_TABLE (0 if not eligible)
    rankTier: string,             // "iron"|"bronze"|"silver"|"gold"|"platinum"|"diamond"
    isYou: boolean,               // true if this row is the requesting user
    isBot: boolean,               // Always false
  }>,

  social: {
    longPct: number,              // % of open positions that are long (rounded to 2)
    shortPct: number,             // 100 - longPct (rounded to 2)
    longPctDelta: number,         // Always 0 (hardcoded)
    profitablePct: number,        // % of leaderboard with pnl > 0 (rounded to 2)
    losingPct: number,            // % of leaderboard with pnl < 0 (rounded to 2)
    avgProfitPct: number,         // Average pnlPct of profitable traders (rounded to 2)
    avgLossPct: number,           // Average pnlPct of losing traders (rounded to 2, negative)
    avgTradesPerPerson: number,   // Mean trades used (rounded to 2)
    medianTradesPerPerson: number,// Median trades used
    activeTradersPct: number,     // (openPositionCount / participantCount) * 100 (rounded to 2)
    nearPromotionCount: number,   // Traders ranked 290-310
    nearPromotionRange: string,   // Always "#290-#310"
    nearPromotionDelta: number,   // Change in near-promotion count since last snapshot
    consecutiveLossLeader: number,// Always 0 (hardcoded)
    tradersOnLosingStreak: number,// Always 0 (hardcoded)
    recentDirectionBias: string,  // Always "neutral" (hardcoded)
    recentTradeVolume: number,    // Trade count in last 5 minutes
    avgRankChange30m: number,     // Always 0 (hardcoded)
    tradersOvertakenYou: number,  // max(0, currentRank - previousRank)
    youOvertook: number,          // max(0, previousRank - currentRank)
  },

  season: {
    seasonId: string,             // "season-YYYY-MM" (from match startTime)
    month: string,                // "YYYY-MM"
    matchesPlayed: number,        // cycleMatchNumber - 1
    matchesTotal: number,         // Always 15
    grandFinalScheduled: boolean, // Always true
    matches: Array<{              // Always exactly 15 items
      matchNumber: number,        // 1-15
      matchType: string,          // Always "regular"
      status: string,             // "completed" | "active" | "pending"
      // Only present when status === "active":
      rank?: number,
      weightedPnl?: number,
      pnlPct?: number,
      pointsEarned?: number,
      prizeWon?: number,
    }>,
    totalPoints: number,          // seasonPoints (same as account.seasonPoints)
    grandFinalQualified: boolean, // seasonPoints >= 200
  },

  match: {
    matchId: string,              // "match-<dbId>"
    matchNumber: number,          // 1-15 (cycled)
    matchType: string,            // Always "regular"
    totalRegularMatches: number,  // Always 15
    startTime: number,            // Match start timestamp (ms)
    endTime: number,              // Match end timestamp (ms)
    elapsed: number,              // 0-1 progress ratio (clamped)
    remainingSeconds: number,     // Seconds until match ends (min 0)
    symbol: string,               // "SOLUSDT"
    participantCount: number,     // max(leaderboard.length, 1)
    prizePool: number,            // Always 500
    isCloseOnly: boolean,         // remainingSeconds <= 1800
    monthLabel: string,           // "YYYY年M月" (Chinese format)
  },

  chatMessages: Array<ChatMessageRow>,  // Last 120 chat messages from DB

  ticker: TickerData,             // From market.getTicker() -- real-time market data

  orderBook: OrderBookData,       // From market.getOrderBook() -- bids/asks

  prediction: {
    currentRoundKey: string,      // "YYYY-MM-DDTHH:00" (UTC)
    isWindowOpen: boolean,        // true if within first 60 seconds of UTC hour
    windowClosesIn: number,       // Seconds until window closes (0 if closed)
    alreadySubmitted: boolean,    // true if user already predicted this round
    submittedDirection: string | null,  // "up" | "down" | null
    stats: {
      totalPredictions: number,
      correctPredictions: number,
      accuracy: number,           // 0-100 (integer %)
      pendingCount: number,
    },
  },

  pollData: {
    longVotes: number,
    shortVotes: number,
    neutralVotes: number,
    userVote: string | null,      // User's latest poll vote direction, or null
  },
}
```

---

### `getHubData` Full Response Shape

**Endpoint:** `GET /api/hub`

```typescript
{
  activeCompetition: null | {
    id: number,
    slug: string,
    title: string,
    competitionType: string,      // "regular"|"grand_final"|"special"|"practice"
    startTime: number,
    endTime: number,
    remainingSeconds: number,     // max(0, floor((endTime - now) / 1000))
    myRank: number,               // 0 if user not found in leaderboard
    myPnlPct: number,             // 0 if user not found
    participantCount: number,
    prizePool: number,
  },

  myRegistrations: Array<{
    competitionId: number,
    competitionTitle: string,     // From competition row
    competitionType: string,      // "regular"|"grand_final"|"special"|"practice"
    status: string,               // RegistrationStatus
    startTime: number,            // Competition start time (ms)
    appliedAt: number,            // Registration timestamp (ms)
  }>,

  upcomingCompetitions: Array<{
    id: number,
    slug: string,
    title: string,
    competitionNumber: number,
    competitionType: string,
    status: string,               // "announced"|"registration_open"|"registration_closed"
    maxParticipants: number,
    registeredCount: number,
    acceptedCount: number,
    prizePool: number,
    symbol: string,
    startTime: number,
    endTime: number,
    registrationOpenAt: number | null,
    registrationCloseAt: number | null,
    myRegistrationStatus: string | null,  // RegistrationStatus or null
  }>,
  // Max 5, sorted by startTime ascending

  season: null | {
    id: number,
    name: string,
    slug: string,
    matchesTotal: number,         // Always 15
    matchesCompleted: number,     // Count of user's match results
    mySeasonPoints: number,
    myRankTier: string,           // "iron"|"bronze"|"silver"|"gold"|"platinum"|"diamond"
    pointsToNextTier: number,     // max(0, nextTierMin - seasonPoints)
    grandFinalQualified: boolean, // seasonPoints >= 200
    grandFinalLine: number,       // Always 200
    pointsCurve: Array<never>,    // Always [] (empty)
  },

  recentResults: Array<{
    competitionId: number,
    competitionTitle: string,     // From competition row, "" if not found
    competitionNumber: number,    // From competition row, 0 if not found
    finalRank: number,
    totalPnl: number,
    totalPnlPct: number,
    totalWeightedPnl: number,
    tradesCount: number,
    winCount: number,
    lossCount: number,
    pointsEarned: number,
    prizeWon: number,
    prizeEligible: boolean,       // Coerced from DB integer with !!
    participantCount: number,     // Accepted registrations count for the competition
    createdAt: number,
  }>,
  // Max 5

  quickStats: {
    totalCompetitions: number,    // Total match results count
    winRate: number,              // round((totalWins / totalTrades) * 100), 0 if no trades
    totalPrizeWon: number,        // Sum of all prizeWon
    bestRank: number,             // Min of all finalRank, 0 if no results
    avgPnlPct: number,           // round(avg(totalPnlPct) * 10) / 10
  },

  unreadNotificationCount: number,
}
```

**Tier progression thresholds** (used for `pointsToNextTier`):
| Current Tier | Next Tier Min |
|---|---|
| iron | 100 (bronze) |
| bronze | 300 (silver) |
| silver | 600 (gold) |
| gold | 1000 (platinum) |
| platinum | 1500 (diamond) |
| diamond | Infinity |

---

### Analytics Full Response Shape

**Endpoint:** `GET /api/me/analytics`

```typescript
{
  summary: {
    totalTrades: number,
    winRate: number,            // round((wins/total) * 1000) / 10  (one decimal %)
    avgPnlPerTrade: number,    // round((totalPnl/total) * 100) / 100
    avgHoldDuration: number,   // round(mean holdDuration) in seconds
    avgHoldWeight: number,     // round(mean holdWeight * 100) / 100
    profitFactor: number,      // totalProfit / totalLoss (rounded to 2), 9999 if no losses but has profit, 0 if neither
  },

  pnlDistribution: Array<{
    bucket: string,            // One of: "<-5%", "-5%~-3%", "-3%~-1%", "-1%~0%", "0%~1%", "1%~3%", "3%~5%", ">5%"
    count: number,
    avgPnl: number,            // Rounded to 2 decimals
  }>,
  // Always exactly 8 buckets

  byDirection: {
    long: {
      count: number,
      wins: number,
      losses: number,
      totalPnl: number,       // Rounded to 2
      avgPnl: number,         // Rounded to 2
      avgHoldDuration: number, // Rounded to integer (seconds)
    },
    short: {
      count: number,
      wins: number,
      losses: number,
      totalPnl: number,
      avgPnl: number,
      avgHoldDuration: number,
    },
  },

  byCloseReason: {
    // Keys are only present if trades exist for that reason
    // Possible keys: "manual", "tp", "sl", "match_end", "time_limit"
    [reason: string]: {
      count: number,
      avgPnl: number,         // Rounded to 2
    },
  },

  holdDurationVsPnl: Array<{
    holdSeconds: number,       // Rounded to integer
    pnlPct: number,            // Rounded to 2
    holdWeight: number,
    direction: string,         // "long" | "short"
  }>,
  // Max 500 entries (sliced from most recent trades)

  equityCurve: Array<{
    tradeIndex: number,        // 1-indexed
    equity: number,            // Cumulative equity (starting from 5000), rounded to 2
    timestamp: number,         // closeTime (ms)
  }>,
  // Sorted by closeTime ascending

  streaks: {
    currentStreak: number,     // Positive = win streak, negative = loss streak
    longestWinStreak: number,
    longestLossStreak: number,
  },

  byHour: Array<{
    hour: number,              // 0-23 (UTC)
    count: number,
    avgPnl: number,            // Rounded to 2
    winRate: number,           // round((wins/count) * 1000) / 10 (one decimal %)
  }>,
  // Always exactly 24 entries (hours 0-23)
}
```

---

## 17. All Error Message Strings

Below is a comprehensive list of every error message string used across the codebase.

### Rate Limiter Messages
- `"Too many login attempts, try again later"`
- `"Too many trade requests, slow down"`
- `"Too many messages, slow down"`
- `"Too many requests"`

### Auth Errors
- `"Unauthorized"`
- `"Service temporarily unavailable"`
- `"Admin access required"`

### Zod Validation Error Messages (from route handlers)
- `"Invalid invite code or username"`
- `"Invalid username"`
- `"Invalid open payload"`
- `"Invalid TP/SL payload"`
- `"Invalid message"`
- `"Invalid event payload"`
- `"Invalid prediction payload"`
- `"Invalid poll payload"`
- `"Invalid payload"` (admin routes)
- `"Invalid status"` (transition route)
- `"Invalid profile data"` (with `details`)
- `"Invalid institution data"` (with `details`)

### Zod Custom Messages (from schema definitions)
- `"timestamp cannot be negative"` (systemRouter health input)
- `"title is required"` (systemRouter notifyOwner input)
- `"content is required"` (systemRouter notifyOwner input)

### OAuth Errors
- `"code and state are required"`
- `"openId missing from user info"`
- `"OAuth callback failed"`

### Shared Const Error Messages
- `"Please login (10001)"` (`UNAUTHED_ERR_MSG`)
- `"You do not have required permission (10002)"` (`NOT_ADMIN_ERR_MSG`)

### Engine Login Errors
- `"Username length must be between 2 and 20"`
- `"Invalid invite code"`
- `"Password must be at least 4 characters"`
- `"Invalid username"` (loginByUsername)
- `"Password is required"`
- `"Account not found. Please register with an invite code first."`
- `"Account has no password set. Please re-register with your invite code to set a password."`
- `"Incorrect password"`

### Trading Errors
- `"Close-only mode in last 30 minutes"`
- `"Invalid size"`
- `"Minimum position size is 10 USDT"`
- `"Price feed unavailable"`
- `"Market data is stale, trading temporarily disabled"`
- `"Take profit must be above current price for long positions"`
- `"Take profit must be below current price for short positions"`
- `"Stop loss must be below current price for long positions"`
- `"Stop loss must be above current price for short positions"`
- `"Only one position is allowed"`
- `"Trade limit reached"`
- `"Insufficient equity"`
- `"No open position"` (close and setTpSl)
- `"Position already closed"` (race condition in transaction)
- `"Take profit must be above entry price for long positions"` (setTpSl)
- `"Take profit must be below entry price for short positions"` (setTpSl)
- `"Stop loss must be below entry price for long positions"` (setTpSl)
- `"Stop loss must be above entry price for short positions"` (setTpSl)

### Prediction Errors
- `"Prediction window is closed"`
- `"Already submitted prediction for this round"`

### Competition Engine Errors
- `"Competition not found"`
- `"Cannot transition from \"<current>\" to \"<target>\""`
- `"Registration is not open"`
- `"Account not found"`
- `"Minimum <N> season points required"`
- `"Minimum <tier> tier required"`
- `"Already registered"`
- `"Competition is full"`
- `"Not registered"`
- `"Already withdrawn"`
- `"Cannot withdraw from an active or completed competition"`
- `"Registration not found"`
- `"Cannot review registration with status \"<status>\""`

### Resource Not Found Errors
- `"Competition not found"` (GET by slug)
- `"User not found"` (GET user profile)
- `"Not found"` (admin duplicate)

### Generic 500 Error Pattern
All routes that catch errors pass the message through:
```json
{ "error": "<Error.message>" }
```

---

### Notification Type Strings & Messages

These are the notification types created as side effects:

| Type | Title | Message Template | ActionUrl |
|---|---|---|---|
| `"competition_cancelled"` | `"<title> 已取消"` | `"参赛人数不足（需要<min>人，仅<count>人报名）"` | `"/competitions"` |
| `"competition_started"` | `"<title> 已开始！"` | `"比赛已开始，点击进入交易"` | `"/arena/<compId>"` |
| `"competition_ended"` | `"<title> 已结束"` | `"第<rank>名 · PnL <+/->X.X% · +<pts>pts[ · 奖金 <amt>U]"` | `"/results/<compId>"` |
| `"registration_accepted"` | `"入选通知"` | `"你已入选 <title>！"` | `"/competitions/<slug>"` |
| `"registration_rejected"` | `"未入选通知"` | `"很遗憾，<title> 名额已满"` | `"/competitions"` |

---

### `parseIntParam` Helper (competition-routes.ts)

Used for parsing `:id` URL parameters in admin routes. Throws `"Invalid ID parameter"` if the value is not a positive integer.

---

### Background Processes

**Tick timer** (every 1 second):
- `engine.tick()`: calls `rotateMatchIfNeeded()`, `autoCloseByTpSl()`, `resolvePredictions()`
- `competitionEngine.tick()`: calls `autoTransitions(now)`, `tickLiveCompetitions(now)`

**Cleanup timer** (every 1 hour):
- `cleanupExpiredSessions()`
- `cleanupOldBehaviorEvents()`
- `cleanupOldChatMessages()`

**Leaderboard cache TTL:** 3000ms (3 seconds). Cache key is `matchId`.

**Rank snapshot refresh rate:** Every 5000ms (5 seconds minimum between refreshes).

**Prediction system timing:**
- Prediction window: first 60 seconds of each UTC hour
- Resolution window: 300-330 seconds past each UTC hour (5-5.5 minutes)
- Round key format: `"YYYY-MM-DDTHH:00"` (UTC)