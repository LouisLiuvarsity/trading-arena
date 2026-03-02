// ============================================================
// Mock Data for Trading Arena v5.0
// Fixed Prize Pool: 500 USDT/regular, 2500 USDT/grand final
// Rank tiers by cumulative season points (LoL-style)
// Min 5 trades/match for prize eligibility
// ============================================================

import type {
  LeaderboardEntry,
  ChatMessage,
  NewsItem,
  SocialData,
  SeasonState,
  AccountState,
  MatchState,
  QuantBotStats,
  AllTimeLeaderboardEntry,
  RankTier,
} from './types';
import { REGULAR_PRIZE_TABLE, MATCH_POINTS_TABLE, getRankTier, MIN_TRADES_FOR_PRIZE } from './types';

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

function getPrizeForRank(rank: number): number {
  for (const tier of REGULAR_PRIZE_TABLE) {
    if (rank >= tier.rankMin && rank <= tier.rankMax) return tier.prize;
  }
  return 0;
}

function getPointsForRank(rank: number): number {
  for (const tier of MATCH_POINTS_TABLE) {
    if (rank >= tier.rankMin && rank <= tier.rankMax) return tier.points;
  }
  return 0;
}

// Per-match leaderboard: sorted by weighted PnL% (收益率)
export function generateLeaderboard(myRank: number = 285): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  const botRank = 42;
  for (let i = 1; i <= 1000; i++) {
    const isBot = i === botRank;
    const pnlPct = isBot ? 6.8 : 12 - (i / 1000) * 18 + (Math.random() - 0.5) * 2;
    const pnl = pnlPct * 50; // 5000U base
    const weightedPnl = pnl * (isBot ? 1.15 : (0.7 + Math.random() * 0.6));
    const prize = getPrizeForRank(i);
    const points = getPointsForRank(i);
    // Most players have >= 5 trades, some don't
    const hasEnoughTrades = isBot ? true : (i <= 800 ? Math.random() > 0.05 : Math.random() > 0.3);
    // Season points determine rank tier
    const seasonPts = isBot ? 520 : Math.max(0, 800 - i * 0.8 + (Math.random() - 0.5) * 100);
    const tierInfo = getRankTier(seasonPts);

    entries.push({
      rank: i,
      username: isBot ? 'AlphaEngine v3' : i === myRank ? 'You' : USERNAMES[Math.floor(Math.random() * USERNAMES.length)] + (i < 100 ? '' : i.toString().slice(-2)),
      pnlPct: Math.round(pnlPct * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      weightedPnl: Math.round(weightedPnl * 100) / 100,
      matchPoints: points,
      prizeEligible: hasEnoughTrades,
      prizeAmount: hasEnoughTrades ? prize : 0,
      rankTier: tierInfo.tier,
      isYou: i === myRank,
      isBot,
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
    { id: '5', username: 'MoonTrader', message: '奖金线附近好紧张...还差0.3%', timestamp: Date.now() - 2000000, type: 'panic' },
    { id: '6', username: 'System', message: '📊 当前奖金线 #100 收益率：+5.2%', timestamp: Date.now() - 1800000, type: 'alert' },
    { id: '7', username: 'ScalpGod', message: '连亏3笔了，冷静一下', timestamp: Date.now() - 1500000, type: 'panic' },
    { id: '8', username: 'ChartMaster', message: '4h级别看空，但1h还在多头趋势', timestamp: Date.now() - 1200000, type: 'user' },
    { id: '9', username: 'DiamondHands', message: '拿住！权重马上升到1.0x了', timestamp: Date.now() - 900000, type: 'user' },
    { id: '10', username: 'DeFiKing', message: '资金费率转负了，空头要付费', timestamp: Date.now() - 600000, type: 'user' },
    { id: '11', username: 'System', message: '⚡ 奖金区竞争激烈！#90-#110 有 32 人', timestamp: Date.now() - 300000, type: 'alert' },
    { id: '12', username: 'SwingPro', message: '刚平了一笔+85U！排名直接从#120跳到#78 🚀', timestamp: Date.now() - 120000, type: 'brag' },
    { id: '13', username: 'BTCMaxi', message: '大家注意CPI数据快出了', timestamp: Date.now() - 60000, type: 'user' },
    { id: '14', username: 'OrderFlow', message: '订单簿上方有大卖单，小心', timestamp: Date.now() - 30000, type: 'user' },
    { id: '15', username: 'GammaScalp', message: '满仓做多+123U！直接冲进前100了 💰💰', timestamp: Date.now() - 15000, type: 'brag' },
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
    nearPromotionCount: 32,
    nearPromotionRange: '#90-#110',
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

// v5.0: Season state
export function generateSeasonState(): SeasonState {
  return {
    seasonId: 'season-2026-03',
    month: '2026-03',
    matchesPlayed: 5,
    matchesTotal: 15,
    grandFinalScheduled: true,
    matches: [
      { matchNumber: 1, matchType: 'regular', status: 'completed', rank: 87, weightedPnl: 312, pnlPct: 6.2, pointsEarned: 50, prizeWon: 10 },
      { matchNumber: 2, matchType: 'regular', status: 'completed', rank: 156, weightedPnl: 185, pnlPct: 3.7, pointsEarned: 30, prizeWon: 0 },
      { matchNumber: 3, matchType: 'regular', status: 'completed', rank: 42, weightedPnl: 428, pnlPct: 8.6, pointsEarned: 50, prizeWon: 4 },
      { matchNumber: 4, matchType: 'regular', status: 'completed', rank: 215, weightedPnl: 98, pnlPct: 2.0, pointsEarned: 15, prizeWon: 0 },
      { matchNumber: 5, matchType: 'regular', status: 'active', rank: 285, weightedPnl: 240, pnlPct: 4.8, pointsEarned: 15, prizeWon: 0 },
      { matchNumber: 6, matchType: 'regular', status: 'pending' },
      { matchNumber: 7, matchType: 'regular', status: 'pending' },
      { matchNumber: 8, matchType: 'regular', status: 'pending' },
      { matchNumber: 9, matchType: 'regular', status: 'pending' },
      { matchNumber: 10, matchType: 'regular', status: 'pending' },
      { matchNumber: 11, matchType: 'regular', status: 'pending' },
      { matchNumber: 12, matchType: 'regular', status: 'pending' },
      { matchNumber: 13, matchType: 'regular', status: 'pending' },
      { matchNumber: 14, matchType: 'regular', status: 'pending' },
      { matchNumber: 15, matchType: 'regular', status: 'pending' },
    ],
    totalPoints: 160,
    grandFinalQualified: false,
    grandFinalRank: undefined,
    lastMonthPointsBeforeDecay: 200,
    lastMonthPointsAfterDecay: 160,
  };
}

export function generateAccountState(): AccountState {
  const seasonPoints = 160;
  const tierInfo = getRankTier(seasonPoints);
  return {
    capital: 5000,
    equity: 5240,
    pnl: 240,
    pnlPct: 4.8,
    weightedPnl: 198,
    tradesUsed: 9,
    tradesMax: 40,
    rank: 285,
    matchPoints: 15,
    seasonPoints,
    grandFinalQualified: false,
    grandFinalLine: 200,
    prizeEligible: true, // 9 trades >= 5 min
    rankTier: tierInfo.tier,
    tierLeverage: tierInfo.leverage,
    prizeAmount: 0, // rank 285 = no prize
    directionConsistency: 0.72,
    directionBonus: true,
  };
}

export function generateMatchState(): MatchState {
  const startTime = Date.now() - 18 * 3600 * 1000;
  const endTime = startTime + 24 * 3600 * 1000;
  const elapsed = (Date.now() - startTime) / (endTime - startTime);
  const remainingSeconds = Math.max(0, (endTime - Date.now()) / 1000);
  return {
    matchId: 'match-005',
    matchNumber: 5,
    matchType: 'regular',
    totalRegularMatches: 15,
    startTime,
    endTime,
    elapsed: Math.min(elapsed, 1),
    remainingSeconds,
    symbol: 'SOLUSDT',
    participantCount: 847,
    prizePool: 500,
    isCloseOnly: remainingSeconds < 1800,
    monthLabel: '2026年3月',
  };
}

// ============================================================
// Emotional Chat Message Generators (5000U scale)
// ============================================================

export const EMOTIONAL_CHAT_MESSAGES = {
  brag: [
    '刚平仓+{pnl}U！排名直接跳了{ranks}名 🚀',
    '满仓做多赚了{pnl}U！前100稳了 💰',
    '连赢{streak}笔了，今天手感太好了',
    '权重1.3x加成太爽了，+{pnl}U 直接起飞',
    '刚从#150冲到#60，一笔翻盘 🔥',
    '这波空头吃了{pnl}U，感谢CPI数据',
    '排名进前50了！奖金4U到手',
    '这场拿了50积分，总决赛稳了',
    '段位快升到白银了，1.5x杠杆 💪',
  ],
  panic: [
    '连亏{streak}笔了...还有救吗',
    '排名又掉了{ranks}名，前100越来越远了',
    '止损被打了，-{pnl}U 心态崩了',
    '刚被假突破骗了，又亏了一笔',
    '只剩{trades}笔交易机会了，好慌',
    '才交易了3笔，还差2笔才有奖金资格...',
    '积分才{score}，总决赛没戏了',
    '满仓反向了，-{pnl}U 想退赛了',
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
    '奖金线附近好紧张...还差{gap}%',
    '被{count}个人超越了，排名在跌',
    '前100的门槛又提高了',
    '才交易了{trades}笔，还差几笔才有奖金资格',
    '这个月打了5场了，总积分才{total}，总决赛悬',
    '最后30分钟只能平仓了，紧张',
  ],
};

// ============================================================
// Quant Bot Mock Data
// ============================================================

export function generateQuantBotStats(): QuantBotStats {
  const now = Date.now();
  const equityCurve: Array<{ time: number; equity: number }> = [];
  let equity = 5000;
  for (let i = 0; i < 96; i++) {
    const time = now - (96 - i) * 15 * 60 * 1000;
    const change = (Math.random() - 0.42) * 30;
    equity = Math.max(4500, equity + change);
    equityCurve.push({ time, equity: Math.round(equity * 100) / 100 });
  }
  const finalEquity = equityCurve[equityCurve.length - 1].equity;

  return {
    name: 'AlphaEngine v3',
    totalReturn: Math.round((finalEquity - 5000) * 100) / 100,
    totalReturnPct: Math.round((finalEquity - 5000) / 50) / 100,
    winRate: 62.5,
    totalTrades: 24,
    maxDrawdown: -3.2,
    sharpeRatio: 1.85,
    avgHoldDuration: '42m',
    currentPosition: {
      direction: 'long',
      size: 2500,
      entryPrice: 142.35,
      unrealizedPnl: 38.5,
      unrealizedPnlPct: 1.54,
    },
    recentTrades: [
      { id: 'bt-1', direction: 'long', entryPrice: 141.20, exitPrice: 143.80, pnl: 45.8, pnlPct: 1.84, holdDuration: '1h 12m', timestamp: now - 3600000 },
      { id: 'bt-2', direction: 'short', entryPrice: 144.50, exitPrice: 143.10, pnl: 24.2, pnlPct: 0.97, holdDuration: '38m', timestamp: now - 7200000 },
      { id: 'bt-3', direction: 'long', entryPrice: 140.80, exitPrice: 141.60, pnl: 14.2, pnlPct: 0.57, holdDuration: '25m', timestamp: now - 10800000 },
      { id: 'bt-4', direction: 'short', entryPrice: 142.00, exitPrice: 142.90, pnl: -15.8, pnlPct: -0.63, holdDuration: '18m', timestamp: now - 14400000 },
      { id: 'bt-5', direction: 'long', entryPrice: 139.50, exitPrice: 141.20, pnl: 30.4, pnlPct: 1.22, holdDuration: '55m', timestamp: now - 18000000 },
      { id: 'bt-6', direction: 'long', entryPrice: 138.90, exitPrice: 139.80, pnl: 16.2, pnlPct: 0.65, holdDuration: '32m', timestamp: now - 21600000 },
    ],
    equityCurve,
    vsHumans: {
      botReturnPct: Math.round((finalEquity - 5000) / 50) / 100,
      avgHumanReturnPct: 1.8,
      topHumanReturnPct: 8.5,
      botWinRate: 62.5,
      avgHumanWinRate: 41.2,
      botMaxDrawdown: -3.2,
      avgHumanMaxDrawdown: -6.8,
      botSharpe: 1.85,
      avgHumanSharpe: 0.62,
    },
  };
}

// ============================================================
// All-Time Leaderboard: sorted by cumulative season points
// ============================================================

const ALL_TIME_NAMES = [
  'CryptoWhale', 'AlphaHunter', 'ScalpGod', 'ChartMaster', 'SwingPro',
  'DiamondHands', 'MoonTrader', 'OrderFlow', 'SmartMoney', 'TrendRider',
  'BreakoutKing', 'DeFiKing', 'LiquidityPro', 'FibTrader', 'VolumeSpike',
  'MomentumPlay', 'MeanRevert', 'GapFiller', 'NewsTrader', 'BasisTrade',
  'SpreadKing', 'DeltaNeutral', 'GammaScalp', 'ThetaGang', 'IronCondor',
  'PerpSwap', 'SpotFutures', 'CrossMargin', 'LeverageKing', 'VolCrusher',
];

export function generateAllTimeLeaderboard(): AllTimeLeaderboardEntry[] {
  const entries: AllTimeLeaderboardEntry[] = [];

  for (let i = 1; i <= 50; i++) {
    const isBot = i === 8;
    const matchesPlayed = isBot ? 12 : 3 + Math.floor(Math.random() * 12);
    const basePoints = isBot ? 520 : Math.max(0, 750 - i * 15 + (Math.random() - 0.5) * 40);
    const avgPoints = basePoints / matchesPlayed;
    const avgPnlPct = isBot ? 4.2 : (10 - i * 0.3 + (Math.random() - 0.5) * 2);
    const totalWeightedPnl = avgPnlPct * matchesPlayed * 50;
    const winRate = isBot ? 62.5 : Math.max(30, 65 - i * 0.5 + (Math.random() - 0.5) * 10);
    const bestRank = isBot ? 3 : Math.max(1, Math.floor(i * 0.6 + Math.random() * 10));
    const tierInfo = getRankTier(basePoints);

    entries.push({
      rank: i,
      username: isBot ? 'AlphaEngine v3' : ALL_TIME_NAMES[(i - 1) % ALL_TIME_NAMES.length] + (i > 30 ? i.toString() : ''),
      seasonPoints: Math.round(basePoints),
      matchesPlayed,
      avgPointsPerMatch: Math.round(avgPoints * 10) / 10,
      totalWeightedPnl: Math.round(totalWeightedPnl),
      avgPnlPct: Math.round(avgPnlPct * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      bestMatchRank: bestRank,
      rankTier: tierInfo.tier,
      grandFinalQualified: i <= 35,
      isBot,
    });
  }
  return entries;
}

export const SYSTEM_ALERTS = [
  '📊 奖金线 #100 当前加权收益：+{pnl}%',
  '⚡ 奖金区竞争激烈！#90-#110 有 {count} 人',
  '🏆 距离比赛结束还有不到{hours}小时！',
  '📈 SOLUSDT 突破关键阻力位',
  '⚠️ 资金费率即将结算',
  '🔔 前10名平均收益率 +{topPnl}%',
  '📉 过去30分钟有{overtaken}人被超越',
  '🔥 过去5分钟有{trades}笔交易成交',
  '💰 冠军奖金 55 USDT，前100名均有奖',
  '⚡ {count}名选手正在连亏中（3笔+）',
  '📊 全场平均交易{avgTrades}笔，你已交易{yourTrades}笔',
  '🎯 本场积分：前1名100分，前10名50分',
  '⚠️ 最后30分钟禁止开新仓！',
  '🏅 你的赛季总积分：{points}，距总决赛线还差{gap}分',
  '📋 每场至少完成5笔交易才有奖金资格！',
];
