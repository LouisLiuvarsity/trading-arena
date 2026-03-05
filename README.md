# Trading Arena v2.0

> **赛事运营平台** — 从永动机竞技场到有排期、报名、审核的正式比赛系统。基于 React 19 + Express + MySQL/Drizzle，使用 Binance SOL/USDT 实时行情数据，支持 LoL 段位体系、固定奖池、用户画像（国家/高校）和完整的赛事生命周期管理。

---

## 系统概览

Trading Arena 是一个 **加密货币交易比赛平台**。v2.0 从"永动机"自动轮转模型转型为**赛事运营平台**：管理员排期比赛 → 用户报名 → 管理员审核入选 → 比赛 → 结算 → 回顾。

### v1 → v2 核心转变

| 维度 | v1 (永动机) | v2 (赛事制) |
|------|-----------|-------------|
| 比赛创建 | 自动轮转 24h | 管理员预排期 |
| 参赛方式 | 注册即参赛 | 报名 → 审核 → 入选 |
| 用户首页 | 直接进交易 | Hub 赛事大厅 |
| 比赛间隙 | 不存在 | 浏览赛程、回顾、准备 |
| 管理后台 | 无 | 完整 CRUD + 审核 |
| 通知系统 | 无 | 全生命周期通知 |
| 用户画像 | 仅 username | 国家/地区/高校/专业 |
| 统计展示 | 无 | 地区排行、高校排行 |
| 比赛结果 | 瞬态（丢失） | 持久化到 match_results |
| 交易分析 | 无 | 完整 recharts 图表 |

---

## 核心参数

| 参数 | 值 |
|------|-----|
| **月度预算** | 10,000 USDT (固定) |
| **常规赛奖池** | 500 USDT / 场 |
| **Grand Final 奖池** | 2,500 USDT |
| **月度赛程** | 15 常规赛 + 1 Grand Final |
| **比赛时长** | 24 小时（可配置） |
| **初始资金** | 5,000 USDT (模拟) |
| **交易对** | 支持所有 Binance USDⓈ-M 永续合约（USDT/USDC），每场比赛独立设置 |
| **最大交易次数** | 40 笔 / 场 |
| **同时持仓** | 1 个仓位 |
| **最低交易数** | 5 笔才有奖金资格 |
| **最后 30 分钟** | 仅平仓模式 |

---

## 竞赛生命周期

```
draft → announced → registration_open → registration_closed → live → settling → completed
                                                                        ↘ cancelled (任何阶段)
```

- **draft**: 管理员创建草稿
- **announced**: 已发布，用户可见但不能报名
- **registration_open**: 报名开放
- **registration_closed**: 报名截止，等待开赛
- **live**: 比赛进行中（ArenaEngine 处理交易）
- **settling**: 结算中（强平 → 排行 → 写结果 → 加积分 → 通知）
- **completed**: 比赛完成，结果可查

---

## 页面架构

```
公开页面
/                        LandingPage          公开首页
/login                   LoginPage            注册/登录
/rules                   RulesPage            规则说明
/stats                   StatsOverviewPage    平台统计（国家/高校排行）
/stats/institutions      InstitutionStatsPage 高校排行详情

需要登录（AppShell 导航）
/hub                     HubPage              赛事大厅（登录后首页）
/competitions            CompetitionsPage     赛程列表
/competitions/:slug      CompetitionDetailPage 竞赛详情（多状态）
/arena/:competitionId    TradingPage          交易界面（全屏）
/results/:competitionId  ResultsPage          比赛结果/结算
/profile                 ProfilePage          个人仪表盘
/profile/edit            ProfileEditPage      编辑资料（国家/高校/简介）
/profile/analytics       AnalyticsPage        交易分析（recharts 图表）
/profile/achievements    AchievementsPage     成就陈列柜
/history                 MatchHistoryPage     比赛历史
/leaderboard             LeaderboardPage      排行榜（多维度）
/notifications           NotificationsPage    通知中心
/user/:username          PublicProfilePage    他人公开主页

管理后台
/admin/competitions      AdminCompetitionsPage    比赛管理
/admin/competitions/new  AdminCompetitionFormPage 创建比赛
/admin/competitions/:id/edit  编辑比赛
/admin/registrations/:id AdminRegistrationsPage   报名审核
/admin/seasons           AdminSeasonsPage         赛季管理
```

---

## 技术栈

