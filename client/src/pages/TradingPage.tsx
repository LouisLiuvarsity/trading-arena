// ============================================================
// Trading Page — Core trading competition interface (v3 Layout)
// Design: Obsidian Exchange — Dark exchange + esports arena
// Layout v3 (swapped):
//   Top: StatusBar → NewsTicker
//   Left: TickerBar + Chart + OrderBook
//   Right: Tabs (Chat / Trades / Leaderboard / News)
//   Bottom: TradingPanel (horizontal)
//   Footer: SocialBar
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
import SocialBar from '@/components/SocialBar';
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
const MemoizedSocialBar = memo(SocialBar);
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
          description: `Auto-closed at ${lastTrade.exitPrice.toFixed(4)} | Weight: ${lastTrade.holdDurationWeight}x | Score: +${lastTrade.participationScore}`,
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
    if (tp) tpSlInfo.push(`TP: ${tp.toFixed(4)}`);
    if (sl) tpSlInfo.push(`SL: ${sl.toFixed(4)}`);
    const tpSlStr = tpSlInfo.length > 0 ? ` | ${tpSlInfo.join(' | ')}` : '';
    toast(`${label} ${size} USDT @ ${currentPriceRef.current.toFixed(4)}`, {
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

  // Simulate incoming chat messages (reduced frequency for perf)
  useEffect(() => {
    const botMessages = [
      '这波行情太刺激了！', '有人看到那根大阳线了吗？', '排名又掉了两位...',
      '权重快到1.0x了，再忍忍', '空头小心，支撑位很强', '晋级线附近好紧张',
      '刚平了一笔+1.5U', '资金费率变了，注意', '大家冲啊，最后几小时了！',
      '这波假突破差点被骗', '看这个量能，主力在吸筹', '我已经晋级了！大家加油',
      '这个价位做空风险太大了', '持仓权重终于到1.0x了', '还剩3笔交易机会，要谨慎',
      '有人在聊天室带节奏吧？', '别被新闻骗了，看K线', '满仓梭哈了，祝我好运',
      '刚被止损打了，心态崩了', '稳住，还有时间翻盘',
    ];
    const usernames = ['CryptoWhale', 'BearSlayer', 'MoonTrader', 'AlphaHunter', 'ScalpGod', 'ChartMaster', 'DeFiKing', 'SwingPro', 'BTCMaxi', 'DeltaNeutral', 'GammaSqueezer', 'VolumeKing'];

    const interval = setInterval(() => {
      const msg: ChatMessage = {
        id: `bot-${Date.now()}`,
        username: usernames[Math.floor(Math.random() * usernames.length)],
        message: botMessages[Math.floor(Math.random() * botMessages.length)],
        timestamp: Date.now(),
        type: 'user',
      };
      setChatMessages(prev => [...prev.slice(-60), msg]);
    }, 5000 + Math.random() * 10000);

    const alertInterval = setInterval(() => {
      const alerts = [
        '📊 晋级线 #300 当前收益率：+6.54%',
        '⚡ 晋级线附近竞争激烈！#290-#310 有 47 人',
        '🏆 距离比赛结束还有不到6小时！',
        '📈 HYPERUSDT 突破关键阻力位',
        '⚠️ 资金费率即将结算',
        '🔔 前10名平均收益率 +11.2%',
        '📉 过去30分钟有23人被超越',
      ];
      const alertMsg: ChatMessage = {
        id: `alert-${Date.now()}`,
        username: 'System',
        message: alerts[Math.floor(Math.random() * alerts.length)],
        timestamp: Date.now(),
        type: Math.random() > 0.5 ? 'system' : 'alert',
      };
      setChatMessages(prev => [...prev.slice(-60), alertMsg]);
    }, 25000 + Math.random() * 20000);

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

  const tabTriggerClass = "data-[state=active]:bg-transparent data-[state=active]:text-[#F0B90B] data-[state=active]:border-b-2 data-[state=active]:border-[#F0B90B] data-[state=active]:shadow-none rounded-none text-[11px] px-3 py-1.5 text-[#848E9C] hover:text-[#D1D4DC] transition-colors";

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
      <CompetitionNotifications account={account} match={match} />

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
              />
            </div>

            {/* Order Book */}
            <div className="w-[200px] border-l border-[rgba(255,255,255,0.06)]">
              <MemoizedOrderBookPanel
                orderBook={orderBook}
                lastPrice={currentPrice}
                priceDirection={priceDirection}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Tabs (Chat / Trades / Leaderboard / News) */}
        <div className="w-[320px] border-l border-[rgba(255,255,255,0.06)] flex flex-col">
          <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col h-full">
            <TabsList className="bg-transparent border-b border-[rgba(255,255,255,0.06)] rounded-none h-7 px-1 gap-0 justify-start w-full shrink-0">
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
            <TabsContent value="news" className="flex-1 overflow-hidden mt-0">
              <MemoizedNewsFeed news={news} />
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Bottom: Trading Panel (horizontal) */}
      <div className="h-[90px] border-t border-[rgba(255,255,255,0.06)]">
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

      {/* Footer: Social Information Bar */}
      <MemoizedSocialBar social={social} />
    </div>
  );
}
