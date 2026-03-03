import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import CandlestickChart from "@/components/CandlestickChart";
import OrderBookPanel from "@/components/OrderBookPanel";
import TradingPanel from "@/components/TradingPanel";
import StatusBar from "@/components/StatusBar";
import Leaderboard from "@/components/Leaderboard";
import ChatRoom from "@/components/ChatRoom";
import NewsFeed from "@/components/NewsFeed";
import NewsTicker from "@/components/NewsTicker";
import CompetitionNotifications from "@/components/CompetitionNotifications";
import MarketStats from "@/components/MarketStats";
import RankAnxietyStrip from "@/components/RankAnxietyStrip";
import TickerBar from "@/components/TickerBar";
import TradeHistory from "@/components/TradeHistory";
import { useBinanceKline, useBinanceTicker, useBinanceDepth } from "@/hooks/useBinanceWS";
import { useArena } from "@/hooks/useArena";
import { generateNewsItems } from "@/lib/mockData";
import type { TimeframeKey } from "@/lib/types";

// ─── Resizable divider hook ─────────────────────────────────
function useResizable(initial: number, min: number, max: number, direction: 'horizontal' | 'vertical') {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = direction === 'horizontal'
        ? startPos.current - ev.clientX  // pulling left = bigger for right panel
        : startPos.current - ev.clientY; // pulling up = bigger for bottom panel
      setSize(Math.max(min, Math.min(max, startSize.current + delta)));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [size, min, max, direction]);

  return { size, onMouseDown };
}

