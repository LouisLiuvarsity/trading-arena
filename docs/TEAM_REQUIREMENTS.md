# Trading Arena 开发需求文档

> 基于当前仓库代码整理，面向后端、前端、测试、数据库设计与运营后台开发团队。  
> 代码基线：`trading-arena` 当前工作区，整理日期：2026-03-09。

## 1. 文档目标

本文档用于让开发团队快速统一以下认知：

- 这是什么产品，核心用户是谁
- 当前系统已经实现了哪些业务能力
- 数据库应该围绕哪些核心实体设计
- API 应该如何分层、鉴权与返回数据
- 当前代码里哪些能力已落地，哪些能力仍需补齐

## 2. 产品定义

Trading Arena 不是传统交易所，而是一个**加密货币模拟交易比赛运营平台**。  
平台以“赛季 -> 比赛 -> 报名/审核 -> 开赛 -> 结算 -> 复盘”作为主业务链路，为用户提供比赛大厅、实盘感交易界面、排行榜、个人画像、机构榜单和后台运营能力。

### 2.1 产品目标

- 用比赛机制替代纯工具型交易产品，提升留存和传播
- 通过赛季积分、段位、总决赛资格制造长期竞争
- 通过高校/机构身份、公开榜单、公开主页形成社交传播
- 让运营团队可排期、审核、开赛、结算，而不是依赖自动轮转

### 2.2 产品边界

- 平台内交易为**模拟交易**
- 行情来自 Binance USD-M Futures
- 奖池与奖励属于赛事运营逻辑，不属于链上自动结算系统
- 当前系统默认同一时间只支持**一场 live 比赛**

## 3. 用户角色

| 角色 | 核心目标 | 典型页面/入口 |
|---|---|---|
| 访客/围观用户 | 了解产品、查看公开赛程、规则、公开榜单、国家/高校榜单 | `/` `/rules` `/stats` `/leaderboard-public` |
| 注册用户/普通选手 | 注册登录、报名比赛、维护个人资料、查看赛果和分析 | `/login` `/hub` `/competitions` `/profile` |
| 已入选参赛者 | 在 live 比赛中交易、聊天、预测、查看实时排名 | `/arena/:competitionId` |
| 运营管理员 | 创建赛季、创建比赛、审核报名、手动推进状态、复制比赛 | `/admin/seasons` `/admin/competitions` `/admin/registrations/:id` |
| 高校/机构传播对象 | 通过机构榜单和公开主页查看成员表现 | `/stats/institutions` `/user/:username` |

### 3.1 重点用户画像

- 学生选手：重视高校身份、排名、段位、总决赛资格
- 职业/半职业交易者：重视规则透明度、实时交易体验、成绩复盘
- 运营团队：重视排期、审核、状态控制、异常比赛处理

## 4. 核心业务流程

### 4.1 访客转用户

1. 访客浏览 Landing、规则、公开榜单
2. 注册账号，获得 arena session token
3. 进入 Hub 查看赛季进度和可报名比赛

### 4.2 比赛运营流程

1. 管理员创建赛季
2. 管理员创建比赛草稿
3. 比赛进入 `announced` 或 `registration_open`
4. 用户报名，状态为 `pending`
5. 管理员审核为 `accepted / rejected / waitlisted`
6. 开赛时系统创建 `matches` 桥接记录并切换行情 symbol
7. 比赛结束后系统强平、结算、写入结果、发通知、更新积分

### 4.3 用户参赛流程

1. 用户查看比赛详情
2. 在报名期提交报名
3. 审核通过后等待开赛
4. 比赛 live 后进入 Arena 界面交易
5. 比赛结束后查看结果、历史、个人分析

## 5. 状态机与业务状态

### 5.1 比赛状态

`draft -> announced -> registration_open -> registration_closed -> live -> settling -> completed`

补充终态：

- `cancelled`
- `ended_early`

### 5.2 报名状态

- `pending`
- `accepted`
- `rejected`
- `waitlisted`
- `withdrawn`

### 5.3 当前代码下的关键约束

