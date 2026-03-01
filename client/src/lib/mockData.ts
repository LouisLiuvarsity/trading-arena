// ============================================================
// Mock Data for Trading Arena Demo
// Capital: 5000 USDT / No leverage / 10%-25% profit sharing
// Enhanced with emotional pressure elements
// ============================================================

import type {
  LeaderboardEntry,
  ChatMessage,
  NewsItem,
  SocialData,
  CycleState,
  AccountState,
  MatchState,
} from './types';

const USERNAMES = [
  'CryptoWhale', 'SatoshiFan', 'MoonTrader', 'DiamondHands', 'BearSlayer',
  'AlphaHunter', 'DeFiKing', 'ChartMaster', 'ScalpGod', 'SwingPro',
  'BTCMaxi', 'AltSeason', 'LiquidityPro', 'OrderFlow', 'SmartMoney',
  'TrendRider', 'BreakoutKing', 'SupportLevel', 'ResistanceZone', 'FibTrader',
  'VolumeSpike', 'MomentumPlay', 'MeanRevert', 'GapFiller', 'NewsTrader',
  'FundingArb', 'SpreadKing', 'DeltaNeutral', 'GammaScalp', 'ThetaGang',
  'IronCondor', 'Straddle_Pro', 'VolCrusher', 'SkewHunter', 'BasisTrade',
  'PerpSwap', 'SpotFutures', 'CrossMargin', 'IsolatedPro', 'LeverageKing',
];

// 5000U capital: pnl range is roughly -500U to +500U per match
export function generateLeaderboard(myRank: number = 285): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (let i = 1; i <= 1000; i++) {
    const pnlPct = 12 - (i / 1000) * 18 + (Math.random() - 0.5) * 2;
    const pnl = pnlPct * 50; // 5000U base → pnl in absolute terms
    const profitSharePct = pnlPct > 0 ? (i <= 100 ? 25 : i <= 300 ? 20 : i <= 500 ? 15 : 10) : 10;
    const withdrawable = pnl > 0 ? pnl * (profitSharePct / 100) : 0;
    entries.push({
      rank: i,
      username: i === myRank ? 'You' : USERNAMES[Math.floor(Math.random() * USERNAMES.length)] + (i < 100 ? '' : i.toString().slice(-2)),
      pnlPct: Math.round(pnlPct * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      profitSharePct,
      withdrawable: Math.round(withdrawable * 100) / 100,
      promotionScore: 1000 - i,
      isYou: i === myRank,
    });
  }
  return entries;
}

export function generateChatMessages(): ChatMessage[] {
  const messages: ChatMessage[] = [
    { id: '1', username: 'CryptoWhale', message: '刚做多了，感觉要拉', timestamp: Date.now() - 3600000, type: 'user' },
    { id: '2', username: 'System', message: '🏆 比赛已进行 18 小时，最后 6 小时冲刺！', timestamp: Date.now() - 3200000, type: 'system' },
    { id: '3', username: 'BearSlayer', message: '空头小心了，支撑位很强', timestamp: Date.now() - 2800000, type: 'user' },
    { id: '4', username: 'AlphaHunter', message: '这波量能不够，假突破概率大', timestamp: Date.now() - 2400000, type: 'user' },
    { id: '5', username: 'MoonTrader', message: '晋级线附近好紧张...还差0.3%', timestamp: Date.now() - 2000000, type: 'panic' },
    { id: '6', username: 'System', message: '📊 当前晋级线 #300 收益率：+1.5%', timestamp: Date.now() - 1800000, type: 'alert' },
    { id: '7', username: 'ScalpGod', message: '连亏3笔了，冷静一下', timestamp: Date.now() - 1500000, type: 'panic' },
    { id: '8', username: 'ChartMaster', message: '4h级别看空，但1h还在多头趋势', timestamp: Date.now() - 1200000, type: 'user' },
    { id: '9', username: 'DiamondHands', message: '拿住！权重马上升到1.0x了', timestamp: Date.now() - 900000, type: 'user' },
    { id: '10', username: 'DeFiKing', message: '资金费率转负了，空头要付费', timestamp: Date.now() - 600000, type: 'user' },
    { id: '11', username: 'System', message: '⚡ 晋级线附近竞争激烈！#290-#310 有 47 人', timestamp: Date.now() - 300000, type: 'alert' },
    { id: '12', username: 'SwingPro', message: '刚平了一笔+85U！排名直接从#320跳到#278 🚀', timestamp: Date.now() - 120000, type: 'brag' },
    { id: '13', username: 'BTCMaxi', message: '大家注意CPI数据快出了', timestamp: Date.now() - 60000, type: 'user' },
    { id: '14', username: 'OrderFlow', message: '订单簿上方有大卖单，小心', timestamp: Date.now() - 30000, type: 'user' },
    { id: '15', username: 'GammaScalp', message: '满仓做多+123U！直接晋级线以上了 💰💰', timestamp: Date.now() - 15000, type: 'brag' },
  ];
  return messages;
}

