# Trading Page Layout Analysis

## Current Desktop Layout (top to bottom)
1. **StatusBar** (2 rows):
   - Row 1: Home btn | Language | Equity | PnL | Rank | Prize | Points | Eligible | Trades | Countdown timer
   - Row 2: Season progress (match dots) | Season points | Matches played | Grand final status | Prize pool

2. **NewsTicker** - scrolling news bar

3. **CompetitionNotifications** - prediction/poll popups

4. **Main Content Area** (flex row):
   - Left: TickerBar + Chart + OrderBook (resizable)
   - Right panel (resizable tabs): Chat | Trades | Leaderboard | Stats | News

5. **TradingPanel** (bottom bar):
   - Order entry: Market price | Available balance | Trades left | Size input + slider | Leverage | TP/SL | Buy/Sell buttons
   - Position view: Direction + PnL | Entry/Mark price | Trade# | Hold time | TP/SL edit | Close button

6. **RankAnxietyStrip** (very bottom):
   - RANK #N | Overtaken by X | You overtook Y | Safe zone +N / Behind -N | Near line | Recent volume | Live dot

## User's 3 screenshots (from images):
1. Bottom bar: "RANK #1 | 被超 0 | 超越 0 | 安全区 +299 名 | 线附近 0 人 | 5m 成交 0"
2. Top row 2: "2026年3月 · 常规赛 · 赛季积分 0 · 已赛 2/2 · 总决赛 / 已晋级 · 奖金池 500U"  
3. Top row 1: "权益 5000.0U | 盈亏 +0.0U (+0.0%) | 排名 #1 | 奖金 — | 积分 +100 | 有资格 X 需5笔 | 文限 0/40"

## User's Requests:
1. Move bottom ranking (RankAnxietyStrip) INTO the Leaderboard tab in right panel
2. Remove the competition info bar (StatusBar row 2 - season progress)
3. Merge account info (StatusBar row 1) with TradingPanel - discuss how