- 只有 `registration_open` 才允许报名
- 只有未进入 `live / settling / completed / ended_early` 的比赛才允许撤回报名
- `registration_closed` 到达开赛时间后由引擎自动开赛
- live 比赛到达结束时间后由引擎自动结算

## 6. 核心业务规则

### 6.1 交易与比赛规则

- 默认初始资金：`5000 USDT`
- 默认单场最大交易次数：`40`
- 奖金资格最低交易数：`5`
- 最后 `30 分钟` 为只允许平仓模式
- 同一用户同时只能有 `1` 个持仓
- 最小下单规模：`10 USDT`
- 默认手续费：`0.05% / side`
- 比赛支持动态交易对，来源于 Binance USD-M 永续合约

### 6.2 段位与杠杆

| 段位 | 积分区间 | 杠杆倍率 |
|---|---:|---:|
| iron | 0-99 | 1.0x |
| bronze | 100-299 | 1.2x |
| silver | 300-599 | 1.5x |
| gold | 600-999 | 2.0x |
| platinum | 1000-1499 | 2.5x |
| diamond | 1500+ | 3.0x |

### 6.3 持仓权重

平台不是只按裸 PnL 排名，系统会计算持仓时长权重：

`weight(t) = 0.5 + 0.6 / (1 + (300 / t)^1.5)`

意图：

- 抑制纯刷单
- 鼓励更有信念的持仓
- 用 `weightedPnl` 支撑复盘分析与部分社交指标

### 6.4 积分与奖池

- 比赛结果写入 `match_results`
- 赛季积分写入 `arena_accounts.seasonPoints`
- 总决赛资格按 `seasonRankScore = seasonPoints × avgHoldWeight`
- 月度自动衰减因子默认 `0.8`
- 默认奖池和积分表可被比赛级配置覆盖

### 6.5 互动能力

- 比赛聊天室
- 行为埋点
- 每小时方向预测
- 情绪投票 poll
- 站内通知

## 7. 功能范围

### 7.1 公开侧

- Landing 页
- 规则页
- 平台总览统计
- 国家榜单
- 高校/机构榜单
- 公开排行榜
- 公开用户主页
- 公开比赛展示

### 7.2 登录后用户侧

- Hub 比赛大厅
- 比赛列表与详情
- 报名/撤回
- 比赛结果页
- 历史战绩
- 个人资料与机构搜索
- 个人分析页
- 通知中心
- 成就页

### 7.3 Arena 实时比赛侧

- K 线图
- 盘口/成交
- 开仓、平仓、设置 TP/SL
- 排行榜
- 聊天室
- 新闻流
- 排名焦虑带
- 预测与投票
- 移动端专用布局

### 7.4 管理后台

- 赛季管理
- 比赛创建/编辑
- 报名审核
- 比赛状态推进
- 比赛复制

## 8. 数据库设计要求

### 8.1 推荐分层

#### A. 账户与身份层

- `users`
- `arena_accounts`
- `arena_sessions`
- `user_profiles`
- `institutions`

#### B. 比赛运营层

- `seasons`
- `competitions`
- `competition_registrations`
- `matches`
- `match_results`
- `notifications`

#### C. 交易与实时行为层

- `positions`
- `trades`
- `predictions`
- `chat_messages`
- `behavior_events`

#### D. 成就层

- `user_achievements`

### 8.2 关键实体关系

| 实体 | 关系说明 |
|---|---|
| `arena_accounts` -> `user_profiles` | 1:1 |
| `institutions` -> `user_profiles` | 1:N |
| `seasons` -> `competitions` | 1:N |
| `competitions` -> `competition_registrations` | 1:N |
| `competitions` -> `match_results` | 1:N |
| `competitions` -> `matches` | 1:1（通过 `matchId` 桥接，开赛时生成） |
| `arena_accounts` -> `competition_registrations` | 1:N |
| `arena_accounts` -> `match_results` | 1:N |
| `arena_accounts` -> `positions` | 1:0..1 |
| `arena_accounts` -> `trades` | 1:N |
| `matches` -> `trades` | 1:N |

### 8.3 必须保留的约束

