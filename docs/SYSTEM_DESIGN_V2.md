# Otter Trader Trading Arena — 完整系统设计 v2.0

> 从 "永动机竞技场" 转型为 "赛事运营平台"
> 比赛是稀缺资源，需要被排期、管理、分配

### 实施状态: ✅ 全部完成 (2026-03-04)

所有 7 个 Phase 已实施。代码编译零错误。详见 `todo.md` 和 `status-notes.md`。

---

## 目录

1. [系统概览与核心转变](#1-系统概览与核心转变)
2. [完整数据模型](#2-完整数据模型)
3. [竞赛生命周期引擎](#3-竞赛生命周期引擎)
4. [API 完整设计](#4-api-完整设计)
5. [页面架构与路由](#5-页面架构与路由)
6. [各页面详细设计](#6-各页面详细设计)
7. [通知系统](#7-通知系统)
8. [管理后台](#8-管理后台)
9. [地区与高校统计展示系统](#9-地区与高校统计展示系统)
10. [交易分析系统](#10-交易分析系统)
11. [成就系统](#11-成就系统)
12. [移动端设计](#12-移动端设计)
13. [前端架构改造](#13-前端架构改造)
14. [实施路线图](#14-实施路线图)

---

## 1. 系统概览与核心转变

### 1.1 模型对比

| 维度 | 当前 (v1) | 新模型 (v2) |
|------|-----------|-------------|
| 比赛创建 | `ensureActiveMatch()` 自动轮转 | 管理员预排期，手动或定时触发 |
| 参赛方式 | 注册即参赛（invite code） | 报名 → 审核 → 入选 → 参赛 |
| 比赛间隙 | 不存在（永远有一场在进行） | 核心体验：浏览赛程、回顾、准备 |
| 用户首页 | 直接进 TradingPage | HubPage 赛事大厅 |
| 管理能力 | 无 | 完整后台：创建/审核/调度 |
| 通知 | 无 | 全生命周期通知 |
| 用户画像 | 仅 username | 国家/地区/高校/专业 |
| 展示面 | 无 | 地区排行、高校排行、公开统计 |

### 1.2 用户状态机

```
空闲 ──(报名)──→ 已报名待审 ──(审核通过)──→ 已入选
  ↑                  │                          │
  │              (被拒绝)                    (比赛开始)
  │                  │                          ↓
  │                  ↓                       比赛中
  │               空闲                          │
  │                                        (比赛结束)
  │                                             ↓
  └──────────(查看下一场)←──── 赛后结算 ←── 结算中
```

### 1.3 竞赛状态机

```
draft → announced → registration_open → registration_closed → live → settling → completed
                                                                        ↘ cancelled (任何阶段)
```

---

## 2. 完整数据模型

### 2.1 新增表

#### `seasons` — 赛季

```sql
CREATE TABLE seasons (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(64) NOT NULL,          -- "2026年3月赛季"
  slug            VARCHAR(32) NOT NULL UNIQUE,   -- "2026-03"
  status          VARCHAR(16) NOT NULL DEFAULT 'upcoming',
                  -- 'upcoming' | 'active' | 'completed'
  regularMatchCount INT NOT NULL DEFAULT 15,
  grandFinalEnabled TINYINT NOT NULL DEFAULT 1,
  pointsDecayFactor DOUBLE NOT NULL DEFAULT 0.8, -- 上赛季积分衰减系数
  startDate       BIGINT NOT NULL,               -- 首场开始时间 ms
  endDate         BIGINT NOT NULL,               -- 末场结束时间 ms
  createdAt       BIGINT NOT NULL,
  updatedAt       BIGINT NOT NULL
);
```

#### `competitions` — 竞赛（替代 matches）

```sql
CREATE TABLE competitions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  seasonId        INT NOT NULL,                  -- FK → seasons
  name            VARCHAR(128) NOT NULL,         -- "第7场常规赛"
  description     TEXT,                          -- 比赛描述
  competitionNumber INT NOT NULL,                -- 赛季内序号 1-15, 16=GF
  type            VARCHAR(16) NOT NULL DEFAULT 'regular',
                  -- 'regular' | 'grand_final' | 'special' | 'practice'
  status          VARCHAR(24) NOT NULL DEFAULT 'draft',
                  -- 'draft' | 'announced' | 'registration_open'
                  -- | 'registration_closed' | 'live' | 'settling'
                  -- | 'completed' | 'cancelled'

  -- 时间线
  registrationOpenAt  BIGINT,                    -- 报名开始 ms
  registrationCloseAt BIGINT,                    -- 报名截止 ms
  startTime           BIGINT NOT NULL,           -- 比赛开始 ms
  endTime             BIGINT NOT NULL,           -- 比赛结束 ms

  -- 容量
  maxParticipants     INT NOT NULL DEFAULT 50,
  minParticipants     INT NOT NULL DEFAULT 5,

  -- 交易规则（每场可独立配置，覆盖默认值）
  -- symbol 支持所有 Binance USDⓈ-M 永续合约 (USDT/USDC)
  -- 币对列表从 fapi/v1/exchangeInfo 动态获取，精度自动匹配
  symbol              VARCHAR(16) NOT NULL DEFAULT 'SOLUSDT',
  startingCapital     DOUBLE NOT NULL DEFAULT 5000,
  maxTradesPerMatch   INT NOT NULL DEFAULT 40,
  closeOnlySeconds    INT NOT NULL DEFAULT 1800,
  feeRate             DOUBLE NOT NULL DEFAULT 0.0005,

  -- 奖金
  prizePool           DOUBLE NOT NULL DEFAULT 500,
  prizeTableJson      TEXT,                      -- JSON 覆盖默认奖金表
  pointsTableJson     TEXT,                      -- JSON 覆盖默认积分表

  -- 参赛资格门槛
  requireMinSeasonPoints INT NOT NULL DEFAULT 0, -- GF 可设为 200
  requireMinTier      VARCHAR(16),               -- 'gold' 等段位门槛
  inviteOnly          TINYINT NOT NULL DEFAULT 0,-- 仅受邀参赛

  -- 管理
  createdBy           INT,                       -- admin arenaAccountId
  createdAt           BIGINT NOT NULL,
  updatedAt           BIGINT NOT NULL,

  INDEX idx_comp_season (seasonId),
  INDEX idx_comp_status (status),
  INDEX idx_comp_start (startTime)
);
```

#### `competition_registrations` — 报名

```sql
CREATE TABLE competition_registrations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  competitionId   INT NOT NULL,
  arenaAccountId  INT NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',
                  -- 'pending' | 'accepted' | 'rejected'
                  -- | 'waitlisted' | 'withdrawn'
  appliedAt       BIGINT NOT NULL,
  reviewedAt      BIGINT,
  reviewedBy      INT,                           -- admin arenaAccountId
  adminNote       TEXT,
  priority        INT NOT NULL DEFAULT 0,        -- 排序用（可按 seasonPoints 自动算）

  UNIQUE INDEX idx_reg_unique (competitionId, arenaAccountId),
  INDEX idx_reg_comp_status (competitionId, status),
  INDEX idx_reg_account (arenaAccountId)
);
```

#### `match_results` — 比赛结果

```sql
CREATE TABLE match_results (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  competitionId       INT NOT NULL,
  arenaAccountId      INT NOT NULL,
  finalRank           INT NOT NULL,
  totalPnl            DOUBLE NOT NULL DEFAULT 0,
  totalPnlPct         DOUBLE NOT NULL DEFAULT 0,
  totalWeightedPnl    DOUBLE NOT NULL DEFAULT 0,
  tradesCount         INT NOT NULL DEFAULT 0,
  winCount            INT NOT NULL DEFAULT 0,
  lossCount           INT NOT NULL DEFAULT 0,
  bestTradePnl        DOUBLE,
  worstTradePnl       DOUBLE,
  avgHoldDuration     DOUBLE,                    -- 平均持仓秒数
  avgHoldWeight       DOUBLE,
  pointsEarned        INT NOT NULL DEFAULT 0,
  prizeWon            DOUBLE NOT NULL DEFAULT 0,
  prizeEligible       TINYINT NOT NULL DEFAULT 0,
  rankTierAtTime      VARCHAR(16),               -- 结算时段位快照
  finalEquity         DOUBLE NOT NULL DEFAULT 5000,
  closeReasonStats    TEXT,                       -- JSON {"manual":5,"tp":3,"sl":2,"match_end":1}
  createdAt           BIGINT NOT NULL,

  UNIQUE INDEX idx_mr_unique (competitionId, arenaAccountId),
  INDEX idx_mr_account (arenaAccountId),
  INDEX idx_mr_rank (competitionId, finalRank)
);
```

#### `notifications` — 通知

```sql
CREATE TABLE notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  arenaAccountId  INT NOT NULL,
  type            VARCHAR(32) NOT NULL,
                  -- 'registration_accepted' | 'registration_rejected'
                  -- | 'competition_reminder' | 'competition_started'
                  -- | 'competition_ended' | 'achievement_unlocked'
                  -- | 'tier_promotion' | 'gf_qualified'
                  -- | 'season_summary' | 'registration_opened' | 'system'
  title           VARCHAR(128) NOT NULL,
  message         TEXT NOT NULL,
  competitionId   INT,                           -- 关联竞赛（可选）
  actionUrl       VARCHAR(256),                  -- 点击跳转 URL
  isRead          TINYINT NOT NULL DEFAULT 0,
  createdAt       BIGINT NOT NULL,

  INDEX idx_notif_account (arenaAccountId, isRead, createdAt)
);
```

#### `user_achievements` — 成就

```sql
CREATE TABLE user_achievements (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  arenaAccountId  INT NOT NULL,
  achievementKey  VARCHAR(64) NOT NULL,          -- 'first_win', 'streak_5', 'diamond_tier'
  unlockedAt      BIGINT NOT NULL,
  competitionId   INT,                           -- 在哪场比赛解锁的
  metadata        TEXT,                          -- JSON 附加信息

  UNIQUE INDEX idx_ach_unique (arenaAccountId, achievementKey),
  INDEX idx_ach_account (arenaAccountId)
);
```

#### `institutions` — 高校/机构

```sql
CREATE TABLE institutions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(128) NOT NULL,         -- "清华大学"
  nameEn          VARCHAR(128),                  -- "Tsinghua University"
  shortName       VARCHAR(32),                   -- "清华" / "THU"
  type            VARCHAR(16) NOT NULL DEFAULT 'university',
                  -- 'university' | 'high_school' | 'company' | 'organization' | 'other'
  country         VARCHAR(2) NOT NULL,           -- ISO 3166-1 alpha-2: "CN", "US"
  region          VARCHAR(64),                   -- 省/州: "北京", "California"
  city            VARCHAR(64),
  logoUrl         VARCHAR(512),
  verified        TINYINT NOT NULL DEFAULT 0,    -- 是否已验证
  memberCount     INT NOT NULL DEFAULT 0,        -- 冗余计数（定期更新）
  createdAt       BIGINT NOT NULL,

  INDEX idx_inst_country (country),
  INDEX idx_inst_type (type),
  FULLTEXT INDEX idx_inst_name (name, nameEn)
);
```

#### `user_profiles` — 用户画像

```sql
CREATE TABLE user_profiles (
  arenaAccountId  INT PRIMARY KEY,               -- 1:1 关联 arena_accounts
  displayName     VARCHAR(64),                   -- 展示名称（可与 username 不同）
  avatarUrl       VARCHAR(512),
  bio             VARCHAR(280),                  -- 简介
  country         VARCHAR(2),                    -- ISO alpha-2
  region          VARCHAR(64),                   -- 省/州
  city            VARCHAR(64),
  institutionId   INT,                           -- FK → institutions（选择已有或新建）
  institutionName VARCHAR(128),                  -- 冗余存储，搜索方便
  department      VARCHAR(128),                  -- 院系/专业
  graduationYear  INT,                           -- 毕业年份
  participantType VARCHAR(16) NOT NULL DEFAULT 'independent',
                  -- 'student' | 'professional' | 'independent'
  socialLinks     TEXT,                          -- JSON {"twitter":"...","telegram":"..."}
  isProfilePublic TINYINT NOT NULL DEFAULT 1,
  updatedAt       BIGINT NOT NULL,

  INDEX idx_profile_country (country),
  INDEX idx_profile_institution (institutionId)
);
```

### 2.2 修改现有表

#### `arena_accounts` — 不变

保留 `seasonPoints`、`capital`、`inviteCode` 等字段。
`inviteCode` 仍然控制**平台准入**，`competition_registrations` 控制**比赛准入**。

#### `positions` — 加 `competitionId`

```sql
ALTER TABLE positions ADD COLUMN competitionId INT NOT NULL AFTER arenaAccountId;
ALTER TABLE positions DROP INDEX arenaAccountId;  -- 去掉原来的 unique
ALTER TABLE positions ADD UNIQUE INDEX idx_pos_account_comp (arenaAccountId, competitionId);
```

#### `trades` — `matchId` 语义改为 `competitionId`

已有的 `matchId` 字段在 v2 中语义变为 `competitionId`。
新代码中使用 `competitionId` 别名，数据库列名保持 `matchId` 避免迁移。

#### `chat_messages` — 加 `competitionId`

```sql
ALTER TABLE chat_messages ADD COLUMN competitionId INT AFTER arenaAccountId;
ALTER TABLE chat_messages ADD INDEX idx_chat_comp (competitionId, timestamp);
```

#### `predictions` — `matchId` 语义同 trades

保持列名 `matchId`，语义为 `competitionId`。

---

## 3. 竞赛生命周期引擎

### 3.1 状态转换函数

替换当前 `rotateMatchIfNeeded()`，改为显式状态机：

```typescript
class CompetitionEngine {
  // 每秒 tick，检查时间驱动的自动转换
  async tick() {
    const now = Date.now();
    await this.autoTransitions(now);
    await this.tickLiveCompetitions(now);
  }

  // 时间驱动的自动状态转换
  async autoTransitions(now: number) {
    // announced → registration_open（到了报名开始时间）
    const toOpen = await db.query(
      'competitions WHERE status = "announced" AND registrationOpenAt <= ?', [now]
    );
    for (const comp of toOpen) {
      await this.transitionTo(comp.id, 'registration_open');
      await this.notifyRegistrationOpen(comp);
    }

    // registration_open → registration_closed（到了报名截止时间）
    const toClose = await db.query(
      'competitions WHERE status = "registration_open" AND registrationCloseAt <= ?', [now]
    );
    for (const comp of toClose) {
      await this.transitionTo(comp.id, 'registration_closed');
    }

    // registration_closed → live（到了比赛开始时间）
    const toStart = await db.query(
      'competitions WHERE status = "registration_closed" AND startTime <= ?', [now]
    );
    for (const comp of toStart) {
      await this.startCompetition(comp);
    }
  }

  // 对所有 live 竞赛执行交易引擎逻辑
  async tickLiveCompetitions(now: number) {
    const liveComps = await db.query('competitions WHERE status = "live"');
    for (const comp of liveComps) {
      // TP/SL 自动平仓
      await this.autoCloseByTpSl(comp.id);
      // 预测结算
      await this.resolvePredictions(comp.id);
      // 比赛到期
      if (now >= comp.endTime) {
        await this.settleCompetition(comp);
      }
    }
  }

  // 比赛开始
  async startCompetition(comp: Competition) {
    // 验证最低参赛人数
    const acceptedCount = await countRegistrations(comp.id, 'accepted');
    if (acceptedCount < comp.minParticipants) {
      await this.transitionTo(comp.id, 'cancelled');
      await this.notifyCancelled(comp, '参赛人数不足');
      return;
    }

    await this.transitionTo(comp.id, 'live');

    // 通知所有已入选选手
    const accepted = await getAcceptedRegistrations(comp.id);
    for (const reg of accepted) {
      await insertNotification(reg.arenaAccountId, {
        type: 'competition_started',
        title: `${comp.name} 已开始！`,
        message: '比赛已开始，点击进入交易',
        competitionId: comp.id,
        actionUrl: `/arena/${comp.id}`,
      });
    }
  }

  // 比赛结算（核心函数）
  async settleCompetition(comp: Competition) {
    await this.transitionTo(comp.id, 'settling');

    // 1. 强平所有仓位
    const openPositions = await getPositionsForCompetition(comp.id);
    for (const pos of openPositions) {
      await this.closePositionInternal(pos, 'match_end');
    }

    // 2. 构建最终排行榜
    const leaderboard = await this.buildLeaderboard(comp.id);

    // 3. 写入 match_results
    for (const row of leaderboard) {
      const trades = await getTradesForUserMatch(row.arenaAccountId, comp.id);
      const wins = trades.filter(t => t.pnl > 0);
      const losses = trades.filter(t => t.pnl < 0);
      const closeReasons: Record<string, number> = {};
      for (const t of trades) {
        closeReasons[t.closeReason] = (closeReasons[t.closeReason] || 0) + 1;
      }

      await insertMatchResult({
        competitionId: comp.id,
        arenaAccountId: row.arenaAccountId,
        finalRank: row.rank,
        totalPnl: row.pnl,
        totalPnlPct: row.pnlPct,
        totalWeightedPnl: row.weightedPnl,
        tradesCount: trades.length,
        winCount: wins.length,
        lossCount: losses.length,
        bestTradePnl: trades.length ? Math.max(...trades.map(t => t.pnl)) : 0,
        worstTradePnl: trades.length ? Math.min(...trades.map(t => t.pnl)) : 0,
        avgHoldDuration: trades.length
          ? trades.reduce((s, t) => s + t.holdDuration, 0) / trades.length : 0,
        avgHoldWeight: trades.length
          ? trades.reduce((s, t) => s + t.holdWeight, 0) / trades.length : 0,
        pointsEarned: row.matchPoints,
        prizeWon: row.prizeAmount,
        prizeEligible: row.prizeEligible ? 1 : 0,
        rankTierAtTime: row.rankTier,
        finalEquity: comp.startingCapital + row.pnl,
        closeReasonStats: JSON.stringify(closeReasons),
      });
    }

    // 4. 累加赛季积分
    for (const row of leaderboard) {
      if (row.matchPoints > 0) {
        await updateSeasonPoints(row.arenaAccountId, row.matchPoints);
      }
    }

    // 5. 检查成就 + 段位变化
    await this.processAchievementsAndTierChanges(comp, leaderboard);

    // 6. 发送结算通知
    for (const row of leaderboard) {
      await insertNotification(row.arenaAccountId, {
        type: 'competition_ended',
        title: `${comp.name} 已结束`,
        message: `第${row.rank}名 · PnL ${row.pnlPct > 0 ? '+' : ''}${row.pnlPct.toFixed(1)}% · ${row.prizeAmount > 0 ? `奖金 ${row.prizeAmount}U` : `积分 +${row.matchPoints}`}`,
        competitionId: comp.id,
        actionUrl: `/results/${comp.id}`,
      });
    }

    // 7. 标记完成
    await this.transitionTo(comp.id, 'completed');
  }

  // 交易验证增强
  async openPosition(arenaAccountId: number, competitionId: number, input: OpenInput) {
    const comp = await getCompetition(competitionId);
    if (!comp || comp.status !== 'live')
      throw new Error('Competition is not active');

    const reg = await getRegistration(competitionId, arenaAccountId);
    if (!reg || reg.status !== 'accepted')
      throw new Error('You are not a participant in this competition');

    const now = Date.now();
    if (now >= comp.endTime - comp.closeOnlySeconds * 1000)
      throw new Error('Close-only mode');

    // ... 其余逻辑与现有 engine.ts 相同
  }
}
```

### 3.2 管理员操作

Admin 可在任何阶段手动触发状态转换：
- `POST /api/admin/competitions/:id/announce` — draft → announced
- `POST /api/admin/competitions/:id/open-registration` — → registration_open
- `POST /api/admin/competitions/:id/close-registration` — → registration_closed
- `POST /api/admin/competitions/:id/start` — 手动开始（跳过等待 startTime）
- `POST /api/admin/competitions/:id/cancel` — 任何阶段 → cancelled

---

## 4. API 完整设计

### 4.1 公开接口（无需登录）

```
GET /api/health
    → { ok: true, ts: number }

GET /api/seasons
    → Season[]

GET /api/seasons/:id
    → Season & { competitions: CompetitionSummary[], standings: SeasonStanding[] }

GET /api/competitions?seasonId=&status=&type=&page=1&limit=20
    → { items: CompetitionSummary[], total: number, page: number }

GET /api/competitions/:id
    → CompetitionDetail (内容因 status 而异)

GET /api/competitions/:id/leaderboard?limit=100
    → LeaderboardEntry[] (live 时实时计算, completed 时从 match_results 读)

GET /api/competitions/:id/participants
    → { username, rankTier, institutionName, country }[]
    只返回 status=accepted 的报名者的公开信息

-- 地区/高校统计（公开）
GET /api/stats/countries
    → CountryStats[]

GET /api/stats/institutions?type=university&country=&sort=points&limit=50
    → InstitutionStats[]

GET /api/stats/regions?country=CN
    → RegionStats[]
```

### 4.2 用户接口（需登录）

```
-- 报名
POST   /api/competitions/:id/register     → { registrationId, status: 'pending' }
DELETE /api/competitions/:id/register     → { ok: true }  (撤回)

-- Hub
GET /api/me/hub
    → HubData (见下方详细定义)

-- 个人数据
GET /api/me/profile                       → UserProfile & SeasonSummary
PUT /api/me/profile                       → 更新 user_profiles (country, institution, etc.)
    body: { country?, region?, city?, institutionId?, institutionName?,
            department?, graduationYear?, participantType?, bio?, socialLinks? }

GET /api/me/registrations                 → MyRegistration[]
GET /api/me/history?page=1&limit=10       → { items: MatchResult[], total }
GET /api/me/history/:competitionId        → MatchResultDetail & CompletedTrade[]
GET /api/me/analytics?period=season&seasonId=
    → AnalyticsData (详见第10节)
GET /api/me/achievements                  → UserAchievement[]
GET /api/me/notifications?page=1&limit=20 → { items: Notification[], unreadCount }
PUT /api/me/notifications/:id/read        → { ok: true }
PUT /api/me/notifications/read-all        → { ok: true }

-- 机构搜索（用于 profile 编辑时的自动补全）
GET /api/institutions/search?q=清华&limit=10  → Institution[]

-- 比赛中接口（仅 live 状态可用）
GET  /api/arena/:competitionId/state
POST /api/arena/:competitionId/trade/open
POST /api/arena/:competitionId/trade/close
POST /api/arena/:competitionId/trade/tpsl
POST /api/arena/:competitionId/chat
POST /api/arena/:competitionId/prediction
POST /api/arena/:competitionId/poll

-- 查看其他用户的公开资料
GET /api/users/:username/profile          → PublicProfile (如果 isProfilePublic)
GET /api/users/:username/history          → MatchResult[] (公开的比赛成绩)
```

### 4.3 管理员接口

```
-- 赛季管理
POST /api/admin/seasons                   → Season
PUT  /api/admin/seasons/:id               → Season

-- 竞赛管理
POST /api/admin/competitions              → Competition
PUT  /api/admin/competitions/:id          → Competition
POST /api/admin/competitions/:id/announce
POST /api/admin/competitions/:id/open-registration
POST /api/admin/competitions/:id/close-registration
POST /api/admin/competitions/:id/start    → 手动启动
POST /api/admin/competitions/:id/cancel   → 取消
POST /api/admin/competitions/:id/duplicate → 复制为新比赛（快速排期）

-- 报名审核
GET  /api/admin/competitions/:id/registrations?status=pending
     → Registration[] (含用户 profile、历史战绩)
PUT  /api/admin/registrations/:id
     body: { status: 'accepted'|'rejected'|'waitlisted', note? }
POST /api/admin/competitions/:id/registrations/batch
     body: { action: 'accept'|'reject', ids: number[] }
POST /api/admin/competitions/:id/registrations/auto-accept
     body: { strategy: 'all' | 'by_points' | 'first_come', limit?: number }

-- 机构管理
POST /api/admin/institutions              → Institution
PUT  /api/admin/institutions/:id          → Institution
POST /api/admin/institutions/:id/verify   → 标记已验证

-- 邀请码管理（平台准入仍用 invite code）
POST /api/admin/invite-codes/generate
     body: { count: number, prefix?: string }
     → { codes: string[] }
GET  /api/admin/invite-codes?status=unused|consumed
     → InviteCode[]
```

### 4.4 核心返回类型

#### HubData

```typescript
interface HubData {
  // 当前正在参加的比赛（如果有）
  activeCompetition: {
    id: number;
    name: string;
    type: CompetitionType;
    startTime: number;
    endTime: number;
    remainingSeconds: number;
    myRank: number;
    myPnlPct: number;
    participantCount: number;
    prizePool: number;
  } | null;

  // 我的所有未完结报名
  myRegistrations: Array<{
    competitionId: number;
    competitionName: string;
    competitionType: CompetitionType;
    startTime: number;
    status: RegistrationStatus;
    appliedAt: number;
  }>;

  // 即将到来的比赛（最近5场 non-completed）
  upcomingCompetitions: Array<{
    id: number;
    name: string;
    type: CompetitionType;
    status: CompetitionStatus;
    registrationOpenAt: number;
    registrationCloseAt: number;
    startTime: number;
    endTime: number;
    maxParticipants: number;
    currentRegistrations: number;  // 已报名人数
    acceptedCount: number;         // 已入选人数
    myRegistrationStatus: RegistrationStatus | null;
  }>;

  // 赛季进度
  season: {
    id: number;
    name: string;
    slug: string;
    matchesTotal: number;
    matchesCompleted: number;
    mySeasonPoints: number;
    myRankTier: RankTier;
    nextTier: { tier: RankTier; minPoints: number } | null;
    pointsToNextTier: number;
    grandFinalQualified: boolean;
    grandFinalLine: number;
    pointsCurve: Array<{ competitionNumber: number; pointsAfter: number }>;
  };

  // 最近比赛结果（最近5场）
  recentResults: Array<{
    competitionId: number;
    competitionName: string;
    competitionNumber: number;
    finalRank: number;
    totalPnlPct: number;
    pointsEarned: number;
    prizeWon: number;
    participantCount: number;
    completedAt: number;
  }>;

  // 快速统计
  quickStats: {
    totalCompetitions: number;
    winRate: number;
    totalPrizeWon: number;
    bestRank: number;
    avgPnlPct: number;
  };

  // 未读通知数
  unreadNotificationCount: number;
}
```

#### CompetitionDetail

```typescript
interface CompetitionDetail {
  id: number;
  seasonId: number;
  name: string;
  description: string | null;
  competitionNumber: number;
  type: CompetitionType;
  status: CompetitionStatus;

  // 时间
  registrationOpenAt: number | null;
  registrationCloseAt: number | null;
  startTime: number;
  endTime: number;

  // 容量
  maxParticipants: number;
  minParticipants: number;
  registrationCount: number;
  acceptedCount: number;

  // 规则
  symbol: string;
  startingCapital: number;
  maxTradesPerMatch: number;
  closeOnlySeconds: number;
  feeRate: number;
  prizePool: number;
  prizeTable: PrizeTableEntry[];
  pointsTable: PointsTableEntry[];

  // 资格
  requireMinSeasonPoints: number;
  requireMinTier: RankTier | null;
  inviteOnly: boolean;

  // 我的状态
  myRegistrationStatus: RegistrationStatus | null;
  myRegistrationId: number | null;

  // 参赛者（公开信息）
  participants: Array<{
    username: string;
    rankTier: RankTier;
    seasonPoints: number;
    institutionName: string | null;
    country: string | null;
  }>;

  // 如果 completed
  results?: {
    topThree: LeaderboardEntry[];
    myResult: MatchResult | null;
    totalParticipants: number;
  };
}
```

---

## 5. 页面架构与路由

### 5.1 路由表

```typescript
// React Router v6
const routes = [
  // 公开
  { path: '/',                   element: <LandingPage /> },
  { path: '/login',              element: <LoginPage /> },

  // 需要登录 (ProtectedLayout)
  { path: '/hub',                element: <HubPage /> },
  { path: '/competitions',       element: <CompetitionsPage /> },
  { path: '/competitions/:id',   element: <CompetitionDetailPage /> },
  { path: '/arena/:competitionId', element: <TradingPage /> },
  { path: '/results/:competitionId', element: <ResultsPage /> },
  { path: '/profile',            element: <ProfilePage /> },
  { path: '/profile/edit',       element: <ProfileEditPage /> },
  { path: '/profile/history',    element: <MatchHistoryPage /> },
  { path: '/profile/analytics',  element: <AnalyticsPage /> },
  { path: '/profile/achievements', element: <AchievementsPage /> },
  { path: '/leaderboard',        element: <LeaderboardPage /> },
  { path: '/notifications',      element: <NotificationsPage /> },
  { path: '/users/:username',    element: <PublicProfilePage /> },

  // 公开统计页
  { path: '/stats',              element: <StatsOverviewPage /> },
  { path: '/stats/countries',    element: <CountryStatsPage /> },
  { path: '/stats/institutions', element: <InstitutionStatsPage /> },

  // 管理员 (AdminLayout)
  { path: '/admin/competitions',          element: <AdminCompetitionsPage /> },
  { path: '/admin/competitions/create',   element: <AdminCompetitionFormPage /> },
  { path: '/admin/competitions/:id',      element: <AdminCompetitionDetailPage /> },
  { path: '/admin/competitions/:id/registrations', element: <AdminRegistrationsPage /> },
  { path: '/admin/seasons',               element: <AdminSeasonsPage /> },
  { path: '/admin/institutions',          element: <AdminInstitutionsPage /> },
  { path: '/admin/invite-codes',          element: <AdminInviteCodesPage /> },
];
```

### 5.2 Layout 结构

```
AppLayout
├── PublicLayout          (Landing, Login — 无导航栏)
├── ProtectedLayout       (需登录的所有页面)
│   ├── GlobalNavBar      (顶部导航)
│   ├── <Outlet />        (页面内容)
│   └── MobileTabBar      (移动端底部 Tab)
├── ArenaLayout           (TradingPage — 全屏，自己的导航)
└── AdminLayout           (管理后台 — 侧边栏导航)
```

### 5.3 GlobalNavBar

```
Desktop:
┌───────────────────────────────────────────────────────────────┐
│  Otter Trader      [Hub] [赛程] [排行] [统计]    🔔(3) 💎User ⚙│
└───────────────────────────────────────────────────────────────┘

Mobile:
┌───────────────────────────────────────────────────────────────┐
│  Otter Trader                               🔔(3) ☰             │
└───────────────────────────────────────────────────────────────┘
底部:
┌───────────────────────────────────────────────────────────────┐
│  [🏠Hub]  [📅赛程]  [⚔比赛]  [📊排行]  [👤我的]              │
└───────────────────────────────────────────────────────────────┘
```

比赛进行中时，"⚔比赛" tab 有红点/脉冲动画。

---

## 6. 各页面详细设计

### 6.1 HubPage — 赛事大厅（登录后首页）

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─ Hero Card (根据用户状态条件渲染) ─────────────────────┐ │
│  │                                                        │ │
│  │  状态A: 正在比赛                                        │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ 🟢 LIVE · 第7场常规赛           剩余 14:23:05    │  │ │
│  │  │ Rank #3 / 45人 · PnL +12.5% · 奖池 500U         │  │ │
│  │  │                           [━━ 进入比赛 → ━━]     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  状态B: 已入选，倒计时                                   │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ ⏳ 第8场即将开始                倒计时 02:15:30   │  │ │
│  │  │ 你已入选 ✅ · 50人参赛 · {symbol} · 500U          │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  状态C: 无活跃比赛                                      │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ 📅 下一场: 第8场常规赛 · 3月5日 19:00             │  │ │
│  │  │ 报名中 · 42/50人 · 剩余8个名额                    │  │ │
│  │  │                           [━━ 立即报名 → ━━]     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ 赛季进度 ────────────────────────────────────────────┐ │
│  │ 2026年3月  ①✓②✓③✓④✓⑤✓⑥✓⑦● ⑧○ ⑨○ ... ⑮○ [GF]      │ │
│  │ 450pts 🥇黄金 ━━━━━━━━━━░░░░░ → 铂金(1000pts)        │ │
│  │ Grand Final: ✅ 已达标 (≥200pts)                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ 我的报名 ─────────────────────────────────────────────┐│
│  │ #8  3/5 19:00  ⏳待审核  42/50  [撤回]                 ││
│  │ #9  3/6 19:00  ✅已入选  50/50  [详情]                 ││
│  │ #10 3/7 19:00  📅即将开放报名    [设提醒]               ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ 最近战绩 ──────────────┬─ 快速统计 ─────────────────┐ │
│  │ #6 Rank3  +12.5% 50pts │ 赛季胜率: 58.1%            │ │
│  │ #5 Rank15 -3.2%  30pts │ 总交易: 186笔              │ │
│  │ #4 Rank8  +5.1%  50pts │ 总奖金: 156 USDT           │ │
│  │        [查看全部 →]     │ 最佳排名: #1               │ │
│  └─────────────────────────┴─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 CompetitionsPage — 赛程

双视图：日历 + 列表。

日历视图以月为单位，每天格子里标记比赛状态（✓已完成 / 🟢进行中 / ●报名中 / ○已安排）。

列表视图每个比赛是一张卡片：
- 标题、时间、奖池、交易对
- 状态标签（报名中 / 即将开始 / 进行中 / 已结束）
- 报名人数 / 名额
- 我的报名状态
- 操作按钮（报名 / 撤回 / 进入比赛 / 查看结果）

筛选器：按状态、按类型（常规/GF/特别赛/练习赛）

### 6.3 CompetitionDetailPage — 竞赛详情

**根据 `status` 渲染不同内容：**

#### registration_open / announced

```
┌────────────────────────────────────────────────────────┐
│ 第8场常规赛                            🟡 报名中         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📅 比赛时间: 2026-03-05 19:00 ~ 2026-03-06 19:00     │
│  ⏱ 时长: 24小时                                       │
│  💰 奖池: 500 USDT                                    │
│  📊 交易对: {base}/{quote} · 初始资金: 5,000 USDT       │
│  👥 名额: 50人 (已报名 42 / 已入选 34)                  │
│  📋 报名截止: 3月5日 17:00 (还剩 1天12小时)             │
│                                                        │
│  ┌─ 规则摘要 ────────────────────────────────────────┐ │
│  │ · 最多40笔交易 · 最后30分钟仅平仓                  │ │
│  │ · 持仓≥5笔方可获奖 · 费率0.05%/边                 │ │
│  │ · 段位杠杆适用 · 持仓权重 0.5x~1.1x               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─ 奖金分配 ────────────────────────────────────────┐ │
│  │ 🥇#1: 55U  🥈#2: 35U  🥉#3: 25U                 │ │
│  │ #4-5: 15U  #6-10: 10U  #11-20: 6U ...            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
│  [━━━━━━━━━━━━ 立即报名 ━━━━━━━━━━━━]                  │
│                                                        │
│  ┌─ 已报名选手 (42人) ───────────────────────────────┐ │
│  │ TraderX 💎 · 清华大学 🇨🇳                          │ │
│  │ AlphaBot 💠 · MIT 🇺🇸                             │ │
│  │ CryptoK 🥇 · 北京大学 🇨🇳                         │ │
│  │ ...                                                │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

#### live（我是参赛者）

```
┌────────────────────────────────────────────────────────┐
│ 第7场常规赛                            🟢 进行中        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ⏱ 剩余 14:23:05                                     │
│  你的排名: #3 / 45人 · PnL +12.5%                     │
│                                                        │
│  [━━━━━━━━━━━━ 进入比赛 → ━━━━━━━━━━━━]               │
│                                                        │
│  ┌─ 实时排行榜 (Top 10) ─────────────────────────────┐ │
│  │ #1 TraderX    +18.2%  💎                           │ │
│  │ #2 AlphaBot   +15.1%  💠                           │ │
│  │ #3 你 ←       +12.5%  🥇                           │ │
│  │ ...                                                │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

#### live（我不是参赛者）— 观战模式

只显示排行榜（只读），不能交易。

#### completed

显示完整结果页（同 ResultsPage 内容）。

### 6.4 TradingPage — 改造

**核心改动**：
1. 接受 `competitionId` 路由参数
2. `useArena(token, competitionId)` 轮询竞赛专属状态
3. StatusBar 加 "← 返回Hub" 按钮
4. 比赛结束检测 → 显示结算 overlay → 可跳转 ResultsPage

**结算 Overlay**（比赛结束时的全屏弹窗）：
```
┌─────────────────────────────────────────────┐
│                                             │
│          🏆 比赛结束                         │
│                                             │
│          第7场常规赛                          │
│                                             │
│          你的排名                            │
│          ┌───────────┐                      │
│          │    #5     │  ← 数字翻滚动画       │
│          │   / 45人   │                      │
│          └───────────┘                      │
│                                             │
│     PnL: +8.3%     奖金: 15 USDT            │
│     积分: +50      段位: 🥇 → 🥇             │
│                                             │
│     [查看详细结果]  [返回Hub]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### 6.5 ResultsPage — 结算/结果

```
┌──────────────────────────────────────────────────────┐
│ 第7场常规赛 · 已完成 · 2026-03-04 ~ 03-05 · 45人     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ 领奖台 ─────────────────────────────────────┐   │
│  │           🥇 TraderX                          │   │
│  │            +18.2%                             │   │
│  │     🥈 AlphaBot    🥉 CryptoK                │   │
│  │      +15.1%         +12.8%                    │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ 你的成绩 ───────────────────────────────────┐   │
│  │ Rank #5/45  PnL +8.3% (+415U)  wPnL +398    │   │
│  │ 交易 12笔   WR 66.7%   积分 +50  奖金 15U    │   │
│  │                                               │   │
│  │ 段位: 🥇黄金 (450→500pts)                     │   │
│  │ ━━━━━━━━━━━━░░░░░░ 500/1000 → 铂金            │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ 交易摘要 ───────────────────────────────────┐   │
│  │ ✅ 最佳: LONG +3.2% (47min, 1.05x)           │   │
│  │ ❌ 最差: SHORT -2.1% (2min, 0.52x)           │   │
│  │ 平均持仓 18min · 平均weight 0.89x             │   │
│  │ 平仓: 🎯TP×4 🛑SL×2 ✋手动×5 ⏰超时×1          │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ 地区/高校亮点 ──────────────────────────────┐   │
│  │ 🇨🇳 中国选手 28人参赛，平均 +3.2%             │   │
│  │ 🏫 清华大学 5人参赛，最高 Rank #2              │   │
│  │ 🌍 本场覆盖 8个国家/地区                       │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ 完整排行 ───────────────────────────────────┐   │
│  │  #  选手      🏫     🌍  PnL%   积分  奖金    │   │
│  │  1 TraderX   清华    🇨🇳 +18.2%  100  55U    │   │
│  │  2 AlphaBot  MIT     🇺🇸 +15.1%  70   35U   │   │
│  │  5 你 ←      北大    🇨🇳 +8.3%   50   15U    │   │
│  │  ...                                          │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  [查看交易分析] [分享战绩] [返回Hub]                   │
└──────────────────────────────────────────────────────┘
```

### 6.6 ProfilePage — 个人仪表盘

```
┌──────────────────────────────────────────────────────────┐
│  ┌─ 用户卡片 ──────────┬─ 赛季积分曲线 ─────────────┐   │
│  │                      │                             │   │
│  │  👤 Username          │  (折线图)                   │   │
│  │  💎 Diamond (1520pts)│    /─────────              │   │
│  │  🇨🇳 中国 · 北京     │   /                        │   │
│  │  🏫 清华大学 · 计算机 │  /                         │   │
│  │                      │ /                           │   │
│  │  12场比赛            │                             │   │
│  │  注册 2026-02-15     │                             │   │
│  │  [编辑资料]          │                             │   │
│  │                      │                             │   │
│  └──────────────────────┴─────────────────────────────┘   │
│                                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │总比赛 │ │胜率   │ │总PnL │ │均持仓 │ │总奖金 │ │最佳名次│ │
│  │ 12   │ │58.1% │ │+2340 │ │22min │ │156U  │ │#1    │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
│                                                          │
│  [比赛历史] [交易分析] [成就]                              │
│                                                          │
│  ┌─ 最近比赛 ────────────────────────────────────────┐   │
│  │ #7 Rank#5  +8.3%   50pts  15U   3/4-3/5          │   │
│  │ #6 Rank#3  +12.5%  70pts  25U   3/3-3/4          │   │
│  │ #5 Rank#15 -3.2%   30pts  6U    3/2-3/3          │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ 成就 (8/24) ────────────────────────────────────┐   │
│  │ [✅首胜] [✅5连胜] [✅黄金] [✅10场] [🔒钻石] ...  │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 6.7 ProfileEditPage — 编辑资料

```
┌──────────────────────────────────────────────────────┐
│  编辑个人资料                                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  展示名称: [________________]                         │
│  简介:     [________________]                         │
│                                                      │
│  ── 地区信息 ──                                       │
│  国家/地区: [🇨🇳 中国         ▼]   (下拉选择)          │
│  省/州:     [北京            ▼]   (联动选择)          │
│  城市:      [________________]    (可选)             │
│                                                      │
│  ── 高校/机构 ──                                      │
│  身份类型:  (●) 学生  ( ) 职业  ( ) 独立              │
│  学校/机构: [清华大学_________] ← 搜索自动补全          │
│             检索到: 清华大学 (已验证 ✓)                │
│  院系/专业: [计算机科学________]                       │
│  毕业年份:  [2026    ▼]                              │
│                                                      │
│  ── 社交链接 ──                                       │
│  Twitter:   [________________]                       │
│  Telegram:  [________________]                       │
│  微信:      [________________]                       │
│                                                      │
│  ☐ 公开我的资料（允许其他用户查看）                     │
│                                                      │
│  [━━━━━━━━━ 保存 ━━━━━━━━━]                          │
└──────────────────────────────────────────────────────┘
```

**机构搜索自动补全**：
- 用户输入文字 → `GET /api/institutions/search?q=清华` → 下拉候选
- 如果列表中没有 → 允许手动输入新机构名 → 后台自动创建（unverified）
- admin 后续可验证和合并机构

### 6.8 MatchHistoryPage — 比赛历史

```
┌──────────────────────────────────────────────────────┐
│  比赛历史                      [赛季筛选▼] [排序▼]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ #7 常规赛 · 3/4-3/5 ─────────── completed ──┐  │
│  │ Rank #5/45 · +8.3% · wPnL +398 · 50pts · 15U │  │
│  │ 12笔交易 · WR 66.7% · 均持仓 18min             │  │
│  │ ▾ 展开交易明细                                  │  │
│  │  ┌───────────────────────────────────────────┐ │  │
│  │  │ #1 LONG  145.20→146.80 +1.1% 47min 🎯TP  │ │  │
│  │  │ #2 SHORT 146.50→147.10 -0.4% 2min  🛑SL  │ │  │
│  │  │ ...                                       │ │  │
│  │  └───────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ #6 常规赛 · 3/3-3/4 ─────────── completed ──┐  │
│  │ Rank #3/42 · +12.5% · wPnL +625 · 70pts · 25U│  │
│  │ ▸ 展开交易明细                                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [加载更多...]                                       │
└──────────────────────────────────────────────────────┘
```

### 6.9 LeaderboardPage — 排行榜

```
┌──────────────────────────────────────────────────────────┐
│  排行榜       [当前比赛] [赛季总分] [预测达人] [高校排行] │
├──────────────────────────────────────────────────────────┤
│  🔍 搜索用户... │ 筛选: [全部国家▼] [全部学校▼]          │
├──────────────────────────────────────────────────────────┤
│  段位分布:                                                │
│  Iron 45% ████████████████                               │
│  Bronze 30% ██████████                                   │
│  Silver 15% █████                                        │
│  Gold 7% ██ | Plat 2% █ | Diamond 1%                    │
├──────────────────────────────────────────────────────────┤
│  #  选手       🏫         🌍  PnL%   wPnL  积分  奖金    │
│  1  TraderX    清华大学    🇨🇳 +18.2%  +910  100  55U    │
│  2  AlphaBot   MIT        🇺🇸 +15.1%  +755  70   35U   │
│  3  你 ←       北京大学    🇨🇳 +12.8%  +640  70   25U   │
│  ...                                                     │
│  ──── 奖金线 (Top 100) ────                              │
│  101 UserABC   港大       🇭🇰  +0.2%  +10   5          │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

**高校排行 Tab：**

```
┌──────────────────────────────────────────────────────────┐
│  高校排行                   [大学▼] [全部国家▼] [排序▼]   │
├──────────────────────────────────────────────────────────┤
│  #  学校           🌍  人数  平均PnL%  胜率   最佳名次     │
│  1  清华大学        🇨🇳  15   +8.2%   62%    #1           │
│  2  MIT            🇺🇸  8    +7.1%   58%    #2           │
│  3  北京大学        🇨🇳  12   +6.5%   55%    #3           │
│  4  Stanford       🇺🇸  6    +5.8%   60%    #5           │
│  ...                                                     │
│                                                          │
│  点击展开 → 该校所有选手及其战绩                           │
└──────────────────────────────────────────────────────────┘
```

### 6.10 PublicProfilePage — 他人公开主页

```
/users/:username

与 ProfilePage 类似但只读，只显示公开信息。
可从排行榜点击用户名跳转到此页。
显示: username、段位、高校、国家、比赛历史、成就。
```

---

## 7. 通知系统

### 7.1 完整事件目录

| 触发事件 | type | title 模板 | message 模板 | actionUrl |
|---------|------|-----------|-------------|-----------|
| 报名被接受 | `registration_accepted` | "入选通知" | "你已入选{name}！比赛将于{time}开始" | `/competitions/{id}` |
| 报名被拒绝 | `registration_rejected` | "未入选通知" | "很遗憾，{name}名额已满" | `/competitions` |
| 候补转正 | `registration_waitlisted` | "候补通知" | "你被列入{name}的候补名单" | `/competitions/{id}` |
| 报名开放 | `registration_opened` | "报名开放" | "{name}现在开放报名，仅{n}个名额" | `/competitions/{id}` |
| 比赛即将开始 (1h前) | `competition_reminder` | "即将开始" | "{name}将在1小时后开始" | `/competitions/{id}` |
| 比赛开始 | `competition_started` | "比赛开始" | "{name}已开始！点击进入" | `/arena/{id}` |
| 比赛结束 | `competition_ended` | "比赛结束" | "第{rank}名 · {pnl}% · +{pts}pts · {prize}U" | `/results/{id}` |
| 成就解锁 | `achievement_unlocked` | "新成就" | "解锁: {achievement_name}" | `/profile/achievements` |
| 段位晋升 | `tier_promotion` | "段位晋升" | "晋升为{tier}！杠杆提升至{lev}x" | `/profile` |
| GF资格达标 | `gf_qualified` | "Grand Final" | "你已获得Grand Final参赛资格！" | `/profile` |
| 赛季总结 | `season_summary` | "赛季回顾" | "{month}赛季结束，最终排名第{rank}名" | `/profile/history` |
| 比赛取消 | `competition_cancelled` | "比赛取消" | "{name}已取消: {reason}" | `/competitions` |

### 7.2 前端实现

```typescript
// hooks/useNotifications.ts
function useNotifications(token: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 每30秒轮询
  useEffect(() => {
    const poll = async () => {
      const data = await apiRequest('/api/me/notifications?limit=5', { token });
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    };
    poll();
    const timer = setInterval(poll, 30000);
    return () => clearInterval(timer);
  }, [token]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
```

GlobalNavBar 中显示 🔔 + unreadCount badge。
点击展开下拉列表（最新5条），底部有 "查看全部" 链接到 `/notifications`。

---

## 8. 管理后台

### 8.1 AdminCompetitionsPage — 比赛管理主页

```
┌──────────────────────────────────────────────────────────┐
│  比赛管理                               [+ 创建比赛]      │
│  ──────                                                  │
│  [全部] [draft] [报名中] [进行中] [已完成] [已取消]        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ #8 常规赛 ─── registration_open ─────────────────┐  │
│  │ 3/5 19:00~3/6 19:00 · 42/50报名                   │  │
│  │ 8待审 · 34已通过 · 0拒绝                            │  │
│  │ [审核报名(8)] [关闭报名] [编辑] [取消比赛]           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ #9 常规赛 ─── announced ─────────────────────────┐  │
│  │ 3/6 19:00 · 报名将于 3/5 12:00 开放                │  │
│  │ [提前开放报名] [编辑] [取消]                         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ #7 常规赛 ─── live ─────────────────────────────┐   │
│  │ 进行中 · 剩余 14:23:05 · 45人参赛                  │   │
│  │ [查看实时排行] [强制结束]                            │   │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ #6 常规赛 ─── completed ─────────────────────────┐  │
│  │ 3/3-3/4 · 42人 · Winner: TraderX                  │  │
│  │ [查看结果] [复制为新比赛]                            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 8.2 创建比赛表单

```
┌──────────────────────────────────────────────────────────┐
│  创建比赛                                                 │
├──────────────────────────────────────────────────────────┤
│  基本信息                                                 │
│  名称:     [第8场常规赛__________]                         │
│  描述:     [________________________]                     │
│  类型:     (●)常规 ( )Grand Final ( )特别赛 ( )练习赛      │
│  赛季:     [2026年3月赛季 ▼]                              │
│  序号:     [8]                                            │
│                                                          │
│  时间排期                                                 │
│  报名开放: [2026-03-04 12:00 ▼]                          │
│  报名截止: [2026-03-05 17:00 ▼]                          │
│  比赛开始: [2026-03-05 19:00 ▼]                          │
│  比赛结束: [2026-03-06 19:00 ▼]                          │
│                                                          │
│  容量                                                    │
│  最大参赛: [50]   最低参赛: [5]                            │
│                                                          │
│  规则（留空使用默认）                                      │
│  交易对: [搜索下拉 ▼ 全部Binance USDⓈ-M永续]  初始资金: [5000] │
│  最大交易数: [40]   Close-Only: [1800]秒                  │
│  费率: [0.0005]                                          │
│  奖池: [500] USDT                                        │
│  自定义奖金表: [JSON编辑器]                                │
│                                                          │
│  参赛资格                                                 │
│  最低积分: [0] (Grand Final 设 200)                       │
│  最低段位: [无要求 ▼]                                     │
│  ☐ 仅受邀参赛                                            │
│                                                          │
│  [保存为草稿]  [保存并发布]                                │
└──────────────────────────────────────────────────────────┘
```

### 8.3 报名审核页

```
┌──────────────────────────────────────────────────────────┐
│  第8场 · 报名审核                                        │
│  已入选 34/50 · 待审 8 · 已拒 0                          │
│  [全部接受] [按积分排序自动选] [按先到先得选]               │
├──────────────────────────────────────────────────────────┤
│  ☐ │ 选手        │ 段位  │ 积分  │ 比赛数 │ 胜率  │ 🏫 │ 🌍 │ 操作     │
│  ─────────────────────────────────────────────────────── │
│  ☑ │ TraderX     │ 💎    │ 1520 │ 12    │ 62%  │清华│ 🇨🇳│ [✓] [✗] │
│  ☑ │ NewUser     │ ⚙️    │ 0    │ 0     │ --   │--  │ 🇺🇸│ [✓] [✗] │
│  ☑ │ CryptoK     │ 🥇    │ 650  │ 8     │ 55%  │北大│ 🇨🇳│ [✓] [✗] │
│  ...                                                     │
│  ──────────────────────────────────────────────────────── │
│  批量操作: [接受选中(3)] [拒绝选中]                        │
└──────────────────────────────────────────────────────────┘
```

### 8.4 AdminInstitutionsPage — 机构管理

管理已创建的高校/机构：合并重复、验证、编辑信息、上传logo。

---

## 9. 地区与高校统计展示系统

### 9.1 数据采集

**何时收集**：
1. 注册后首次访问 Hub → 弹出 profile 补全引导
2. 报名比赛时，如 profile 未完善 → 提示补全
3. 任何时候通过 Profile Edit 修改

**策略**：不强制，但通过 UI 引导鼓励完善。
可以在报名页面显示 "代表 🏫清华大学 参赛" 的展示，激发填写欲望。

### 9.2 统计聚合 API

#### `GET /api/stats/countries`

```typescript
interface CountryStats {
  country: string;           // "CN"
  countryName: string;       // "中国"
  flag: string;              // "🇨🇳"
  participantCount: number;  // 总参赛人数
  competitionCount: number;  // 总参赛场次
  avgPnlPct: number;         // 平均 PnL%
  avgWinRate: number;        // 平均胜率
  totalPrizeWon: number;     // 总奖金
  bestPlayer: {              // 最佳选手
    username: string;
    seasonPoints: number;
    rankTier: RankTier;
  };
  topInstitution: {          // 该国最强高校
    name: string;
    memberCount: number;
  } | null;
}
```

#### `GET /api/stats/institutions`

```typescript
interface InstitutionStats {
  id: number;
  name: string;
  nameEn: string | null;
  shortName: string | null;
  type: string;
  country: string;
  countryName: string;
  flag: string;
  logoUrl: string | null;
  verified: boolean;
  memberCount: number;        // 注册人数
  activeMembers: number;      // 参赛过至少1场的人数
  competitionCount: number;   // 总参赛场次
  avgPnlPct: number;
  avgWinRate: number;
  totalPrizeWon: number;
  bestRank: number;           // 最佳单场排名
  avgSeasonPoints: number;    // 平均赛季积分
  topPlayers: Array<{         // 前3选手
    username: string;
    seasonPoints: number;
    rankTier: RankTier;
  }>;
}
```

#### `GET /api/stats/regions?country=CN`

```typescript
interface RegionStats {
  region: string;             // "北京"
  participantCount: number;
  institutionCount: number;
  avgPnlPct: number;
  topInstitution: string;
}
```

### 9.3 统计页面设计

#### StatsOverviewPage — `/stats`

```
┌──────────────────────────────────────────────────────────┐
│  平台统计                                                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ 数字概览 ────────────────────────────────────────┐  │
│  │ 总选手: 1,247  总比赛: 84  总交易: 52,380          │  │
│  │ 国家/地区: 23  高校/机构: 156  总奖金: 42,000 USDT │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 世界地图热力图 ──────────────────────────────────┐  │
│  │                                                    │  │
│  │     (用 react-simple-maps 或类似库)                │  │
│  │     颜色深浅 = 该国参赛人数                         │  │
│  │     hover 显示: 国名 + 人数 + 平均表现              │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 国家排行 Top 10 ─────┬─ 高校排行 Top 10 ─────────┐ │
│  │ 🇨🇳 中国    580人      │ 🏫 清华大学    15人       │ │
│  │ 🇺🇸 美国    210人      │ 🏫 MIT        8人        │ │
│  │ 🇯🇵 日本    85人       │ 🏫 北京大学    12人       │ │
│  │ 🇰🇷 韩国    72人       │ 🏫 Stanford   6人        │ │
│  │ ...                    │ ...                       │ │
│  │ [查看全部 →]           │ [查看全部 →]              │ │
│  └────────────────────────┴───────────────────────────┘ │
│                                                          │
│  ┌─ 最近赛事亮点 ────────────────────────────────────┐  │
│  │ 第7场: 🇨🇳选手包揽前3 · 清华 vs 北大激烈对决       │  │
│  │ 第6场: 🇺🇸MIT选手首次夺冠 · 8国选手参赛            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

#### InstitutionStatsPage — `/stats/institutions`

```
┌──────────────────────────────────────────────────────────┐
│  高校/机构排行                                            │
│  [大学▼] [全部国家▼] [排序: 积分▼]                        │
├──────────────────────────────────────────────────────────┤
│  #  学校             🌍  人数  参赛场次  均PnL  胜率  奖金  │
│  1  清华大学 ✓       🇨🇳  15    45      +8.2%  62%  680U │
│  2  MIT ✓            🇺🇸  8     24      +7.1%  58%  420U │
│  3  北京大学 ✓       🇨🇳  12    36      +6.5%  55%  350U │
│  ...                                                     │
│                                                          │
│  点击学校展开:                                            │
│  ┌─ 清华大学 ✓ ──────────────────────────────────────┐  │
│  │ 📍 中国北京 · 15名选手 · 参赛 45场 · 总奖金 680U   │  │
│  │                                                    │  │
│  │ 选手排行:                                           │  │
│  │ #1 TraderX   💎1520pts  Rank均值#4   WR62%         │  │
│  │ #2 StudentA  🥇750pts   Rank均值#12  WR58%         │  │
│  │ #3 StudentB  🥈450pts   Rank均值#20  WR52%         │  │
│  │ ...                                                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 9.4 比赛结果中的地区/高校展示

每场比赛的 ResultsPage 中增加：

```
┌─ 本场地区/高校亮点 ─────────────────────────────────┐
│                                                     │
│ 参赛国家: 🇨🇳×28 🇺🇸×8 🇯🇵×4 🇰🇷×3 🇭🇰×2              │
│                                                     │
│ 高校对决:                                            │
│ 🏫 清华 (5人) 均PnL +6.2%  vs  🏫 北大 (4人) +3.8%  │
│ 🏫 MIT (3人) +5.1%  vs  🏫 Stanford (2人) +4.5%     │
│                                                     │
│ 国家对决:                                            │
│ 🇨🇳 中国 (28人) 均PnL +4.8%                          │
│ 🇺🇸 美国 (8人) 均PnL +5.1% ← 本场最强国家            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 9.5 排行榜中的地区/高校列

所有排行榜（当场、赛季）每行都显示：
- 国旗 emoji（2字符，从 country code 生成）
- 高校简称（如果有）
- 可按国家/高校筛选

---

## 10. 交易分析系统

### 10.1 API: `GET /api/me/analytics`

```typescript
interface AnalyticsData {
  period: 'season' | 'competition' | 'all';
  periodId: string;

  // PnL 分布直方图
  pnlDistribution: Array<{
    bucket: string;        // "-5%~-3%"
    count: number;
    avgPnl: number;
  }>;

  // 按方向分析
  byDirection: {
    long: { count: number; wins: number; losses: number; totalPnl: number; avgPnl: number; avgHoldDuration: number };
    short: { count: number; wins: number; losses: number; totalPnl: number; avgPnl: number; avgHoldDuration: number };
  };

  // 按平仓原因
  byCloseReason: {
    manual: { count: number; avgPnl: number };
    tp: { count: number; avgPnl: number };
    sl: { count: number; avgPnl: number };
    match_end: { count: number; avgPnl: number };
  };

  // 持仓时长 vs 收益散点图
  holdDurationVsPnl: Array<{
    holdSeconds: number;
    pnlPct: number;
    holdWeight: number;
    direction: 'long' | 'short';
  }>;

  // Equity 曲线
  equityCurve: Array<{
    tradeIndex: number;
    equity: number;
    timestamp: number;
    competitionNumber: number;
  }>;

  // 连胜/连亏
  streaks: {
    currentStreak: number;      // 正=连胜, 负=连亏
    longestWinStreak: number;
    longestLossStreak: number;
  };

  // 按 UTC 小时
  byHour: Array<{
    hour: number;              // 0-23
    count: number;
    avgPnl: number;
    winRate: number;
  }>;

  // 预测准确率
  predictionStats: {
    total: number;
    correct: number;
    accuracy: number;
    byConfidence: Array<{
      confidence: number;      // 1-5
      count: number;
      accuracy: number;
    }>;
  };

  // 汇总
  summary: {
    totalTrades: number;
    winRate: number;
    avgPnlPerTrade: number;
    avgHoldDuration: number;
    avgHoldWeight: number;
    profitFactor: number;      // 总盈利 / 总亏损 的绝对值
    bestTrade: CompletedTrade;
    worstTrade: CompletedTrade;
  };
}
```

### 10.2 AnalyticsPage 布局

```
┌──────────────────────────────────────────────────────────┐
│  交易分析         [本场比赛▼] [本月赛季] [全部]            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Equity 曲线 (大区域折线图)                               │
│  ─────────────────/───────────────                       │
│                                                          │
├────────────────────────┬─────────────────────────────────┤
│  PnL 分布 (直方图)      │  方向分析 (双色条形图)            │
│  ████ 8                │  Long: 60% trades | WR 55%      │
│  ██████ 12             │  Short: 40% trades | WR 42%     │
│  ███ 5                 │  Long 均PnL: +1.2%              │
│                        │  Short 均PnL: -0.8%             │
├────────────────────────┼─────────────────────────────────┤
│  平仓原因 (环形图)      │  持仓时长 vs PnL (散点图)        │
│  🎯 TP: 35%           │      绿点=盈利 红点=亏损          │
│  🛑 SL: 25%           │      x=时间 y=PnL%              │
│  ✋ 手动: 30%          │      灰线=holdWeight曲线         │
│  ⏰ 超时: 10%          │                                 │
├────────────────────────┴─────────────────────────────────┤
│  交易时段分布 (24h 条形图)                                │
│  00 01 02 ... 08 09 10 11 12 ... 20 21 22 23            │
│  ▁▁▂▃▅▆▇██▇▆▅▃▂▁▁▁▂▃▅▇█▇                               │
│  颜色=该小时胜率（绿高红低）                               │
├──────────────────────────────────────────────────────────┤
│  预测准确率                                               │
│  总准确率 62% · 高置信(4-5) 68% · 低置信(1-2) 48%        │
│  置信度分布条形图                                         │
└──────────────────────────────────────────────────────────┘
```

---

## 11. 成就系统

### 11.1 完整成就目录

| Key | 名称 | 条件 | 图标 |
|-----|------|------|------|
| `first_trade` | 初出茅庐 | 完成第一笔交易 | 🎯 |
| `first_win` | 首战告捷 | 第一笔盈利交易 | ✨ |
| `first_competition` | 竞技新星 | 完成第一场比赛 | ⭐ |
| `trades_50` | 半百交易 | 累计50笔交易 | 📊 |
| `trades_200` | 交易老兵 | 累计200笔交易 | 🎖 |
| `win_streak_3` | 三连胜 | 连续3笔盈利 | 🔥 |
| `win_streak_5` | 五连胜 | 连续5笔盈利 | 🔥🔥 |
| `win_streak_10` | 十连胜 | 连续10笔盈利 | 💥 |
| `rank_top_1` | 王者降临 | 获得第1名 | 👑 |
| `rank_top_3` | 领奖台 | 进入前3名 | 🏆 |
| `rank_top_10` | 精英十强 | 进入前10名 | 🏅 |
| `tier_bronze` | 青铜之路 | 达到青铜段位 | 🥉 |
| `tier_silver` | 白银突破 | 达到白银段位 | 🥈 |
| `tier_gold` | 黄金登顶 | 达到黄金段位 | 🥇 |
| `tier_platinum` | 铂金荣耀 | 达到铂金段位 | 💠 |
| `tier_diamond` | 钻石传说 | 达到钻石段位 | 💎 |
| `gf_qualified` | GF入场券 | 获得Grand Final资格 | 🎫 |
| `gf_participant` | 决赛勇士 | 参加Grand Final | ⚔️ |
| `gf_winner` | 赛季冠军 | Grand Final第1名 | 🌟 |
| `competitions_5` | 常客 | 参加5场比赛 | 📅 |
| `competitions_15` | 铁杆选手 | 完成一整赛季(15场) | 🗓 |
| `prediction_oracle` | 预言家 | 预测准确率≥70%(≥20次) | 🔮 |
| `high_conviction` | 坚定持仓 | 平均holdWeight≥1.0 | 💪 |
| `prize_100` | 小有积蓄 | 累计奖金≥100U | 💰 |
| `prize_500` | 财富自由 | 累计奖金≥500U | 💎💰 |

### 11.2 检查时机

在 `settleCompetition` 中，每场比赛结束后批量检查：

```typescript
async processAchievementsAndTierChanges(comp: Competition, leaderboard: Row[]) {
  for (const row of leaderboard) {
    const existing = await getUserAchievements(row.arenaAccountId);
    const existingKeys = new Set(existing.map(a => a.achievementKey));
    const newAchievements: string[] = [];

    // 排名成就
    if (row.rank === 1 && !existingKeys.has('rank_top_1'))
      newAchievements.push('rank_top_1');
    if (row.rank <= 3 && !existingKeys.has('rank_top_3'))
      newAchievements.push('rank_top_3');
    // ... 所有检查

    // 段位变化
    const oldTier = getRankTier(row.seasonPointsBefore);
    const newTier = getRankTier(row.seasonPointsAfter);
    if (newTier.tier !== oldTier.tier) {
      // 段位晋升通知
      await insertNotification(row.arenaAccountId, {
        type: 'tier_promotion',
        title: `段位晋升: ${newTier.label}`,
        message: `恭喜晋升为${newTier.label}！杠杆提升至${newTier.leverage}x`,
      });
    }

    // 写入新成就
    for (const key of newAchievements) {
      await insertUserAchievement(row.arenaAccountId, key, comp.id);
      await insertNotification(row.arenaAccountId, {
        type: 'achievement_unlocked',
        title: `新成就: ${ACHIEVEMENT_CATALOG[key].name}`,
        message: ACHIEVEMENT_CATALOG[key].description,
      });
    }
  }
}
```

---

## 12. 移动端设计

### 12.1 底部 Tab Bar

```
┌──────────────────────────────────────────┐
│  🏠Hub  📅赛程  ⚔比赛  📊排行  👤我的   │
└──────────────────────────────────────────┘
```

比赛进行中时，⚔️ tab 有红色脉冲动画 + 小字显示 "LIVE"。

### 12.2 Hub 移动端布局

- Hero Card 占满宽度，大按钮
- 赛季进度横向滚动
- 报名列表纵向卡片
- 最近战绩紧凑列表

### 12.3 竞赛详情移动端

- 信息卡片折叠式展示
- 报名按钮固定在底部（sticky）
- 参赛者列表虚拟滚动

### 12.4 TradingPage 移动端

保持现有设计不变（已经做了移动适配），只加：
- 顶部 "← Hub" 返回按钮
- 结算 overlay 全屏化

### 12.5 统计页移动端

- 地图改为国家列表
- 图表自适应宽度
- 高校排行表横向可滚动

---

## 13. 前端架构改造

### 13.1 React Router 引入

```typescript
// App.tsx (改造后)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公开 */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* 公开统计 */}
          <Route path="/stats" element={<StatsOverviewPage />} />
          <Route path="/stats/countries" element={<CountryStatsPage />} />
          <Route path="/stats/institutions" element={<InstitutionStatsPage />} />

          {/* 需要登录 */}
          <Route element={<ProtectedLayout />}>
            <Route path="/hub" element={<HubPage />} />
            <Route path="/competitions" element={<CompetitionsPage />} />
            <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
            <Route path="/results/:competitionId" element={<ResultsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/profile/history" element={<MatchHistoryPage />} />
            <Route path="/profile/analytics" element={<AnalyticsPage />} />
            <Route path="/profile/achievements" element={<AchievementsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/users/:username" element={<PublicProfilePage />} />
          </Route>

          {/* 比赛界面（独立 layout） */}
          <Route element={<ProtectedLayout variant="arena" />}>
            <Route path="/arena/:competitionId" element={<TradingPage />} />
          </Route>

          {/* 管理后台 */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/competitions" element={<AdminCompetitionsPage />} />
            <Route path="/admin/competitions/create" element={<AdminCompetitionFormPage />} />
            <Route path="/admin/competitions/:id" element={<AdminCompetitionDetailPage />} />
            <Route path="/admin/competitions/:id/registrations" element={<AdminRegistrationsPage />} />
            <Route path="/admin/seasons" element={<AdminSeasonsPage />} />
            <Route path="/admin/institutions" element={<AdminInstitutionsPage />} />
            <Route path="/admin/invite-codes" element={<AdminInviteCodesPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 13.2 AuthContext

```typescript
// contexts/AuthContext.tsx
interface AuthState {
  token: string | null;
  username: string;
  role: 'user' | 'admin';
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (inviteCode: string, username: string, password: string) => Promise<void>;
  quickLogin: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// ProtectedLayout 检查 isAuthenticated，否则 redirect to /login
// AdminLayout 额外检查 role === 'admin'
```

### 13.3 Hooks 改造

```typescript
// hooks/useArena.ts — 加 competitionId 参数
export function useArena(token: string, competitionId: string) {
  // 轮询 GET /api/arena/${competitionId}/state
  // 其余逻辑不变
}

// hooks/useHub.ts — Hub 页专用
export function useHub(token: string) {
  // 轮询 GET /api/me/hub (频率较低，每10秒)
}

// hooks/useNotifications.ts — 全局通知
export function useNotifications(token: string) {
  // 轮询 GET /api/me/notifications (每30秒)
}
```

### 13.4 新增组件

```
components/
├── layout/
│   ├── GlobalNavBar.tsx          -- 全局顶部导航
│   ├── MobileTabBar.tsx          -- 移动端底部 Tab
│   ├── ProtectedLayout.tsx       -- 登录保护 wrapper
│   ├── AdminLayout.tsx           -- 管理后台 layout
│   └── AdminSidebar.tsx          -- 管理后台侧边栏
│
├── competition/
│   ├── CompetitionCard.tsx       -- 赛程列表中的比赛卡片
│   ├── CompetitionCalendar.tsx   -- 日历视图
│   ├── CompetitionRules.tsx      -- 规则展示
│   ├── RegistrationButton.tsx    -- 报名/撤回按钮
│   ├── RegistrationStatus.tsx    -- 报名状态标签
│   ├── ParticipantList.tsx       -- 参赛者列表
│   └── CountdownTimer.tsx        -- 通用倒计时组件
│
├── results/
│   ├── Podium.tsx                -- 领奖台（前三名）
│   ├── SettlementOverlay.tsx     -- 赛后结算全屏弹窗
│   ├── ResultSummary.tsx         -- 个人成绩摘要
│   └── GeoHighlights.tsx         -- 地区/高校亮点
│
├── profile/
│   ├── ProfileCard.tsx           -- 用户信息卡片
│   ├── ProfileEditForm.tsx       -- 编辑表单
│   ├── InstitutionSearch.tsx     -- 机构搜索自动补全
│   ├── SeasonProgressBar.tsx     -- 赛季进度条
│   ├── TierBadge.tsx             -- 段位徽章
│   └── AchievementGrid.tsx       -- 成就网格
│
├── analytics/
│   ├── EquityCurve.tsx           -- Equity 折线图
│   ├── PnlDistribution.tsx       -- PnL 分布直方图
│   ├── DirectionAnalysis.tsx     -- 方向分析
│   ├── CloseReasonPie.tsx        -- 平仓原因环形图
│   ├── HoldDurationScatter.tsx   -- 持仓时长散点图
│   ├── HourlyHeatmap.tsx         -- 交易时段热力图
│   └── PredictionAccuracy.tsx    -- 预测准确率
│
├── stats/
│   ├── WorldMap.tsx              -- 世界地图热力图
│   ├── CountryRanking.tsx        -- 国家排行
│   ├── InstitutionRanking.tsx    -- 高校排行
│   └── RegionChart.tsx           -- 地区分布图
│
├── notification/
│   ├── NotificationBell.tsx      -- 导航栏通知铃铛
│   ├── NotificationDropdown.tsx  -- 下拉通知列表
│   └── NotificationItem.tsx      -- 单条通知
│
├── admin/
│   ├── CompetitionForm.tsx       -- 创建/编辑比赛表单
│   ├── RegistrationTable.tsx     -- 报名审核表格
│   ├── BatchActions.tsx          -- 批量操作按钮
│   └── SeasonForm.tsx            -- 赛季表单
│
└── (现有组件保留)
    ├── CandlestickChart.tsx
    ├── TradingPanel.tsx
    ├── OrderBookPanel.tsx
    ├── Leaderboard.tsx
    ├── ChatRoom.tsx
    └── ...
```

---

## 14. 实施路线图

### Phase 0 — 基础设施 (1-2周)

```
□ 引入 React Router，替换 useState 状态机
□ 抽取 AuthContext
□ 创建 ProtectedLayout + GlobalNavBar + MobileTabBar
□ 新建 DB 表: seasons, competitions, competition_registrations,
  match_results, notifications, user_achievements,
  institutions, user_profiles
□ Drizzle schema 更新 + migration
□ arenaAccounts 加 role 字段 ('user' | 'admin')
```

### Phase 1 — 核心赛事流程 (2-3周)

```
□ CompetitionEngine 重写（状态机替代自动轮转）
□ Admin API: 创建/编辑比赛, 管理赛季
□ Admin API: 审核报名 (单个 + 批量)
□ 用户 API: 报名/撤回, 查看报名状态
□ HubPage 实现
□ CompetitionsPage 实现
□ CompetitionDetailPage 实现（所有状态）
□ TradingPage 改造（接受 competitionId, 参赛验证）
□ AdminCompetitionsPage 实现
□ AdminRegistrationsPage 实现
```

### Phase 2 — 结算与历史 (1-2周)

```
□ settleCompetition 写入 match_results
□ SettlementOverlay 组件
□ ResultsPage 实现
□ MatchHistoryPage 实现
□ /api/me/history API
□ /api/me/hub API (完整实现)
```

### Phase 3 — 用户画像与通知 (1-2周)

```
□ user_profiles 表 + ProfileEditPage
□ institutions 表 + 搜索自动补全
□ 通知系统 (DB + API + NotificationBell + NotificationsPage)
□ 注册后 profile 补全引导流程
□ 成就持久化 + AchievementsPage
```

### Phase 4 — 统计与排行 (1-2周)

```
□ 地区/高校统计 API
□ StatsOverviewPage (含世界地图)
□ InstitutionStatsPage
□ CountryStatsPage
□ LeaderboardPage (多维度 + 国家/高校筛选)
□ 排行榜 + 结果页中的地区/高校展示列
```

### Phase 5 — 交易分析 (1周)

```
□ /api/me/analytics API (聚合查询)
□ AnalyticsPage (所有图表组件)
□ ProfilePage 实现 (汇总面板)
□ PublicProfilePage (他人主页)
```

### Phase 6 — 管理后台完善 (1周)

```
□ AdminSeasonsPage
□ AdminInstitutionsPage (合并/验证/编辑)
□ AdminInviteCodesPage
□ 管理员仪表盘 (总览统计)
```

### Phase 7 — 打磨 (持续)

```
□ 移动端全流程优化
□ 比赛日历视图
□ 赛季总结页
□ 分享战绩卡片（生成图片）
□ 观战模式（live 时非参赛者只读排行）
□ 练习赛模式
□ 邮件/Push 通知 (未来)
□ i18n 全页面翻译
```

---

## 附录 A: 数据库迁移策略

现有数据兼容：
1. `matches` 表保留，新增 `competitions` 表并行运行
2. 已有的 `trades.matchId` 可映射到 `competitions.id`
3. 迁移脚本将旧 match 数据写入 `match_results`
4. 过渡期两套 API 共存（legacy `/api/state` + 新 `/api/arena/:id/state`）
5. 完全迁移后移除 legacy 路由

## 附录 B: 国家代码与旗帜

```typescript
// 从 ISO alpha-2 生成旗帜 emoji
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}
// countryFlag('CN') → '🇨🇳'
// countryFlag('US') → '🇺🇸'
```

## 附录 C: 赛季积分衰减

每个新赛季开始时：
```
newSeasonPoints = floor(lastSeasonPoints * POINTS_DECAY_FACTOR)
```
衰减后的积分决定起始段位和杠杆。
实现位置: `AdminSeasonsPage` 创建新赛季时触发一次性批量更新。