export function generateNewsItems(): NewsItem[] {
  return [
    { id: '1', title: '🔴 BREAKING: US CPI Data Shows Higher-Than-Expected Inflation — Markets React Sharply', source: 'Binance News', timestamp: Date.now() - 300000, sentiment: 'bearish', impact: 'high', isBreaking: true },
    { id: '2', title: 'Bitcoin Surges Past Key Resistance as Institutional Buying Accelerates', source: 'Binance News', timestamp: Date.now() - 1800000, sentiment: 'bullish', impact: 'high' },
    { id: '3', title: 'Fed Officials Signal Potential Rate Pause in Upcoming Meeting', source: 'Binance News', timestamp: Date.now() - 3600000, sentiment: 'bullish', impact: 'medium' },
    { id: '4', title: 'Ethereum Layer 2 TVL Reaches New All-Time High', source: 'Binance News', timestamp: Date.now() - 5400000, sentiment: 'neutral', impact: 'low' },
    { id: '5', title: '⚠️ Whale Alert: 15,000 BTC Moved from Cold Wallet to Binance — Potential Sell Pressure', source: 'Binance News', timestamp: Date.now() - 7200000, sentiment: 'bearish', impact: 'high' },
    { id: '6', title: 'Major Exchange Reports Record Futures Open Interest — Liquidation Cascade Risk', source: 'Binance News', timestamp: Date.now() - 9000000, sentiment: 'bearish', impact: 'medium' },
    { id: '7', title: 'Crypto Fear & Greed Index Moves to "Extreme Greed" Territory', source: 'Binance News', timestamp: Date.now() - 10800000, sentiment: 'bullish', impact: 'medium' },
    { id: '8', title: 'SEC Commissioner Hints at Clearer Crypto Regulatory Framework', source: 'Binance News', timestamp: Date.now() - 14400000, sentiment: 'bullish', impact: 'low' },
  ];
}

export function generateSocialData(): SocialData {
  return {
    longPct: 64,
    shortPct: 36,
    longPctDelta: +3.2,
    profitablePct: 38,
    losingPct: 62,
    avgProfitPct: 3.8,
    avgLossPct: -2.1,
    avgTradesPerPerson: 12.4,
    medianTradesPerPerson: 11,
    activeTradersPct: 47,
    nearPromotionCount: 47,
    nearPromotionRange: '#290-#310',
    nearPromotionDelta: +5,
    consecutiveLossLeader: 7,
    tradersOnLosingStreak: 89,
    recentDirectionBias: 'long',
    recentTradeVolume: 34,
    avgRankChange30m: 18.5,
    tradersOvertakenYou: 3,
    youOvertook: 1,
  };
}

export function generateCycleState(): CycleState {
  return {
    cycleId: 'cycle-001',
    matches: [
      { matchNumber: 1, status: 'completed', rank: 187, promotionScore: 813, pnl: 225, profitSharePct: 25, withdrawable: 56.3 },
      { matchNumber: 2, status: 'active', rank: 285, promotionScore: 715, pnl: 240, profitSharePct: 20, withdrawable: 48 },
      { matchNumber: 3, status: 'pending' },
    ],
    avgPromotionScore: 764,
    cumulativePnl: 465,
    cumulativeWithdrawable: 104.3,
    promotionTarget: '进阶（10,000U / 无杠杆）',
  };
}

