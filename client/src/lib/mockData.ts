// ============================================================
// Mock Data for Trading Arena Demo
// Generates realistic competition data for demonstration
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

export function generateLeaderboard(myRank: number = 285): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (let i = 1; i <= 1000; i++) {
    const pnlPct = 12 - (i / 1000) * 18 + (Math.random() - 0.5) * 2;
    const pnl = pnlPct * 5;
    const profitSharePct = pnlPct > 0 ? (i <= 100 ? 50 : i <= 300 ? 45 : i <= 500 ? 40 : 30) : 30;
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
    { id: '5', username: 'MoonTrader', message: '晋级线附近好紧张...还差0.3%', timestamp: Date.now() - 2000000, type: 'user' },
    { id: '6', username: 'System', message: '📊 当前晋级线 #300 收益率：+1.5%', timestamp: Date.now() - 1800000, type: 'alert' },
    { id: '7', username: 'ScalpGod', message: '连亏3笔了，冷静一下', timestamp: Date.now() - 1500000, type: 'user' },
    { id: '8', username: 'ChartMaster', message: '4h级别看空，但1h还在多头趋势', timestamp: Date.now() - 1200000, type: 'user' },
    { id: '9', username: 'DiamondHands', message: '拿住！权重马上升到1.0x了', timestamp: Date.now() - 900000, type: 'user' },
    { id: '10', username: 'DeFiKing', message: '资金费率转负了，空头要付费', timestamp: Date.now() - 600000, type: 'user' },
    { id: '11', username: 'System', message: '⚡ 晋级线附近竞争激烈！#290-#310 有 47 人', timestamp: Date.now() - 300000, type: 'alert' },
    { id: '12', username: 'SwingPro', message: '刚平仓+2.1U，积分又涨了一截', timestamp: Date.now() - 120000, type: 'user' },
    { id: '13', username: 'BTCMaxi', message: '大家注意CPI数据快出了', timestamp: Date.now() - 60000, type: 'user' },
    { id: '14', username: 'OrderFlow', message: '订单簿上方有大卖单，小心', timestamp: Date.now() - 30000, type: 'user' },
  ];
  return messages;
}

export function generateNewsItems(): NewsItem[] {
  return [
    { id: '1', title: 'Bitcoin Surges Past Key Resistance as Institutional Buying Accelerates', source: 'Binance News', timestamp: Date.now() - 1800000, sentiment: 'bullish' },
    { id: '2', title: 'Fed Officials Signal Potential Rate Pause in Upcoming Meeting', source: 'Binance News', timestamp: Date.now() - 3600000, sentiment: 'bullish' },
    { id: '3', title: 'Ethereum Layer 2 TVL Reaches New All-Time High', source: 'Binance News', timestamp: Date.now() - 5400000, sentiment: 'neutral' },
    { id: '4', title: 'US CPI Data Release Expected Today — Markets Brace for Volatility', source: 'Binance News', timestamp: Date.now() - 7200000, sentiment: 'neutral' },
    { id: '5', title: 'Major Exchange Reports Record Futures Open Interest', source: 'Binance News', timestamp: Date.now() - 9000000, sentiment: 'neutral' },
    { id: '6', title: 'Crypto Fear & Greed Index Moves to "Greed" Territory', source: 'Binance News', timestamp: Date.now() - 10800000, sentiment: 'bullish' },
    { id: '7', title: 'SEC Commissioner Hints at Clearer Crypto Regulatory Framework', source: 'Binance News', timestamp: Date.now() - 14400000, sentiment: 'bullish' },
    { id: '8', title: 'Whale Alert: 5,000 BTC Moved from Cold Wallet to Exchange', source: 'Binance News', timestamp: Date.now() - 18000000, sentiment: 'bearish' },
  ];
}

export function generateSocialData(): SocialData {
  return {
    longPct: 64,
    shortPct: 36,
    profitablePct: 38,
    losingPct: 62,
    nearPromotionCount: 47,
    nearPromotionRange: '#290-#310',
  };
}

export function generateCycleState(): CycleState {
  return {
    cycleId: 'cycle-001',
    matches: [
      { matchNumber: 1, status: 'completed', rank: 187, promotionScore: 813, pnl: 22.5, profitSharePct: 50, withdrawable: 11.3 },
      { matchNumber: 2, status: 'active', rank: 285, promotionScore: 715, pnl: 4.0, profitSharePct: 45, withdrawable: 1.8 },
      { matchNumber: 3, status: 'pending' },
    ],
    avgPromotionScore: 764,
    cumulativePnl: 26.5,
    cumulativeWithdrawable: 13.1,
    promotionTarget: '进阶（1,000U / 3x杠杆）',
  };
}

export function generateAccountState(): AccountState {
  return {
    capital: 500,
    equity: 524,
    pnl: 24,
    pnlPct: 4.8,
    tradesUsed: 9,
    tradesMax: 40,
    rank: 285,
    promotionScore: 715,
    promotionThreshold: 700,
    participationScore: 2800,
    profitSharePct: 45,
    withdrawable: 13.1,
    stage: 1,
    stageCapital: 500,
    stageMaxLeverage: 1,
  };
}

export function generateMatchState(): MatchState {
  const startTime = Date.now() - 18 * 3600 * 1000; // 18 hours ago
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