- `arena_accounts.username` 唯一
- `arena_accounts.email` 唯一
- `arena_sessions.token` 主键
- `competitions.slug` 唯一
- `seasons.slug` 唯一
- `competition_registrations (competitionId, arenaAccountId)` 唯一
- `match_results (competitionId, arenaAccountId)` 唯一
- `positions.arenaAccountId` 唯一，确保一人一仓
- `user_achievements (arenaAccountId, achievementKey)` 唯一

### 8.4 必须关注的索引

- `competitions(status, startTime, seasonId)`
- `competition_registrations(competitionId, status)`
- `competition_registrations(arenaAccountId)`
- `match_results(competitionId, finalRank)`
- `match_results(arenaAccountId)`
- `notifications(arenaAccountId, isRead, createdAt)`
- `trades(arenaAccountId, matchId)`
- `trades(closeTime)`
- `user_profiles(country, institutionId)`
- `behavior_events(timestamp, arenaAccountId)`

### 8.5 事务要求

- 开赛：创建 `matches` + 回填 `competitions.matchId` + 更新状态为 `live`
- 平仓：写 `trades` + 删除 `positions`
- 结算：写入 `match_results` + 更新积分 + `completeMatch`
- 报名审核：修改 `competition_registrations`，并发通知

### 8.6 数据保留策略

- `arena_sessions` 过期清理
- `behavior_events` 清理 30 天前数据
- `chat_messages` 清理 7 天前数据
- `match_results / trades / competitions / seasons` 应长期保留

## 9. API 设计要求

### 9.1 分层原则

- 公开接口：`/api/public/*`、`/api/stats/*`
- 用户接口：`/api/me/*`、`/api/competitions/*`
- Arena 实时接口：`/api/arena/*`
- 管理后台接口：`/api/admin/*`

### 9.2 鉴权原则

- 使用 Bearer Token
- Token 来自 `arena_sessions`
- 管理员权限来自 `arena_accounts.role = admin`
- Arena 实时接口必须强制鉴权

### 9.3 返回约定

- 列表接口优先返回 `{ items, total }`
- 创建接口返回 `{ id }`
- 操作型接口返回 `{ ok: true }`
- 错误格式统一为 `{ error: string, details?: any }`

### 9.4 当前应保留的接口分组

#### 公开接口

- `GET /api/public/competitions`
- `GET /api/public/leaderboard`
- `GET /api/symbols`
- `GET /api/seasons`
- `GET /api/competitions`
- `GET /api/competitions/:identifier`
- `GET /api/competitions/:identifier/leaderboard`
- `GET /api/competitions/:identifier/results`
- `GET /api/stats/overview`
- `GET /api/stats/countries`
- `GET /api/stats/institutions`
- `GET /api/users/:username/profile`
- `GET /api/institutions/search`

#### 用户接口

- `POST /api/auth/login`
- `POST /api/auth/quick-login`
- `POST /api/auth/check-username`
- `GET /api/hub`
- `POST /api/competitions/:slug/register`
- `POST /api/competitions/:slug/withdraw`
- `GET /api/me/history`
- `GET /api/me/profile`
- `PUT /api/me/profile`
- `GET /api/me/analytics`
- `GET /api/me/notifications`
- `GET /api/me/notifications/unread-count`
- `POST /api/me/notifications/:id/read`
- `POST /api/me/notifications/read-all`

#### Arena 实时接口

- `GET /api/arena/state`
- `POST /api/arena/trade/open`
- `POST /api/arena/trade/close`
- `POST /api/arena/trade/tpsl`
- `POST /api/arena/chat`
- `POST /api/arena/events`
- `POST /api/arena/prediction`
- `POST /api/arena/poll`

#### 管理接口

- `GET /api/admin/seasons`
- `POST /api/admin/seasons`
- `GET /api/admin/seasons/:id/leaderboard`
- `POST /api/admin/competitions`
- `PUT /api/admin/competitions/:id`
- `POST /api/admin/competitions/:id/transition`
- `GET /api/admin/competitions/:id/registrations`
- `POST /api/admin/registrations/:id/review`
- `POST /api/admin/competitions/:id/registrations/batch`
- `POST /api/admin/competitions/:id/duplicate`