export function generateAccountState(): AccountState {
  return {
    capital: 5000,
    equity: 5240,
    pnl: 240,
    pnlPct: 4.8,
    tradesUsed: 9,
    tradesMax: 40,
    rank: 285,
    promotionScore: 715,
    promotionThreshold: 700,
    participationScore: 28000,
    profitSharePct: 20,
    withdrawable: 48,
    stage: 1,
    stageCapital: 5000,
    stageMaxLeverage: 1,
  };
}

export function generateMatchState(): MatchState {
  const startTime = Date.now() - 18 * 3600 * 1000;
  const endTime = startTime + 24 * 3600 * 1000;
  const elapsed = (Date.now() - startTime) / (endTime - startTime);
  const remainingSeconds = Math.max(0, (endTime - Date.now()) / 1000);
  return {
    matchId: 'match-002',
    matchNumber: 2,
    totalMatches: 3,
    startTime,
    endTime,
    elapsed: Math.min(elapsed, 1),
    remainingSeconds,
    symbol: 'HYPERUSDT',
    participantCount: 1000,
  };
}

// ============================================================
// Emotional Chat Message Generators (5000U scale)
// ============================================================

export const EMOTIONAL_CHAT_MESSAGES = {
  brag: [
    '刚平仓+{pnl}U！排名直接跳了{ranks}名 🚀',
    '满仓做多赚了{pnl}U！晋级稳了 💰',
    '连赢{streak}笔了，今天手感太好了',
    '权重1.3x加成太爽了，+{pnl}U 直接起飞',
    '刚从#350冲到#260，一笔翻盘 🔥',
    '积分已经40000了，25%分成到手 😎',
    '这波空头吃了{pnl}U，感谢CPI数据',
    '排名进前100了！可提现{withdraw}U',
  ],
  panic: [
    '连亏{streak}笔了...还有救吗',
    '排名又掉了{ranks}名，晋级线越来越远了',
    '止损被打了，-{pnl}U 心态崩了',
    '刚被假突破骗了，又亏了一笔',
    '只剩{trades}笔交易机会了，好慌',
    '可提现从{before}U跌到{after}U了...',
    '晋级分掉到{score}了，还能晋级吗？',
    '满仓反向了，-{pnl}U 想退赛了',
    '这个月第二次被降级了...',
  ],
  fomo: [
    '大家都在做多，我要不要跟？',
    '这波拉盘不上车就来不及了吧',
    '看到新闻了吗？赶紧开仓！',
    '64%的人做多，少数服从多数？',
    '前面的人都在加仓，我也满仓了',
    '最后6小时了，必须搏一把',
    '排名掉太多了，只能满仓梭哈了',
  ],
  analysis: [
    '这个位置做空风险太大了',
    '看这个量能，主力在吸筹',
    '4h级别看空，但1h还在多头趋势',
    '资金费率变了，注意方向',
    '订单簿上方有大卖单，小心',
    '支撑位很强，多头别慌',
    '这波是假突破，别追了',
    '看裸K线就够了，别想太多',
  ],
  pressure: [
    '晋级线附近好紧张...还差{gap}%',
    '被{count}个人超越了，排名在跌',
    '权重还是0.4x，要不要继续拿？',
    '积分才{score}，25%分成遥遥无期',
    '第3场了，累计才赚{total}U，压力好大',
    '降级的话本金直接砍半...',
  ],
};

export const SYSTEM_ALERTS = [
  '📊 晋级线 #300 当前收益率：+{pnl}%',
  '⚡ 晋级线附近竞争激烈！#290-#310 有 {count} 人',
  '🏆 距离比赛结束还有不到{hours}小时！',
  '📈 HYPERUSDT 突破关键阻力位',
  '⚠️ 资金费率即将结算',
  '🔔 前10名平均收益率 +{topPnl}%',
  '📉 过去30分钟有{overtaken}人被超越',
  '🔥 过去5分钟有{trades}笔交易成交',
  '💰 当前全场平均可提现：{avgWithdraw}U',
  '⚡ {count}名选手正在连亏中（3笔+）',
  '📊 全场平均交易{avgTrades}笔，你已交易{yourTrades}笔',
  '🎯 距离25%分成还需{scoreGap}积分',
];