| 层 | 技术 |
|---|---|
| **前端框架** | React 19, TypeScript |
| **路由** | wouter v3.7.1 |
| **样式** | Tailwind CSS v4 + shadcn/ui + Radix UI |
| **图表** | Lightweight Charts (K线), recharts (分析图表) |
| **动画** | Framer Motion |
| **状态** | React hooks + AuthContext + custom hooks |
| **后端** | Express + TypeScript |
| **数据库** | MySQL + Drizzle ORM |
| **行情** | Binance USDⓈ-M Futures API — REST `fapi.binance.com` (server) + WebSocket `fstream.binance.com` (client) |
| **构建** | Vite 7 + ESBuild |
| **包管理** | pnpm 10 |

---

## 项目结构

```
trading-arena/
├── client/src/
│   ├── App.tsx                    # wouter 路由 + AuthProvider
│   ├── main.tsx                   # 入口（LanguageProvider + tRPC + QueryClient）
│   ├── contexts/
│   │   ├── AuthContext.tsx         # 认证状态管理
│   │   ├── ThemeContext.tsx        # 主题（暗色）
│   │   └── TradingPairContext.tsx  # 当前交易对配置（动态，从服务端推送）
│   ├── pages/
│   │   ├── HubPage.tsx            # 赛事大厅（Hero + 赛季 + 报名 + 战绩）
│   │   ├── CompetitionsPage.tsx   # 赛程列表（筛选 + 卡片）
│   │   ├── CompetitionDetailPage.tsx # 竞赛详情（多状态渲染）
│   │   ├── TradingPage.tsx        # 交易界面（桌面 + 移动端）
│   │   ├── ResultsPage.tsx        # 比赛结果（领奖台 + 排行）
│   │   ├── MatchHistoryPage.tsx   # 比赛历史（可展开交易明细）
│   │   ├── ProfilePage.tsx        # 个人仪表盘
│   │   ├── ProfileEditPage.tsx    # 编辑资料（国家/高校搜索）
│   │   ├── AnalyticsPage.tsx      # 交易分析（6 种 recharts 图表）
│   │   ├── AchievementsPage.tsx   # 成就陈列柜（24 个成就）
│   │   ├── LeaderboardPage.tsx    # 排行榜
│   │   ├── NotificationsPage.tsx  # 通知中心
│   │   ├── StatsOverviewPage.tsx  # 平台统计（国家 + 高校排行）
│   │   ├── InstitutionStatsPage.tsx # 高校排行详情
│   │   ├── PublicProfilePage.tsx  # 他人公开主页
│   │   ├── LandingPage.tsx        # 公开首页
│   │   ├── LoginPage.tsx          # 登录/注册
│   │   ├── RulesPage.tsx          # 规则说明
│   │   └── admin/
│   │       ├── CompetitionsPage.tsx    # 比赛管理
│   │       ├── CompetitionFormPage.tsx # 创建/编辑
│   │       ├── RegistrationsPage.tsx  # 报名审核
│   │       └── SeasonsPage.tsx        # 赛季管理
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # 全局导航（桌面顶栏 + 移动端底栏）
│   │   │   └── NotificationBell.tsx # 通知铃铛 + 下拉面板
│   │   ├── results/
│   │   │   └── SettlementOverlay.tsx # 赛后结算全屏动画
│   │   ├── CandlestickChart.tsx   # K 线图
│   │   ├── TradingPanel.tsx       # 交易面板
│   │   ├── Leaderboard.tsx        # 排行榜组件
│   │   ├── ChatRoom.tsx           # 聊天室
│   │   └── ui/                    # shadcn/ui 组件库 (50+)
│   ├── hooks/
│   │   ├── useArena.ts            # 竞技场状态 + 交易操作
│   │   ├── useBinanceWS.ts        # Binance 合约 WebSocket（动态币对）
│   │   ├── useNotifications.ts    # 通知轮询 hook
│   │   ├── useAchievements.ts     # 成就检测
│   │   └── useMobile.tsx          # 移动端检测
│   └── lib/
│       ├── types.ts               # 核心类型定义
│       ├── api.ts                 # API 请求封装
│       ├── competition-api.ts     # 竞赛系统 API 客户端
│       ├── i18n.tsx               # 国际化（中/英）
│       └── mockData.ts            # Mock 数据生成器
│
├── server/
│   ├── _core/index.ts             # Express 服务器入口
│   ├── index.ts                   # API 路由注册（Arena + Competition + Profile + Analytics + Stats）
│   ├── engine.ts                  # ArenaEngine（交易引擎 + TP/SL + 排行榜）
│   ├── competition-engine.ts      # CompetitionEngine（竞赛生命周期状态机）
│   ├── competition-db.ts          # 竞赛系统 DB 辅助函数（34 个）
│   ├── competition-routes.ts      # 竞赛系统 API 路由（~25 端点）
│   ├── profile-routes.ts          # 资料/机构 API
│   ├── analytics-routes.ts        # 交易分析聚合 API
│   ├── stats-routes.ts            # 公开地区/高校统计 API
│   ├── db.ts                      # 核心 DB 辅助函数
│   ├── market.ts                  # Binance 合约行情服务（fapi REST）
│   ├── binance-symbols.ts         # Binance USDⓈ-M 永续合约币对注册表（动态缓存）
│   └── constants.ts               # 游戏参数 + 持仓权重函数
│
├── drizzle/
│   └── schema.ts                  # 数据库 Schema (17 张表)
│
├── shared/
│   ├── competitionTypes.ts        # 竞赛系统共享类型
│   ├── achievements.ts            # 成就目录（24 个）
│   ├── tradingPair.ts             # 交易对类型定义 + 动态解析工具
│   ├── const.ts                   # 共享常量
│   └── types.ts                   # Schema 类型导出
│
└── docs/
    └── SYSTEM_DESIGN_V2.md        # 完整系统设计文档
```