## 10. 前后端对齐要求

### 10.1 前端必须拿到的关键数据

- Hub：活跃比赛、我的报名、赛季进度、最近结果、未读通知
- 比赛详情：规则、报名状态、参与人数、实时榜或结果榜
- Arena：账户状态、持仓、已成交、排行榜、社交数据、聊天室、预测状态、poll 数据、交易对精度
- Profile：基础资料、机构、地区、统计
- Analytics：盈亏分布、方向统计、平仓原因、权益曲线、交易时段、持仓时长散点

### 10.2 管理后台应支持的完整比赛配置

当前后端 schema 已支持，后台表单最终也应支持：

- `symbol`
- `startingCapital`
- `maxTradesPerMatch`
- `closeOnlySeconds`
- `feeRate`
- `prizePool`
- `prizeTableJson`
- `pointsTableJson`
- `requireMinSeasonPoints`
- `requireMinTier`
- `inviteOnly`
- `coverImageUrl`

## 11. 非功能要求

- 安全：密码哈希存储，敏感操作必须鉴权
- 稳定性：行情 stale 时禁止下单
- 性能：排行榜允许短 TTL 缓存；重计算不能阻塞主线程太久
- 审计：关键用户行为进入 `behavior_events`
- 可恢复：结算逻辑必须幂等，避免重复发奖与重复写结果
- 可运营：管理员可手动取消比赛、提前结束比赛
- 移动端可用：Arena 页已是双端布局，后续新功能不能只做桌面端

## 12. 基于当前代码确认的缺口

以下内容在代码中已经“有意图”但尚未完整打通，开发时应作为优先补齐项：

### 12.1 成就系统未闭环

- 已有 `user_achievements` 表
- 已有成就目录与成就页面
- 前端请求了 `GET /api/me/achievements`
- 服务端当前没有该接口，也没有后端成就发放流程

**要求**：补齐成就判定、持久化、查询 API。

### 12.2 邀请制比赛未闭环

- `competitions.inviteOnly` 已存在
- 前端详情页会展示“仅限邀请”
- 当前报名逻辑没有真正校验 invite list

**要求**：如要支持邀请制，新增邀请名单表或白名单机制，并在报名接口强校验。

### 12.3 比赛详情的参与者列表未完全对齐

- 前端详情页支持展示 `participants`
- 当前比赛详情接口未稳定返回参赛者列表

**要求**：补齐 `accepted participants` 预览数据。

### 12.4 后台表单未覆盖完整比赛配置

- 后端已支持更丰富的比赛规则字段
- 当前后台表单只暴露了部分字段

**要求**：后台编辑页需要与 schema 对齐，而不是只保留最小字段集。

### 12.5 资料公开开关未闭环

- `user_profiles.isProfilePublic` 已存在
- 公共主页读取了该字段
- 当前资料编辑页和更新接口没有暴露该开关

**要求**：补齐资料公开性设置。

### 12.6 奖金发放链路未闭环

- 资料中已有 `walletAddress`、`walletNetwork`
- 结果中已有 `prizeWon`
- 当前没有“发奖记录/发奖状态”实体

**要求**：如平台要走真实发奖，建议新增 `prize_payouts` 或运营对账表。

## 13. 建议的下一步实施顺序

1. 先补齐后台比赛配置与邀请制能力
2. 再补齐成就查询/发放闭环
3. 再补齐资料公开开关与公开资料接口细节
4. 最后补充真实发奖与运营审计能力

## 14. 结论

当前代码已经形成一个完整的比赛运营产品雏形，核心主链路已经明确：

- 公开获客
- 登录报名
- 管理员审核
- live 模拟交易
- 自动结算
- 历史复盘
- 赛季积分与机构传播

开发团队在后续设计数据库和 API 时，应以“**比赛运营平台**”而不是“单页交易 demo”作为中心，围绕**赛季、比赛、报名、实时交易、结算结果、用户画像、运营后台**六大域继续完善。