function ResizeHandle({ direction, onMouseDown }: { direction: 'horizontal' | 'vertical'; onMouseDown: (e: React.MouseEvent) => void }) {
  const isH = direction === 'horizontal';
  return (
    <div
      onMouseDown={onMouseDown}
      className={`${isH ? 'w-[5px] cursor-col-resize hover:bg-[#F0B90B]/30' : 'h-[5px] cursor-row-resize hover:bg-[#F0B90B]/30'} bg-transparent transition-colors shrink-0 flex items-center justify-center group`}
    >
      <div className={`${isH ? 'w-[1px] h-6' : 'h-[1px] w-6'} bg-[rgba(255,255,255,0.08)] group-hover:bg-[#F0B90B]/50 transition-colors`} />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
interface TradingPageProps {
  authToken: string | null;
  onLogout?: () => void;
}

export default function TradingPage({ authToken, onLogout }: TradingPageProps) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1m");
  const [rightTab, setRightTab] = useState<string>("chat");
  const { klines, loading: klinesLoading } = useBinanceKline(timeframe);
  const { ticker: wsTicker, priceDirection: wsPriceDirection } = useBinanceTicker();
  const { orderBook: wsOrderBook } = useBinanceDepth();

  // Resizable panels
  const orderBookResize = useResizable(200, 120, 360, 'horizontal');
  const rightPanelResize = useResizable(320, 220, 500, 'horizontal');
  const tradingPanelResize = useResizable(110, 80, 200, 'vertical');

  const {
    loading,
    error,
    account,
    position,
    trades,
    leaderboard,
    social,
    season,
    match,
    chatMessages,
    ticker: serverTicker,
    orderBook: _serverOrderBook,
    prediction,
    openPosition: apiOpenPosition,
    closePosition: apiClosePosition,
    setTpSl,
    sendChatMessage,
    trackEvent,
    submitPrediction,
  } = useArena(authToken, onLogout);

  const news = useMemo(() => generateNewsItems(), []);
  const ticker = wsTicker ?? serverTicker;
  const orderBook = wsOrderBook;
  const currentPrice = ticker?.lastPrice ?? 0;

  const openPosition = useCallback(
    async (direction: "long" | "short", size: number, tp?: number | null, sl?: number | null) => {
      try {
        await apiOpenPosition(direction, size, tp, sl);
        await trackEvent("open_position", { direction, size, tp: tp ?? null, sl: sl ?? null });
        toast(`${direction.toUpperCase()} ${size} USDT @ ${currentPrice.toFixed(2)}`, {
          description: "Order accepted by server",
        });
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [apiOpenPosition, trackEvent, currentPrice],
  );

  const closePosition = useCallback(async () => {
    try {
      await apiClosePosition();
      await trackEvent("close_position");
      toast("Position closed", { description: "Server-side settlement complete" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [apiClosePosition, trackEvent]);

  const handleSetTpSl = useCallback(
    async (tp: number | null, sl: number | null) => {
      try {
        await setTpSl(tp, sl);
        await trackEvent("update_tpsl", { tp, sl });
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [setTpSl, trackEvent],
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      try {
        await sendChatMessage(message);
        await trackEvent("chat_send", { length: message.length });
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [sendChatMessage, trackEvent],
  );

  if (!authToken) {
    return (
      <div className="h-screen w-screen bg-[#0B0E11] flex items-center justify-center text-[#848E9C]">
        Please login first.
      </div>
    );
  }

  if (loading && leaderboard.length === 0) {
    return (
      <div className="h-screen w-screen bg-[#0B0E11] flex items-center justify-center text-[#848E9C]">
        Loading arena state...
      </div>
    );
  }

  const priceDirection = wsPriceDirection ?? (
    ticker && ticker.priceChange > 0 ? "up" : ticker && ticker.priceChange < 0 ? "down" : "neutral"
  );

  const tabTriggerClass =
    "data-[state=active]:bg-[#F0B90B]/10 data-[state=active]:text-[#F0B90B] data-[state=active]:border-[#F0B90B]/60 data-[state=active]:shadow-none border border-[rgba(255,255,255,0.12)] text-[#848E9C] hover:text-[#D1D4DC] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/[0.03] text-[10px] h-6 px-2.5 rounded-md mx-0.5 transition-all duration-200";

  const getNextWeightThreshold = (seconds: number) => {
    const levels = [
      { max: 60, nextWeight: 0.4 },
      { max: 180, nextWeight: 0.7 },
      { max: 600, nextWeight: 1.0 },
      { max: 1800, nextWeight: 1.15 },
      { max: 7200, nextWeight: 1.3 },
    ];
    for (const level of levels) {
      if (seconds < level.max) {
        return { nextWeight: level.nextWeight, secondsNeeded: level.max - seconds };
      }
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-[#0B0E11] overflow-hidden select-none">
      {error && (
        <div className="px-3 py-1 text-xs text-[#F6465D] border-b border-[#F6465D]/20 bg-[#F6465D]/10">
          {error}
        </div>
      )}
      {ticker?.stale && (
        <div className="px-3 py-1 text-xs text-[#F6465D] border-b border-[#F6465D]/20 bg-[#F6465D]/10 animate-pulse">
          Market data is stale — trading temporarily disabled
        </div>
      )}

      <StatusBar account={account} match={match} season={season} />
      <NewsTicker news={news} />
      <CompetitionNotifications
        account={account}
        match={match}
        social={social}
        prediction={prediction}
        onSubmitPrediction={async (direction, confidence) => {
          try {
            await submitPrediction(direction, confidence);
            await trackEvent("prediction_submit", { direction, confidence });
            toast(`Prediction: ${direction.toUpperCase()}`, { description: "Result in 5 minutes" });
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chart + OrderBook */}
        <div className="flex-1 flex flex-col min-w-0">
          <TickerBar ticker={ticker} priceDirection={priceDirection} />
          <div className="flex-1 flex overflow-hidden">
            {/* Chart */}
            <div className="flex-1 flex flex-col min-w-0">
              <CandlestickChart
                klines={klines}
                loading={klinesLoading}
                timeframe={timeframe}
                onTimeframeChange={async next => {
                  setTimeframe(next);
                  await trackEvent("timeframe_change", { next });
                }}
                position={position}
              />
            </div>
            {/* OrderBook resize handle + panel */}
            <ResizeHandle direction="horizontal" onMouseDown={orderBookResize.onMouseDown} />
            <div style={{ width: orderBookResize.size }} className="shrink-0 overflow-hidden">
              <OrderBookPanel orderBook={orderBook} lastPrice={currentPrice} priceDirection={priceDirection} />
            </div>
          </div>
        </div>

        {/* Right panel resize handle + panel */}
        <ResizeHandle direction="horizontal" onMouseDown={rightPanelResize.onMouseDown} />
        <div style={{ width: rightPanelResize.size }} className="shrink-0 flex flex-col overflow-hidden">
          <Tabs
            value={rightTab}
            onValueChange={async value => {
              setRightTab(value);
              await trackEvent("tab_change", { tab: value });
            }}
            className="flex flex-col h-full"
          >
            <TabsList className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] rounded-none h-8 px-1.5 gap-0 justify-start w-full shrink-0 items-center">
              <TabsTrigger value="chat" className={tabTriggerClass}>Chat</TabsTrigger>
              <TabsTrigger value="trades" className={tabTriggerClass}>
                Trades
                {trades.length > 0 && <span className="ml-1 text-[9px] text-[#848E9C]">({trades.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className={tabTriggerClass}>Rank</TabsTrigger>
              <TabsTrigger value="stats" className={tabTriggerClass}>Stats</TabsTrigger>
              <TabsTrigger value="news" className={tabTriggerClass}>News</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
              <ChatRoom messages={chatMessages} onSendMessage={handleSendMessage} />
            </TabsContent>
            <TabsContent value="trades" className="flex-1 overflow-hidden mt-0">
              <TradeHistory trades={trades} />
            </TabsContent>
            <TabsContent value="leaderboard" className="flex-1 overflow-hidden mt-0">
              <Leaderboard entries={leaderboard} myRank={account.rank} promotionLineRank={300} />
            </TabsContent>
            <TabsContent value="stats" className="flex-1 overflow-hidden mt-0">
              <MarketStats social={social} account={account} match={match} />
            </TabsContent>
            <TabsContent value="news" className="flex-1 overflow-hidden mt-0">
              <NewsFeed news={news} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Trading panel resize handle + panel */}
      <ResizeHandle direction="vertical" onMouseDown={tradingPanelResize.onMouseDown} />
      <div style={{ height: tradingPanelResize.size }} className="shrink-0">
        <TradingPanel
          account={account}
          position={position}
          currentPrice={currentPrice}
          onOpenPosition={openPosition}
          onClosePosition={closePosition}
          getNextWeightThreshold={getNextWeightThreshold}
          onSetTpSl={handleSetTpSl}
          isStale={ticker?.stale}
        />
      </div>

      <div className="shrink-0">
        <RankAnxietyStrip account={account} social={social} />
      </div>
    </div>
  );
}