---

## 数据库 Schema (17 张表)

### 核心表 (v1)
| 表 | 用途 |
|---|---|
| `users` | OAuth 用户 |
| `arena_accounts` | 竞技场账户（username, inviteCode, seasonPoints, role） |
| `arena_sessions` | 会话 token |
| `matches` | 比赛轮次（ArenaEngine 桥梁） |
| `positions` | 当前持仓 |
| `trades` | 已完成交易 |
| `chat_messages` | 聊天记录 |
| `behavior_events` | 行为事件分析 |
| `predictions` | 每小时价格预测 |

### 竞赛系统表 (v2 新增)
| 表 | 用途 |
|---|---|
| `seasons` | 月度赛季 |
| `competitions` | 排期竞赛（替代自动轮转） |
| `competition_registrations` | 报名/候选/审核 |
| `match_results` | 比赛结果持久化 |
| `notifications` | 全生命周期通知 |
| `user_achievements` | 成就持久化 |
| `institutions` | 高校/机构 |
| `user_profiles` | 用户画像（国家/地区/高校） |

---

## API 端点

### 公开
- `GET /api/symbols` — 所有可用交易对（Binance USDⓈ-M 永续合约，含精度配置）
- `GET /api/competitions` — 赛程列表
- `GET /api/competitions/:slug` — 竞赛详情
- `GET /api/seasons` — 赛季列表
- `GET /api/stats/overview` — 平台统计
- `GET /api/stats/countries` — 国家排行
- `GET /api/stats/institutions` — 高校排行
- `GET /api/public/leaderboard` — 公开排行榜

### 用户（需登录）
- `POST /api/competitions/:slug/register` — 报名
- `POST /api/competitions/:slug/withdraw` — 撤回
- `GET /api/hub` — Hub 数据
- `GET /api/me/history` — 比赛历史
- `GET /api/me/analytics` — 交易分析
- `GET /api/me/profile` — 个人资料
- `PUT /api/me/profile` — 更新资料
- `GET /api/me/notifications` — 通知列表
- `GET /api/arena/:competitionId/state` — 竞赛状态
- `POST /api/arena/:competitionId/trade/open|close|tpsl` — 交易

### 管理员
- `POST /api/admin/competitions` — 创建比赛
- `PUT /api/admin/competitions/:id` — 编辑比赛
- `POST /api/admin/competitions/:id/transition` — 状态转换
- `GET /api/admin/competitions/:id/registrations` — 报名列表
- `POST /api/admin/registrations/:id/review` — 审核
- `POST /api/admin/seasons` — 创建赛季

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 类型检查
pnpm check

# 构建
pnpm build

