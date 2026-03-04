import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    // ── Common ──
    'common.live': 'LIVE',
    'common.solusdt': 'SOLUSDT',
    'common.perp': 'Perp',
    'common.connecting': '连接中...',
    'common.price': 'Price',
    'common.qty': 'Qty',
    'common.total': 'Total',
    'common.spread': 'Spread',
    'common.sol': 'SOL',

    // ── StatusBar ──
    'status.grandFinal': '总决赛',
    'status.matchNum': '第 {n}/15 场',
    'status.tier': '段位',
    'status.equity': 'Equity',
    'status.pnl': 'PnL',
    'status.rank': 'Rank',
    'status.prize': 'Prize',
    'status.points': 'Points',
    'status.eligible': 'Eligible',
    'status.needTrades': '✗ 需{n}笔',
    'status.trades': 'Trades',
    'status.closeOnly': '平仓模式',
    'status.closeOnlyShort': '平仓',
    'status.seasonPoints': '赛季积分:',
    'status.matchesPlayed': '已赛:',
    'status.grandFinalLabel': '总决赛:',
    'status.qualified': '✓ 已晋级',
    'status.notQualified': '未晋级',
    'status.prizePool': '奖金池',

    // ── MobileStatusBar ──
    'mstatus.eq': 'Eq',
    'mstatus.tr': 'Tr',
    'mstatus.pts': 'Pts',

    // ── TickerBar ──
    'ticker.24hChange': '24h 涨跌',
    'ticker.24hHigh': '24h 最高',
    'ticker.24hLow': '24h 最低',
    'ticker.24hVol': '24h 量(USDT)',
    'ticker.mark': 'Mark',
    'ticker.funding': 'Funding',

    // ── OrderBook ──
    'orderbook.title': 'ORDER BOOK',
    'orderbook.orderBook': 'Order Book',

    // ── Chat ──
    'chat.header': 'Chat Room',
    'chat.persist': '消息跨场次保留',
    'chat.online': '● {n} 在线',
    'chat.newMessages': '↓ 新消息',
    'chat.placeholder': '发送消息...',
    'chat.send': '发送',

    // ── Leaderboard ──
    'lb.title': '排行榜',
    'lb.top': 'Top',
    'lb.aroundMe': 'Around Me',
    'lb.adSpace': '广告位招租',
    'lb.adSub': 'Contact us for advertising opportunities',
    'lb.player': '选手',
    'lb.return': '收益%',
    'lb.prizeCol': '奖金',
    'lb.pointsCol': '积分',
    'lb.promotionLine': '═ 奖金线 ═',
    'lb.notEligible': '未达5笔',

    // ── TradeHistory ──
    'trades.title': 'Trade History',
    'trades.count': '{n} 笔交易',
    'trades.empty': '暂无交易',
    'trades.dir': 'Dir',
    'trades.fee': 'Fee',
    'trades.hold': 'Hold',
    'trades.open': 'Open',

    // ── NewsFeed ──
    'news.title': 'News Feed',
    'news.source': 'Binance News',
    'news.highImpact': '🔴 HIGH IMPACT',
    'news.medium': '🟡 MEDIUM',
    'news.bullish': '↑ 看涨',
    'news.bearish': '↓ 看跌',
    'news.neutral': '中性',
    'news.justNow': '刚刚',
    'news.mAgo': '{n}分钟前',
    'news.hAgo': '{n}小时前',
    'news.dAgo': '{n}天前',
    'news.breaking': 'BREAKING',

    // ── MarketStats ──
    'stats.title': '📊 全场实时统计',
    'stats.matchProgress': '比赛进行 {h}h / 24h · {n} 名参赛者',
    'stats.longShort': '多空比 (Long/Short)',
    'stats.longCount': '做多 {n} 人',
    'stats.shortCount': '做空 {n} 人',
    'stats.winRate': '全场胜率',
    'stats.profitAvg': '盈利 · 平均 +{pct}%',
    'stats.lossAvg': '亏损 · 平均 {pct}%',
    'stats.tradeActivity': '交易活跃度',
    'stats.avgTrades': '全场平均交易',
    'stats.yourTrades': '你的交易次数',
    'stats.tradesUnit': '{n} 笔',
    'stats.tradesOf': '{used} / {max} 笔',
    'stats.holdingPct': '当前持仓中',
    'stats.pctTraders': '{pct}% 选手',
    'stats.recentVol': '5min 成交量',
    'stats.medianTrades': '中位数交易',
    'stats.dominantDir': '主导方向',
    'stats.dirLong': '📈 做多',
    'stats.dirShort': '📉 做空',
    'stats.dirNeutral': '➡️ 中性',
    'stats.promotionNear': '⚡ 晋级线附近',
    'stats.promotionRank': '晋级线排名',
    'stats.nearCount': '线附近人数',
    'stats.nearPeople': '{n} 人',
    'stats.range': '竞争区间',
    'stats.tenMinChange': '10min 变化',
    'stats.yourRank': '你的排名',
    'stats.distToPromo': '距晋级线',
    'stats.safe': '安全 +{n} 名',
    'stats.behind': '差 {n} 名',
    'stats.tierTitle': '🏅 段位 & 奖金资格',
    // Prediction & Voting stats
    'stats.predVote': '🔮 投票 & 预测',
    'stats.pollLong': '看涨',
    'stats.pollShort': '看跌',
    'stats.pollNeutral': '观望',
    'stats.totalVotes': '总投票',
    'stats.yourVote': '你的投票',
    'stats.noVote': '未投票',
    'stats.predAccuracy': '预测准确率',
    'stats.predCorrect': '正确预测',
    'stats.predPending': '等待中',
    'stats.predTotal': '总预测',
    // Extra interesting stats
    'stats.extraTitle': '📉 风险 & 异常',
    'stats.lossStreak': '连败之王',
    'stats.lossStreakVal': '{n} 连败',
    'stats.onStreak': '连败中人数',
    'stats.avgRankChange': '30min 排名变化',
    'stats.noPredData': '暂无预测数据',
    'stats.noVoteData': '暂无投票数据',

    // ── RankAnxietyStrip ──
    'rank.label': '⚔ RANK',
    'rank.overtaken': '被超',
    'rank.overtook': '超越',
    'rank.safe': '安全区 +{n} 名',
    'rank.behind': '距晋级线还差 {n} 名',
    'rank.nearLine': '线附近 {n} 人',
    'rank.recentVol': '5m 成交 {n} 笔',

    // ── TradingPanel ──
    'tp.long': '↑ LONG',
    'tp.short': '↓ SHORT',
    'tp.entry': 'Entry',
    'tp.mark': 'Mark',
    'tp.trade': 'Trade',
    'tp.hold': 'Hold',
    'tp.weight': 'Weight',
    'tp.takeProfit': 'Take Profit',
    'tp.stopLoss': 'Stop Loss',
    'tp.notSet': 'Not set',
    'tp.edit': 'Edit',
    'tp.set': '+ Set',
    'tp.cancel': 'Cancel',
    'tp.save': 'Save',
    'tp.back': 'Back',
    'tp.close': 'Close',
    'tp.closePosition': 'Close Position',
    'tp.weightWarn': 'Weight 0.2x',
    'tp.confirm': 'Confirm',
    'tp.confirmWeight': 'Confirm (0.2x weight)',
    'tp.marketPrice': 'Market Price',
    'tp.available': 'Available',
    'tp.tradesLeft': 'Trades Left',
    'tp.tpsl': 'TP/SL',
    'tp.roiPct': 'ROI %',
    'tp.tpRoi': 'TP ROI %',
    'tp.slRoi': 'SL ROI %',
    'tp.tpPrice': 'TP Price',
    'tp.slPrice': 'SL Price',
    'tp.buyLong': 'Buy / Long',
    'tp.sellShort': 'Sell / Short',
    // Mobile abbreviations
    'tp.priceLabel': 'Price',
    'tp.avail': 'Avail',
    'tp.left': 'Left',

    // ── MobileToolbar ──
    'toolbar.chat': 'Chat',
    'toolbar.trades': 'Trades',
    'toolbar.rank': 'Rank',
    'toolbar.stats': 'Stats',
    'toolbar.news': 'News',
    'toolbar.chatRoom': 'Chat Room',
    'toolbar.tradeHistory': 'Trade History',
    'toolbar.leaderboard': 'Leaderboard',
    'toolbar.marketStats': 'Market Stats',
    'toolbar.newsFeed': 'News Feed',

    // ── CompetitionNotifications ──
    'notif.title': '通知',
    'notif.showNotif': '显示通知',
    'notif.unmute': '取消静音',
    'notif.mute': '静音通知',
    'notif.closePanel': '关闭通知面板',
    'notif.muted': '通知已静音',
    'notif.empty': '暂无新通知',
    'notif.quarter': '📊 比赛已过 1/4！',
    'notif.quarterDesc': '排名 #{rank} | 收益 {pnl} USDT | 积分 +{pts} | 交易 {used}/{max}',
    'notif.half': '📈 半程报告 — 预计奖金 {prize}U',
    'notif.halfDesc': '排名 #{rank} | 积分 +{pts} | {eligible}',
    'notif.halfEligible': '✓有奖金资格',
    'notif.halfNotEligible': '✗需至少5笔交易 (当前{n})',
    'notif.last6h': '⚡ 最后6小时！',
    'notif.last6hDesc': '排名 #{rank} | 预计奖金 {prize}U | 积分 +{pts} | {left} 笔交易机会剩余',
    'notif.last4h': '🔥 最后4小时！倒计时变色中...',
    'notif.last4hDesc': '排名 #{rank} | 预计奖金 {prize}U | 积分 +{pts} | 交易 {used}/{max}',
    'notif.last2h': '🚨 最终结算倒计时！结果将在 02:00:00 后锁定',
    'notif.last2hDesc': '排名 #{rank} | 预计奖金 {prize}U | 积分 +{pts}',
    'notif.last1h': '⏰ 最后1小时！最终冲刺！',
    'notif.last1hDesc': '排名 #{rank} | 积分 +{pts} | 每5分钟更新排名',
    'notif.overtaken': '📉 过去30分钟有 {n} 人超越了你！排名 #{rank}',
    'notif.tradePace': '📊 全场平均已交易 {avg} 笔，你才 {yours} 笔',
    'notif.eligibility': '🎯 还需 {n} 笔交易才有奖金资格（当前 {used}/5）',
    'notif.currentPrize': '💰 当前预计奖金 {prize} USDT — 保住排名还是冲击更高？',
    'notif.fieldLosing': '📊 全场 {pct}% 选手亏损中 | 平均亏损 {avgLoss}%',
    'notif.tradesRemaining': '⚠️ 仅剩 {n} 笔交易机会！每一笔都很关键',
    'notif.prediction': '🔮 整点预测！5分钟后SOL会涨还是跌？',
    'notif.predAccuracy': '准确率: {pct}% ({correct}/{total})',
    'notif.predSubmitted': '已提交: {dir} — 等待结算',
    'notif.up': '↑ UP',
    'notif.down': '↓ DOWN',

    // ── Achievement ──
    'ach.threeInRow': '3连胜！',
    'ach.welcome': '欢迎来到竞技场',
    'ach.firstTrade': '第一笔交易已开仓',
    'ach.top10': 'TOP 10!',

    // ── TradingPage ──
    'page.loginFirst': '请先登录。',
    'page.loading': '正在加载竞技场...',
    'page.predResult': '预测: {dir}',
    'page.predDesc': '5分钟后揭晓结果',
    'page.staleData': '行情数据过期',
    'page.staleDataLong': '行情数据过期 — 交易暂时禁用',
    'page.chart': 'Chart',
    'page.orderbook': 'OrderBook',
    'page.info': 'Info',
    'page.24hHigh': '24h High',
    'page.24hLow': '24h Low',
    'page.mark': 'Mark',
    'page.funding': 'Funding',
    'page.24hVol': '24h Vol',
    'page.prizePool': 'Prize Pool',
    'page.safe': 'Safe +{n}',
    'page.need': 'Need {n} more',
    'page.overtakenBy': '被超',
    'page.youOvertook': '超越',
    'page.nearLine': '线附近 {n} 人',
    'page.positionClosed': 'Position closed',
    'page.settleDone': 'Server-side settlement complete',
  },

  en: {
    // ── Common ──
    'common.live': 'LIVE',
    'common.solusdt': 'SOLUSDT',
    'common.perp': 'Perp',
    'common.connecting': 'Connecting...',
    'common.price': 'Price',
    'common.qty': 'Qty',
    'common.total': 'Total',
    'common.spread': 'Spread',
    'common.sol': 'SOL',

    // ── StatusBar ──
    'status.grandFinal': 'Grand Final',
    'status.matchNum': 'Match {n}/15',
    'status.tier': 'Tier',
    'status.equity': 'Equity',
    'status.pnl': 'PnL',
    'status.rank': 'Rank',
    'status.prize': 'Prize',
    'status.points': 'Points',
    'status.eligible': 'Eligible',
    'status.needTrades': '✗ Need {n}',
    'status.trades': 'Trades',
    'status.closeOnly': 'Close-Only',
    'status.closeOnlyShort': 'Close',
    'status.seasonPoints': 'Season Pts:',
    'status.matchesPlayed': 'Played:',
    'status.grandFinalLabel': 'Finals:',
    'status.qualified': '✓ Qualified',
    'status.notQualified': 'Not Qualified',
    'status.prizePool': 'Prize Pool',

    // ── MobileStatusBar ──
    'mstatus.eq': 'Eq',
    'mstatus.tr': 'Tr',
    'mstatus.pts': 'Pts',

    // ── TickerBar ──
    'ticker.24hChange': '24h Change',
    'ticker.24hHigh': '24h High',
    'ticker.24hLow': '24h Low',
    'ticker.24hVol': '24h Vol(USDT)',
    'ticker.mark': 'Mark',
    'ticker.funding': 'Funding',

    // ── OrderBook ──
    'orderbook.title': 'ORDER BOOK',
    'orderbook.orderBook': 'Order Book',

    // ── Chat ──
    'chat.header': 'Chat Room',
    'chat.persist': 'Messages persist across matches',
    'chat.online': '● {n} online',
    'chat.newMessages': '↓ New messages',
    'chat.placeholder': 'Send message...',
    'chat.send': 'Send',

    // ── Leaderboard ──
    'lb.title': 'Leaderboard',
    'lb.top': 'Top',
    'lb.aroundMe': 'Around Me',
    'lb.adSpace': 'Ad Space Available',
    'lb.adSub': 'Contact us for advertising opportunities',
    'lb.player': 'Player',
    'lb.return': 'Return%',
    'lb.prizeCol': 'Prize',
    'lb.pointsCol': 'Points',
    'lb.promotionLine': '═ Prize Line ═',
    'lb.notEligible': '<5 trades',

    // ── TradeHistory ──
    'trades.title': 'Trade History',
    'trades.count': '{n} trades',
    'trades.empty': 'No trades yet',
    'trades.dir': 'Dir',
    'trades.fee': 'Fee',
    'trades.hold': 'Hold',
    'trades.open': 'Open',

    // ── NewsFeed ──
    'news.title': 'News Feed',
    'news.source': 'Binance News',
    'news.highImpact': '🔴 HIGH IMPACT',
    'news.medium': '🟡 MEDIUM',
    'news.bullish': '↑ Bullish',
    'news.bearish': '↓ Bearish',
    'news.neutral': 'Neutral',
    'news.justNow': 'just now',
    'news.mAgo': '{n}m ago',
    'news.hAgo': '{n}h ago',
    'news.dAgo': '{n}d ago',
    'news.breaking': 'BREAKING',

    // ── MarketStats ──
    'stats.title': '📊 Live Market Stats',
    'stats.matchProgress': 'Match {h}h / 24h · {n} participants',
    'stats.longShort': 'Long/Short Ratio',
    'stats.longCount': 'Long {n}',
    'stats.shortCount': 'Short {n}',
    'stats.winRate': 'Win Rate',
    'stats.profitAvg': 'Profit · avg +{pct}%',
    'stats.lossAvg': 'Loss · avg {pct}%',
    'stats.tradeActivity': 'Trading Activity',
    'stats.avgTrades': 'Avg trades',
    'stats.yourTrades': 'Your trades',
    'stats.tradesUnit': '{n} trades',
    'stats.tradesOf': '{used} / {max}',
    'stats.holdingPct': 'In position',
    'stats.pctTraders': '{pct}% traders',
    'stats.recentVol': '5min volume',
    'stats.medianTrades': 'Median trades',
    'stats.dominantDir': 'Dominant dir',
    'stats.dirLong': '📈 Long',
    'stats.dirShort': '📉 Short',
    'stats.dirNeutral': '➡️ Neutral',
    'stats.promotionNear': '⚡ Near Prize Line',
    'stats.promotionRank': 'Prize line rank',
    'stats.nearCount': 'Near count',
    'stats.nearPeople': '{n} traders',
    'stats.range': 'Contest range',
    'stats.tenMinChange': '10min change',
    'stats.yourRank': 'Your rank',
    'stats.distToPromo': 'To prize line',
    'stats.safe': 'Safe +{n}',
    'stats.behind': 'Behind {n}',
    'stats.tierTitle': '🏅 Tier & Prize Eligibility',
    // Prediction & Voting stats
    'stats.predVote': '🔮 Votes & Predictions',
    'stats.pollLong': 'Long',
    'stats.pollShort': 'Short',
    'stats.pollNeutral': 'Neutral',
    'stats.totalVotes': 'Total votes',
    'stats.yourVote': 'Your vote',
    'stats.noVote': 'Not voted',
    'stats.predAccuracy': 'Prediction accuracy',
    'stats.predCorrect': 'Correct',
    'stats.predPending': 'Pending',
    'stats.predTotal': 'Total predictions',
    // Extra interesting stats
    'stats.extraTitle': '📉 Risk & Anomalies',
    'stats.lossStreak': 'Loss streak leader',
    'stats.lossStreakVal': '{n} consecutive',
    'stats.onStreak': 'On losing streak',
    'stats.avgRankChange': '30min rank change',
    'stats.noPredData': 'No prediction data',
    'stats.noVoteData': 'No vote data',

    // ── RankAnxietyStrip ──
    'rank.label': '⚔ RANK',
    'rank.overtaken': 'Overtaken',
    'rank.overtook': 'Overtook',
    'rank.safe': 'Safe +{n}',
    'rank.behind': '{n} behind prize line',
    'rank.nearLine': '{n} near line',
    'rank.recentVol': '5m vol {n}',

    // ── TradingPanel ──
    'tp.long': '↑ LONG',
    'tp.short': '↓ SHORT',
    'tp.entry': 'Entry',
    'tp.mark': 'Mark',
    'tp.trade': 'Trade',
    'tp.hold': 'Hold',
    'tp.weight': 'Weight',
    'tp.takeProfit': 'Take Profit',
    'tp.stopLoss': 'Stop Loss',
    'tp.notSet': 'Not set',
    'tp.edit': 'Edit',
    'tp.set': '+ Set',
    'tp.cancel': 'Cancel',
    'tp.save': 'Save',
    'tp.back': 'Back',
    'tp.close': 'Close',
    'tp.closePosition': 'Close Position',
    'tp.weightWarn': 'Weight 0.2x',
    'tp.confirm': 'Confirm',
    'tp.confirmWeight': 'Confirm (0.2x weight)',
    'tp.marketPrice': 'Market Price',
    'tp.available': 'Available',
    'tp.tradesLeft': 'Trades Left',
    'tp.tpsl': 'TP/SL',
    'tp.roiPct': 'ROI %',
    'tp.tpRoi': 'TP ROI %',
    'tp.slRoi': 'SL ROI %',
    'tp.tpPrice': 'TP Price',
    'tp.slPrice': 'SL Price',
    'tp.buyLong': 'Buy / Long',
    'tp.sellShort': 'Sell / Short',
    // Mobile abbreviations
    'tp.priceLabel': 'Price',
    'tp.avail': 'Avail',
    'tp.left': 'Left',

    // ── MobileToolbar ──
    'toolbar.chat': 'Chat',
    'toolbar.trades': 'Trades',
    'toolbar.rank': 'Rank',
    'toolbar.stats': 'Stats',
    'toolbar.news': 'News',
    'toolbar.chatRoom': 'Chat Room',
    'toolbar.tradeHistory': 'Trade History',
    'toolbar.leaderboard': 'Leaderboard',
    'toolbar.marketStats': 'Market Stats',
    'toolbar.newsFeed': 'News Feed',

    // ── CompetitionNotifications ──
    'notif.title': 'Notifications',
    'notif.showNotif': 'Show notifications',
    'notif.unmute': 'Unmute',
    'notif.mute': 'Mute notifications',
    'notif.closePanel': 'Close panel',
    'notif.muted': 'Notifications muted',
    'notif.empty': 'No new notifications',
    'notif.quarter': '📊 Quarter done!',
    'notif.quarterDesc': 'Rank #{rank} | PnL {pnl} USDT | Points +{pts} | Trades {used}/{max}',
    'notif.half': '📈 Halftime — Est. prize {prize}U',
    'notif.halfDesc': 'Rank #{rank} | Points +{pts} | {eligible}',
    'notif.halfEligible': '✓ Prize eligible',
    'notif.halfNotEligible': '✗ Need 5 trades (now {n})',
    'notif.last6h': '⚡ 6 hours left!',
    'notif.last6hDesc': 'Rank #{rank} | Est. prize {prize}U | Points +{pts} | {left} trades left',
    'notif.last4h': '🔥 4 hours left! Timer changing color...',
    'notif.last4hDesc': 'Rank #{rank} | Est. prize {prize}U | Points +{pts} | Trades {used}/{max}',
    'notif.last2h': '🚨 Final countdown! Results lock in 02:00:00',
    'notif.last2hDesc': 'Rank #{rank} | Est. prize {prize}U | Points +{pts}',
    'notif.last1h': '⏰ Last hour! Final sprint!',
    'notif.last1hDesc': 'Rank #{rank} | Points +{pts} | Ranks update every 5min',
    'notif.overtaken': '📉 {n} traders overtook you in 30min! Rank #{rank}',
    'notif.tradePace': '📊 Field avg {avg} trades, you only have {yours}',
    'notif.eligibility': '🎯 Need {n} more trades for prize eligibility ({used}/5)',
    'notif.currentPrize': '💰 Est. prize {prize} USDT — hold rank or push higher?',
    'notif.fieldLosing': '📊 {pct}% of field losing | avg loss {avgLoss}%',
    'notif.tradesRemaining': '⚠️ Only {n} trades left! Every one counts',
    'notif.prediction': '🔮 Hourly prediction! Will SOL go up or down in 5min?',
    'notif.predAccuracy': 'Accuracy: {pct}% ({correct}/{total})',
    'notif.predSubmitted': 'Submitted: {dir} — awaiting result',
    'notif.up': '↑ UP',
    'notif.down': '↓ DOWN',

    // ── Achievement ──
    'ach.threeInRow': '3 in a Row!',
    'ach.welcome': 'Welcome to the Arena',
    'ach.firstTrade': 'First trade opened',
    'ach.top10': 'TOP 10!',

    // ── TradingPage ──
    'page.loginFirst': 'Please login first.',
    'page.loading': 'Loading arena state...',
    'page.predResult': 'Prediction: {dir}',
    'page.predDesc': 'Result in 5 minutes',
    'page.staleData': 'Market data stale',
    'page.staleDataLong': 'Market data is stale — trading temporarily disabled',
    'page.chart': 'Chart',
    'page.orderbook': 'OrderBook',
    'page.info': 'Info',
    'page.24hHigh': '24h High',
    'page.24hLow': '24h Low',
    'page.mark': 'Mark',
    'page.funding': 'Funding',
    'page.24hVol': '24h Vol',
    'page.prizePool': 'Prize Pool',
    'page.safe': 'Safe +{n}',
    'page.need': 'Need {n} more',
    'page.overtakenBy': 'Overtaken',
    'page.youOvertook': 'Overtook',
    'page.nearLine': '{n} near line',
    'page.positionClosed': 'Position closed',
    'page.settleDone': 'Server-side settlement complete',
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('arena-lang');
      if (saved === 'en' || saved === 'zh') return saved;
    } catch {}
    return 'zh';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('arena-lang', l); } catch {}
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let str = translations[lang][key] ?? translations.zh[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
