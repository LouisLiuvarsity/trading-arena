// ============================================================
// Trading Page — Core trading competition interface
// Design: Obsidian Exchange — Dark exchange + esports arena
// Layout: Binance-style three-column with competition overlay
// Supports: TP/SL auto-close, hold duration weights, participation scoring
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import CandlestickChart from '@/components/CandlestickChart';
import OrderBookPanel from '@/components/OrderBookPanel';
import TradingPanel from '@/components/TradingPanel';
import StatusBar from '@/components/StatusBar';
import Leaderboard from '@/components/Leaderboard';
import ChatRoom from '@/components/ChatRoom';
import NewsFeed from '@/components/NewsFeed';
import SocialBar from '@/components/SocialBar';
import RecentTrades from '@/components/RecentTrades';
import TickerBar from '@/components/TickerBar';
import TradeHistory from '@/components/TradeHistory';
import { useBinanceKline, useBinanceTicker, useBinanceDepth, useBinanceAggTrades } from '@/hooks/useBinanceWS';
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

export default function TradingPage() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1m');

  // Real market data hooks
  const { klines, loading: klinesLoading } = useBinanceKline(timeframe);
  const { ticker, priceDirection } = useBinanceTicker();
  const { orderBook } = useBinanceDepth();
  const { trades: aggTrades } = useBinanceAggTrades();

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
    // Detect when position closes (was open, now null) — check for TP/SL close
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

  // Update position PnL on a fixed interval (avoids infinite loop from deps)
  useEffect(() => {
    const interval = setInterval(() => {
      updatePosition();
    }, 200); // Update 5 times per second for smooth PnL display
    return () => clearInterval(interval);
  }, [updatePosition]);

  // Mock data (stable references)
  const [leaderboard] = useState(() => generateLeaderboard(285));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => generateChatMessages());
  const [news] = useState(() => generateNewsItems());
  const [social] = useState(() => generateSocialData());
  const [cycle] = useState(() => generateCycleState());
  const [match] = useState(() => generateMatchState());

  // Simulate incoming chat messages
  useEffect(() => {
    const botMessages = [
      '这波行情太刺激了！',
      '有人看到那根大阳线了吗？',
      '排名又掉了两位...',
      '权重快到1.0x了，再忍忍',
      '空头小心，支撑位很强',
      '晋级线附近好紧张',
      '刚平了一笔+1.5U',
      '资金费率变了，注意',
      '大家冲啊，最后几小时了！',
      '这波假突破差点被骗',
      '看这个量能，主力在吸筹',
      '我已经晋级了！大家加油',
      '这个价位做空风险太大了',
      '持仓权重终于到1.0x了',
      '还剩3笔交易机会，要谨慎',
    ];
    const usernames = ['CryptoWhale', 'BearSlayer', 'MoonTrader', 'AlphaHunter', 'ScalpGod', 'ChartMaster', 'DeFiKing', 'SwingPro', 'BTCMaxi'];

    const interval = setInterval(() => {
      const msg: ChatMessage = {
        id: `bot-${Date.now()}`,
        username: usernames[Math.floor(Math.random() * usernames.length)],
        message: botMessages[Math.floor(Math.random() * botMessages.length)],
        timestamp: Date.now(),
        type: 'user',
      };
      setChatMessages(prev => [...prev.slice(-50), msg]);
    }, 6000 + Math.random() * 10000);

    // Also simulate system alerts periodically
    const alertInterval = setInterval(() => {
      const alerts = [
        '📊 晋级线 #300 当前收益率：+6.54%',
        '⚡ 晋级线附近竞争激烈！#290-#310 有 47 人',
        '🏆 距离比赛结束还有不到6小时！',
        '📈 HYPERUSDT 突破关键阻力位',
        '⚠️ 资金费率即将结算',
      ];
      const alertMsg: ChatMessage = {
        id: `alert-${Date.now()}`,
        username: 'System',
        message: alerts[Math.floor(Math.random() * alerts.length)],
        timestamp: Date.now(),
        type: Math.random() > 0.5 ? 'system' : 'alert',
      };
      setChatMessages(prev => [...prev.slice(-50), alertMsg]);
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
  const [rightTab, setRightTab] = useState<string>('leaderboard');

  // Tab trigger style
  const tabTriggerClass = "data-[state=active]:bg-transparent data-[state=active]:text-[#F0B90B] data-[state=active]:border-b-2 data-[state=active]:border-[#F0B90B] data-[state=active]:shadow-none rounded-none text-[11px] px-3 py-1 text-[#848E9C] hover:text-[#D1D4DC] transition-colors";

  return (
    <div className="h-screen flex flex-col bg-[#0B0E11] overflow-hidden select-none">
      {/* Top: Competition Status Bar */}
      <StatusBar account={account} match={match} cycle={cycle} />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Chart + Order Book */}
        <div className="flex-1 flex flex-col border-r border-[rgba(255,255,255,0.06)]">
          {/* Ticker info bar */}
          <TickerBar ticker={ticker} priceDirection={priceDirection} />

          {/* Chart + OrderBook side by side */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chart area */}
            <div className="flex-1 flex flex-col">
              <CandlestickChart
                klines={klines}
                loading={klinesLoading}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </div>

            {/* Order Book */}
            <div className="w-[220px] border-l border-[rgba(255,255,255,0.06)]">
              <OrderBookPanel
                orderBook={orderBook}
                lastPrice={currentPrice}
                priceDirection={priceDirection}
              />
            </div>
          </div>

          {/* Bottom: Trade History + Recent Trades */}
          <div className="h-[160px] border-t border-[rgba(255,255,255,0.06)] flex">
            <div className="flex-1 border-r border-[rgba(255,255,255,0.06)]">
              <TradeHistory trades={completedTrades} />
            </div>
            <div className="w-[220px]">
              <RecentTrades trades={aggTrades} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Trading Panel + Tabs */}
        <div className="w-[340px] flex flex-col">
          {/* Trading Panel */}
          <div className="border-b border-[rgba(255,255,255,0.06)]">
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

          {/* Tabbed section: Leaderboard / Chat / News */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col h-full">
              <TabsList className="bg-transparent border-b border-[rgba(255,255,255,0.06)] rounded-none h-8 px-2 gap-0 justify-start w-full">
                <TabsTrigger value="leaderboard" className={tabTriggerClass}>
                  Leaderboard
                </TabsTrigger>
                <TabsTrigger value="chat" className={tabTriggerClass}>
                  Chat
                </TabsTrigger>
                <TabsTrigger value="news" className={tabTriggerClass}>
                  News
                </TabsTrigger>
              </TabsList>
              <TabsContent value="leaderboard" className="flex-1 overflow-hidden mt-0">
                <Leaderboard entries={leaderboard} myRank={account.rank} promotionLineRank={300} />
              </TabsContent>
              <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
                <ChatRoom messages={chatMessages} onSendMessage={handleSendMessage} />
              </TabsContent>
              <TabsContent value="news" className="flex-1 overflow-hidden mt-0">
                <NewsFeed news={news} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Bottom: Social Information Bar */}
      <SocialBar social={social} />
    </div>
  );
}