# 数据库迁移
pnpm db:push
```

环境变量:
- `DATABASE_URL` — MySQL 连接字符串 (必需)
- `PORT` — 服务器端口 (默认 3000)

---

## 段位体系 (LoL 风格)

| 段位 | 积分要求 | 杠杆 | 颜色 |
|------|---------|------|------|
| Iron | 0–99 | 1.0x | #5E6673 |
| Bronze | 100–299 | 1.2x | #CD7F32 |
| Silver | 300–599 | 1.5x | #C0C0C0 |
| Gold | 600–999 | 2.0x | #F0B90B |
| Platinum | 1,000–1,499 | 2.5x | #00D4AA |
| Diamond | 1,500+ | 3.0x | #B9F2FF |

月末积分衰减 ×0.8。

---

## 持仓权重 (Log-Sigmoid)

```
weight(t) = 0.5 + 0.6 / (1 + (300/t)^1.5)
```

范围 0.5x（噪音交易）到 1.1x（信念持仓）。抑制炒单，鼓励有信念的持仓。

---

## 成就系统 (24 个)

分类: 交易 (8)、排名 (3)、段位 (5)、里程碑 (5)、特别 (3)

---

## 动态交易对系统

每场比赛可独立设置交易币对，支持所有 Binance USDⓈ-M 永续合约（USDT + USDC）。

### 架构

```
                    ┌──────────────────────────────────────┐
                    │  Binance fapi/v1/exchangeInfo         │
                    │  (300+ 永续合约: BTC, ETH, SOL, XAU…) │
                    └────────────┬─────────────────────────┘
                                 │ 启动时拉取, 24h 自动刷新
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│  server/binance-symbols.ts                                   │
│  缓存所有 PERPETUAL + TRADING 状态的 USDT/USDC 合约          │
│  提供: getBinanceSymbolConfig() / getAllBinanceSymbols()      │
│  精度: pricePrecision, quantityPrecision (来自 Binance)       │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
           ▼                                      ▼
  GET /api/symbols                    CompetitionEngine
  (Dashboard 下拉选择)                startCompetition(comp)
                                       → market.setSymbol(comp.symbol)
                                     settleCompetition()
                                       → market.setSymbol("SOLUSDT")
```

### 数据流

```
Dashboard 选择 BTCUSDC → DB competitions.symbol = "BTCUSDC"
  → 比赛开始 → market.setSymbol("BTCUSDC")
  → server/market.ts 切换 fapi REST 轮询到 BTCUSDC
  → /api/state 返回 { match.symbol, tradingPair: { baseAsset, quoteAsset, priceDecimals, ... } }
  → 客户端 useArena → TradingPairContext 更新
  → useBinanceWS hooks 切换 fstream WebSocket 到 btcusdc 流
  → UI 动态显示 BTC, 使用正确小数位
  → 比赛结束 → 恢复 SOLUSDT
```

### 关键文件

| 文件 | 职责 |
|------|------|
| `shared/tradingPair.ts` | `TradingPairConfig` 类型定义，`getSymbolConfig()` 客户端降级解析 |
| `server/binance-symbols.ts` | Binance 合约币对缓存（启动时从 fapi 拉取，24h 刷新） |
| `server/market.ts` | `MarketService` — 合约 REST 行情（fapi），`setSymbol()` / `getSymbol()` |
| `server/engine.ts` | `/api/state` 返回 `tradingPair` 字段（优先使用 Binance 精确精度） |
| `server/competition-engine.ts` | 比赛开始/结束时切换 MarketService 的 symbol |
| `client/src/contexts/TradingPairContext.tsx` | React Context 持有当前币对配置 |
| `client/src/hooks/useBinanceWS.ts` | 合约 WebSocket（fstream），所有 Hook 接受动态 `symbol` |
| `client/src/hooks/useArena.ts` | 从服务端响应推送 `tradingPair` 到 Context |

### 行情数据源

| 数据 | 端点 | 说明 |
|------|------|------|
| Ticker (24h) | `fapi/v1/ticker/24hr` | lastPrice, priceChange, volume |
| Mark Price | `fapi/v1/premiumIndex` | markPrice, indexPrice, fundingRate |
| 深度 | `fapi/v1/depth` | 买卖盘 15 档 |
| K 线 | `fapi/v1/klines` | 1m/5m/15m/1h/4h/1d |
| 成交 | `fapi/v1/trades` | 最近 30 笔 |
| WS Ticker | `fstream: {sym}@ticker` | 实时价格推送 |
| WS Mark | `fstream: {sym}@markPrice@1s` | 标记价格 + 资金费率 |
| WS Depth | `fstream: {sym}@depth20@1000ms` | 实时深度 |
| WS Kline | `fstream: {sym}@kline_{tf}` | 实时 K 线 |
| WS Trade | `fstream: {sym}@aggTrade` | 实时成交 |

---

## License

MIT License
