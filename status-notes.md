# Status Notes — 2026-03-04

## v2.0 Implementation Complete

### 系统转型: 永动机 → 赛事运营平台

**核心改动：**
- 竞赛生命周期状态机：draft → announced → registration_open → registration_closed → live → settling → completed
- ArenaEngine 的 `rotateMatchIfNeeded` 通过 `legacyAutoRotate` flag 控制，不删除
- `competitions` 表通过 `matchId` 列桥接 `matches` 表，ArenaEngine 交易逻辑完全不变
- wouter 路由替代 useState 状态机，25 个路由页面
- AuthContext 替代 prop drilling

### 编译状态
- `tsc --noEmit` — 零错误
- `vite build` — 成功 (5.57s)

### 新增文件 ~40 个
- Server: competition-db.ts (34函数), competition-engine.ts, competition-routes.ts (~25端点), profile-routes.ts, analytics-routes.ts, stats-routes.ts
- Shared: competitionTypes.ts, achievements.ts (24个成就)
- Client: AuthContext, AppShell, NotificationBell, SettlementOverlay, useNotifications, competition-api
- 18 个全功能页面 (Hub, Competitions, CompetitionDetail, Results, MatchHistory, Profile, ProfileEdit, Analytics, Achievements, Leaderboard, Notifications, Stats, InstitutionStats, PublicProfile, 4个Admin页面)

### 新增 DB 表 8 张
seasons, competitions, competition_registrations, match_results, notifications, user_achievements, institutions, user_profiles

### 待办
- [ ] `pnpm db:push` 将 schema 推送到数据库
- [ ] 设置第一个 admin 账户 (UPDATE arena_accounts SET role='admin' WHERE username='xxx')
- [ ] 创建第一个赛季和比赛进行端到端测试
- [ ] i18n: 新增页面的翻译 key (~200个)
- [ ] 移动端全流程测试
- [ ] Code splitting (当前单包 1.6MB，可用 React.lazy 分包)
