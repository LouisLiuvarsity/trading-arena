// ============================================================
// Trading Page — Core trading competition interface (v5 Layout)
// Design: Obsidian Exchange — Dark exchange + esports arena
// Layout v5:
//   Top: StatusBar → NewsTicker
//   Left: TickerBar + Chart + OrderBook
//   Right: Tabs (Chat / Trades / Rank / Stats / News)
//   Bottom: TradingPanel (compact) + RankAnxietyStrip (prominent)
// ============================================================

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import CandlestickChart from '@/components/CandlestickChart';
import OrderBookPanel from '@/components/OrderBookPanel';
import TradingPanel from '@/components/TradingPanel';
import StatusBar from '@/components/StatusBar';
import Leaderboard from '@/components/Leaderboard';
import ChatRoom from '@/components/ChatRoom';
import NewsFeed from '@/components/NewsFeed';
import NewsTicker from '@/components/NewsTicker';
import CompetitionNotifications from '@/components/CompetitionNotifications';
import MarketStats from '@/components/MarketStats';
import RankAnxietyStrip from '@/components/RankAnxietyStrip';
import TickerBar from '@/components/TickerBar';
import TradeHistory from '@/components/TradeHistory';
import { useBinanceKline, useBinanceTicker, useBinanceDepth } from '@/hooks/useBinanceWS';
import { useTrading } from '@/hooks/useTrading';
import {
  generateLeaderboard,
  generateChatMessages,
  generateNewsItems,
  generateSocialData,
  generateCycleState,
  generateMatchState,
} from '@/lib/mockData';
import type { TimeframeKey, ChatMessage } from '@/lib/types';

// Memoized sub-components to prevent unnecessary re-renders
const MemoizedCandlestickChart = memo(CandlestickChart);
const MemoizedOrderBookPanel = memo(OrderBookPanel);
const MemoizedLeaderboard = memo(Leaderboard);
const MemoizedNewsFeed = memo(NewsFeed);
const MemoizedMarketStats = memo(MarketStats);
const MemoizedRankAnxietyStrip = memo(RankAnxietyStrip);
const MemoizedTickerBar = memo(TickerBar);
const MemoizedTradeHistory = memo(TradeHistory);

export default function TradingPage() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1m');

  // Real market data hooks
  const { klines, loading: klinesLoading } = useBinanceKline(timeframe);
  const { ticker, priceDirection } = useBinanceTicker();
  const { orderBook } = useBinanceDepth();

  const currentPrice = ticker?.lastPrice ?? 0;

  // Trading engine
  const {
    position,
    trades: completedTrades,
    account,
    openPosition: rawOpenPosition,
    closePosition: rawClosePosition,
    updatePosition,
    getNextWeightThreshold,
    setTpSl,
  } = useTrading(currentPrice);

  // Keep a ref for currentPrice to use in toast without causing re-creation
  const currentPriceRef = useRef(currentPrice);
  currentPriceRef.current = currentPrice;

  // Track previous position to detect TP/SL auto-closes
  const prevPositionRef = useRef(position);
  useEffect(() => {
    if (prevPositionRef.current && !position && completedTrades.length > 0) {
      const lastTrade = completedTrades[0];
      if (lastTrade.closeReason === 'tp' || lastTrade.closeReason === 'sl') {
        const isProfitable = lastTrade.pnl >= 0;
        const reasonLabel = lastTrade.closeReason === 'tp' ? '🎯 Take Profit' : '🛑 Stop Loss';
        toast(`${reasonLabel} — ${isProfitable ? '+' : ''}${lastTrade.pnl.toFixed(2)} USDT`, {
          description: `Auto-closed at ${lastTrade.exitPrice.toFixed(2)} | Weight: ${lastTrade.holdDurationWeight}x | Score: +${lastTrade.participationScore}`,
          style: {
            background: '#1C2030',
            border: `1px solid ${lastTrade.closeReason === 'tp' ? '#0ECB81' : '#F6465D'}`,
            color: '#D1D4DC',
          },
        });
      }
    }
    prevPositionRef.current = position;
  }, [position, completedTrades]);

  // Wrap trading actions with toast notifications
  const openPosition = useCallback((direction: 'long' | 'short', size: number, tp?: number | null, sl?: number | null) => {
    rawOpenPosition(direction, size, tp, sl);
    const color = direction === 'long' ? '#0ECB81' : '#F6465D';
    const label = direction === 'long' ? 'LONG' : 'SHORT';
    const tpSlInfo = [];
    if (tp) tpSlInfo.push(`TP: ${tp.toFixed(2)}`);
    if (sl) tpSlInfo.push(`SL: ${sl.toFixed(2)}`);
    const tpSlStr = tpSlInfo.length > 0 ? ` | ${tpSlInfo.join(' | ')}` : '';
    toast(`${label} ${size} USDT @ ${currentPriceRef.current.toFixed(2)}`, {
      description: `Position opened. Weight starts at 0.2x${tpSlStr}`,
      style: { background: '#1C2030', border: `1px solid ${color}`, color: '#D1D4DC' },
    });
  }, [rawOpenPosition]);

  const closePosition = useCallback(() => {
    const trade = rawClosePosition();
    if (trade && trade.closeReason === 'manual') {
      const isProfitable = trade.pnl >= 0;
      toast(`Closed ${trade.direction.toUpperCase()} — ${isProfitable ? '+' : ''}${trade.pnl.toFixed(2)} USDT`, {
        description: `Weight: ${trade.holdDurationWeight}x | Weighted PnL: ${trade.weightedPnl >= 0 ? '+' : ''}${trade.weightedPnl.toFixed(2)} | Score: +${trade.participationScore}`,
        style: {
          background: '#1C2030',
          border: `1px solid ${isProfitable ? '#0ECB81' : '#F6465D'}`,
          color: '#D1D4DC',
        },
      });
    }
  }, [rawClosePosition]);

  // Update position PnL on a fixed interval (throttled to 500ms for perf)
  useEffect(() => {
    const interval = setInterval(() => {
      updatePosition();
    }, 500);
    return () => clearInterval(interval);
  }, [updatePosition]);

  // Mock data (stable references)
  const [leaderboard] = useState(() => generateLeaderboard(285));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => generateChatMessages());
  const [news] = useState(() => generateNewsItems());
  const [social] = useState(() => generateSocialData());
  const [cycle] = useState(() => generateCycleState());
  const [match] = useState(() => generateMatchState());

  // Enhanced emotional chat simulation — brag, panic, fomo, analysis, pressure
  useEffect(() => {
    const usernames = ['CryptoWhale', 'BearSlayer', 'MoonTrader', 'AlphaHunter', 'ScalpGod', 'ChartMaster', 'DeFiKing', 'SwingPro', 'BTCMaxi', 'DeltaNeutral', 'GammaSqueezer', 'VolumeKing', 'OrderFlow', 'SmartMoney', 'TrendRider', 'BreakoutKing'];

    // Weighted message pool: brag and panic messages appear more often to create pressure
    const messagePool: Array<{ msg: string; type: ChatMessage['type']; weight: number }> = [
      // Brag messages (envy trigger) — 5%-20% tiers
      { msg: '刚平仓+85U！排名直接跳了32名 🚀', type: 'brag', weight: 3 },
      { msg: '满仓做多赚了120U！晋级稳了 💰', type: 'brag', weight: 3 },
      { msg: '连赢4笔了，今天手感太好了', type: 'brag', weight: 2 },
      { msg: '权重1.3x加成太爽了，+62U 直接起飞', type: 'brag', weight: 2 },
      { msg: '积分已经40000了，20%分成到手 😎', type: 'brag', weight: 2 },
      { msg: '排名进前100了！可提现280U', type: 'brag', weight: 2 },
      { msg: '这波空头吃了58U，感谢CPI数据', type: 'brag', weight: 2 },
      { msg: '从#400冲到#180，两笔翻盘 🔥', type: 'brag', weight: 2 },
      // Panic messages (fear trigger)
      { msg: '连亏4笔了...还有救吗', type: 'panic', weight: 3 },
      { msg: '排名又掉了15名，晋级线越来越远了', type: 'panic', weight: 3 },
      { msg: '止损被打了，-63U 心态崩了', type: 'panic', weight: 2 },
      { msg: '只剩5笔交易机会了，好慌', type: 'panic', weight: 2 },
      { msg: '可提现从180U跌到80U了...', type: 'panic', weight: 2 },
      { msg: '晋级分掉到620了，还能晋级吗？', type: 'panic', weight: 2 },
      { msg: '满仓反向了，-90U 想退赛了', type: 'panic', weight: 2 },
      { msg: '刚被假突破骗了，又亏了一笔', type: 'panic', weight: 2 },
      // FOMO messages (urgency trigger)
      { msg: '大家都在做多，我要不要跟？', type: 'user', weight: 2 },
      { msg: '这波拉盘不上车就来不及了吧', type: 'user', weight: 2 },
      { msg: '64%的人做多，少数服从多数？', type: 'user', weight: 2 },
      { msg: '最后6小时了，必须搏一把', type: 'user', weight: 2 },
      { msg: '排名掉太多了，只能满仓梭哈了', type: 'user', weight: 2 },
      { msg: '前面的人都在加仓，我也满仓了', type: 'user', weight: 1 },
      // Analysis messages (noise)
      { msg: '这个位置做空风险太大了', type: 'user', weight: 1 },
      { msg: '4h级别看空，但1h还在多头趋势', type: 'user', weight: 1 },
      { msg: '资金费率变了，注意方向', type: 'user', weight: 1 },
      { msg: '订单簿上方有大卖单，小心', type: 'user', weight: 1 },
      { msg: '看裸K线就够了，别想太多', type: 'user', weight: 1 },
      { msg: '支撑位很强，多头别慌', type: 'user', weight: 1 },
      // Pressure messages — 5%-20% tiers
      { msg: '晋级线附近好紧张...还差0.3%', type: 'panic', weight: 2 },
      { msg: '被3个人超越了，排名在跌', type: 'panic', weight: 2 },
      { msg: '权重还是0.4x，要不要继续拿？', type: 'user', weight: 1 },
      { msg: '积分才12000，20%分成遥遥无期', type: 'user', weight: 1 },
      { msg: '降级的话本金直接砍半...', type: 'panic', weight: 1 },
    ];

    // Build weighted array
    const weighted: typeof messagePool = [];
    messagePool.forEach(m => { for (let i = 0; i < m.weight; i++) weighted.push(m); });

    const interval = setInterval(() => {
      const pick = weighted[Math.floor(Math.random() * weighted.length)];
      const msg: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: usernames[Math.floor(Math.random() * usernames.length)],
        message: pick.msg,
        timestamp: Date.now(),
        type: pick.type,
      };
      setChatMessages(prev => [...prev.slice(-80), msg]);
    }, 4000 + Math.random() * 8000);

    // System alerts — more frequent and varied
    const alertInterval = setInterval(() => {
      const alerts = [
        { msg: '📊 晋级线 #300 当前收益率：+6.54%', type: 'system' as const },
        { msg: '⚡ 晋级线附近竞争激烈！#290-#310 有 47 人', type: 'alert' as const },
        { msg: '🏆 距离比赛结束还有不到6小时！', type: 'system' as const },
        { msg: '📈 BTCUSDT 突破关键阻力位', type: 'alert' as const },
        { msg: '⚠️ 资金费率即将结算', type: 'alert' as const },
        { msg: '🔔 前10名平均收益率 +11.2%', type: 'system' as const },
        { msg: '📉 过去30分钟有23人排名下降', type: 'alert' as const },
        { msg: '🔥 过去5分钟有34笔交易成交', type: 'system' as const },
        { msg: '💰 全场平均可提现：83 USDT', type: 'system' as const },
        { msg: '⚡ 89名选手正在连亏中（3笔+）', type: 'alert' as const },
        { msg: '📊 全场平均交易12笔 | 47%选手正在持仓', type: 'system' as const },
        { msg: '🏃 SmartMoney 刚从 #350 冲到 #180！', type: 'alert' as const },
        { msg: '📊 全场62%选手亏损中 | 平均亏损 -105U', type: 'alert' as const },
      ];
      const pick = alerts[Math.floor(Math.random() * alerts.length)];
      const alertMsg: ChatMessage = {
        id: `alert-${Date.now()}`,
        username: 'System',
        message: pick.msg,
        timestamp: Date.now(),
        type: pick.type,
      };
      setChatMessages(prev => [...prev.slice(-80), alertMsg]);
    }, 18000 + Math.random() * 15000);

    return () => {
      clearInterval(interval);
      clearInterval(alertInterval);
    };
  }, []);

  const handleSendMessage = useCallback((message: string) => {
    const msg: ChatMessage = {
      id: `you-${Date.now()}`,
      username: 'You',
      message,
      timestamp: Date.now(),
      type: 'user',
    };
    setChatMessages(prev => [...prev, msg]);
  }, []);

  // Right panel tab
  const [rightTab, setRightTab] = useState<string>('chat');

  const tabTriggerClass = "data-[state=active]:bg-[#F0B90B]/10 data-[state=active]:text-[#F0B90B] data-[state=active]:border-[#F0B90B]/60 data-[state=active]:shadow-none border border-[rgba(255,255,255,0.12)] text-[#848E9C] hover:text-[#D1D4DC] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/[0.03] text-[10px] h-6 px-2.5 rounded-md mx-0.5 transition-all duration-200";

  // Unread chat indicator
  const [unreadChat, setUnreadChat] = useState(0);
  const prevMsgCount = useRef(chatMessages.length);

  useEffect(() => {
    if (rightTab !== 'chat' && chatMessages.length > prevMsgCount.current) {
      setUnreadChat(prev => prev + (chatMessages.length - prevMsgCount.current));
    }
    if (rightTab === 'chat') {
      setUnreadChat(0);
    }
    prevMsgCount.current = chatMessages.length;
  }, [chatMessages.length, rightTab]);

  return (
    <div className="h-screen flex flex-col bg-[#0B0E11] overflow-hidden select-none">
      {/* Top: Competition Status Bar */}
      <StatusBar account={account} match={match} cycle={cycle} />

      {/* News Ticker Tape */}
      <NewsTicker news={news} />

      {/* Competition Push Notifications (side-effect only) */}
      <CompetitionNotifications account={account} match={match} social={social} />

      {/* Main content area: Left (chart+orderbook) + Right (tabs) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Chart area + OrderBook */}
        <div className="flex-1 flex flex-col">
          {/* Ticker info bar */}
          <MemoizedTickerBar ticker={ticker} priceDirection={priceDirection} />

          {/* Chart + OrderBook side by side */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chart area */}
            <div className="flex-1 flex flex-col">
              <MemoizedCandlestickChart
                klines={klines}
                loading={klinesLoading}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                position={position}
              />
            </div>

            {/* Order Book */}
            <div className="w-[180px] border-l border-[rgba(255,255,255,0.06)]">
              <MemoizedOrderBookPanel
                orderBook={orderBook}
                lastPrice={currentPrice}
                priceDirection={priceDirection}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Tabs (Chat / Trades / Rank / Stats / News) */}
        <div className="w-[300px] border-l border-[rgba(255,255,255,0.06)] flex flex-col">
          <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col h-full">
            <TabsList className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] rounded-none h-8 px-1.5 gap-0 justify-start w-full shrink-0 items-center">
              <TabsTrigger value="chat" className={tabTriggerClass}>
                Chat
                {unreadChat > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-[#F6465D] text-white text-[8px] rounded-full leading-none">
                    {unreadChat > 99 ? '99+' : unreadChat}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="trades" className={tabTriggerClass}>
                Trades
                {completedTrades.length > 0 && (
                  <span className="ml-1 text-[9px] text-[#848E9C]">({completedTrades.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className={tabTriggerClass}>
                Rank
              </TabsTrigger>
              <TabsTrigger value="stats" className={tabTriggerClass}>
                Stats
              </TabsTrigger>
              <TabsTrigger value="news" className={tabTriggerClass}>
                News
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
              <ChatRoom messages={chatMessages} onSendMessage={handleSendMessage} />
            </TabsContent>
            <TabsContent value="trades" className="flex-1 overflow-hidden mt-0">
              <MemoizedTradeHistory trades={completedTrades} />
            </TabsContent>
            <TabsContent value="leaderboard" className="flex-1 overflow-hidden mt-0">
              <MemoizedLeaderboard entries={leaderboard} myRank={account.rank} promotionLineRank={300} />
            </TabsContent>
            <TabsContent value="stats" className="flex-1 overflow-hidden mt-0">
              <MemoizedMarketStats social={social} account={account} match={match} />
            </TabsContent>
            <TabsContent value="news" className="flex-1 overflow-hidden mt-0">
              <MemoizedNewsFeed news={news} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bottom: Trading Panel (compact) */}
      <div className="h-[76px] shrink-0 border-t border-[rgba(255,255,255,0.06)]">
        <TradingPanel
          account={account}
          position={position}
          currentPrice={currentPrice}
          onOpenPosition={openPosition}
          onClosePosition={closePosition}
          getNextWeightThreshold={getNextWeightThreshold}
          onSetTpSl={setTpSl}
        />
      </div>

      {/* Footer: Enhanced Rank Anxiety Strip */}
      <div className="shrink-0">
        <MemoizedRankAnxietyStrip account={account} social={social} />
      </div>
    </div>
  );
}
