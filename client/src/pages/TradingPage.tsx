import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import TradingViewChart from "@/components/TradingViewChart";
import OrderBookPanel from "@/components/OrderBookPanel";
import TradingPanel from "@/components/TradingPanel";
import StatusBar from "@/components/StatusBar";
import Leaderboard from "@/components/Leaderboard";
import ChatRoom from "@/components/ChatRoom";
import NewsFeed from "@/components/NewsFeed";
import NewsTicker from "@/components/NewsTicker";
import CompetitionNotifications from "@/components/CompetitionNotifications";
import MarketStats from "@/components/MarketStats";
import TickerBar from "@/components/TickerBar";
import TradeHistory from "@/components/TradeHistory";
import { useBinanceTicker, useBinanceDepth } from "@/hooks/useBinanceWS";
import { useArena } from "@/hooks/useArena";
import { generateNewsItems } from "@/lib/mockData";
import { useIsMobile } from "@/hooks/useMobile";
import { useAchievements } from "@/hooks/useAchievements";
import AchievementOverlay from "@/components/AchievementOverlay";
import MobileStatusBar from "@/components/MobileStatusBar";
import MobileTradingPanel from "@/components/MobileTradingPanel";
import MobileOrderBook from "@/components/MobileOrderBook";
import { MobileToolbar, MobileToolbarOverlay } from "@/components/MobileToolbarOverlay";
import type { TimeframeKey } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { useTradingPair } from "@/contexts/TradingPairContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

// ─── Resizable divider hook (desktop only) ──────────────────
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
        ? startPos.current - ev.clientX
        : startPos.current - ev.clientY;
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
      className={`${isH ? 'w-[6px] cursor-col-resize hover:bg-[#F0B90B]/20' : 'h-[6px] cursor-row-resize hover:bg-[#F0B90B]/20'} bg-transparent transition-colors shrink-0 flex items-center justify-center group`}
    >
      <div className={`${isH ? 'w-[2px] h-8' : 'h-[2px] w-8'} bg-[rgba(255,255,255,0.15)] group-hover:bg-[#F0B90B]/60 transition-colors rounded-full`} />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
interface TradingPageProps {
  /** v1 compat: direct token prop (optional, falls back to AuthContext) */
  authToken?: string | null;
  onLogout?: () => void;
  /** v2: competition ID from route param */
  competitionId?: string;
}

export default function TradingPage({ authToken: authTokenProp, onLogout: onLogoutProp, competitionId }: TradingPageProps) {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const authToken = authTokenProp ?? auth.token;
  const onLogout = onLogoutProp ?? auth.logout;
  const { t } = useT();
  const isMobile = useIsMobile();
  const tradingPair = useTradingPair();
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1m");
  const [rightTab, setRightTab] = useState<string>("chat");
  const [mobilePanel, setMobilePanel] = useState<string | null>(null);
  const [mobileContentTab, setMobileContentTab] = useState<string>("chart");
  const { ticker: wsTicker, priceDirection: wsPriceDirection } = useBinanceTicker(tradingPair.symbol);
  const { orderBook: wsOrderBook } = useBinanceDepth(tradingPair.symbol);

  // Resizable panels (desktop only)
  const orderBookResize = useResizable(200, 120, 360, 'horizontal');
  const rightPanelResize = useResizable(400, 220, 500, 'horizontal');

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
    pollData,
    openPosition: apiOpenPosition,
    closePosition: apiClosePosition,
    setTpSl,
    sendChatMessage,
    trackEvent,
    submitPrediction,
    submitPollVote,
  } = useArena(authToken, onLogout);

  const achievements = useAchievements(account, trades, position);

  // Chat unread message tracking
  const [chatUnread, setChatUnread] = useState(0);
  const prevChatCountRef = useRef(chatMessages.length);
  useEffect(() => {
    const newCount = chatMessages.length;
    if (newCount > prevChatCountRef.current) {
      const diff = newCount - prevChatCountRef.current;
      // Desktop: not on chat tab; Mobile: not on chat panel
      const isOnChat = isMobile ? mobilePanel === 'chat' : rightTab === 'chat';
      if (!isOnChat) {
        setChatUnread(prev => prev + diff);
      }
    }
    prevChatCountRef.current = newCount;
  }, [chatMessages.length, rightTab, mobilePanel, isMobile]);

  // Chat highlight: track the index from which messages are "new" when entering chat
  const [chatHighlightFrom, setChatHighlightFrom] = useState<number | undefined>(undefined);
  const lastSeenChatCountRef = useRef(chatMessages.length);

  // Clear unread when switching to chat, and set highlight index
  useEffect(() => {
    const isOnChat = isMobile ? mobilePanel === 'chat' : rightTab === 'chat';
    if (isOnChat) {
      if (chatUnread > 0) {
        setChatHighlightFrom(lastSeenChatCountRef.current);
      }
      setChatUnread(0);
      lastSeenChatCountRef.current = chatMessages.length;
    } else {
      setChatHighlightFrom(undefined);
      lastSeenChatCountRef.current = chatMessages.length;
    }
  }, [rightTab, mobilePanel, isMobile, chatUnread, chatMessages.length]);

  // Screen shake on big loss
  const [isShaking, setIsShaking] = useState(false);
  useEffect(() => {
    if (achievements.some(a => a.type === 'big_loss')) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [achievements]);

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
      toast(t('page.positionClosed'), { description: t('page.settleDone') });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [apiClosePosition, trackEvent]);

  const handleSetTpSl = useCallback(
    async (tp?: number | null, sl?: number | null) => {
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
        {t('page.loginFirst')}
      </div>
    );
  }

  if (loading && leaderboard.length === 0) {
    return (
      <div className="h-screen w-screen bg-[#0B0E11] flex items-center justify-center text-[#848E9C]">
        {t('page.loading')}
      </div>
    );
  }

  const priceDirection = wsPriceDirection ?? (
    ticker && ticker.priceChange > 0 ? "up" : ticker && ticker.priceChange < 0 ? "down" : "neutral"
  );


  // ═══════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div className={`h-[100dvh] flex flex-col bg-[#0B0E11] overflow-hidden select-none ${isShaking ? 'animate-screen-shake' : ''}`}>
        <AchievementOverlay achievements={achievements} />
        <CompetitionNotifications
          account={account}
          match={match}
          social={social}
          prediction={prediction}
          onSubmitPrediction={async (direction, confidence) => {
            try {
              await submitPrediction(direction, confidence);
              await trackEvent("prediction_submit", { direction, confidence });
              toast(t('page.predResult', { dir: direction.toUpperCase() }), { description: t('page.predDesc') });
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        />
        {error && (
          <div className="px-2 py-1 text-[10px] text-[#F6465D] border-b border-[#F6465D]/20 bg-[#F6465D]/10">
            {error}
          </div>
        )}
        {ticker?.stale && (
          <div className="px-2 py-1 text-[10px] text-[#F6465D] border-b border-[#F6465D]/20 bg-[#F6465D]/10 animate-pulse">
            {t('page.staleData')}
          </div>
        )}

        {/* Mobile Status Bar */}
        <MobileStatusBar match={match} />

        {/* Mobile Toolbar — Chat, Trades, Rank, Stats, News */}
        <MobileToolbar
          activePanel={mobilePanel}
          onSelectPanel={(panel) => setMobilePanel(panel)}
          tradesCount={trades.length}
          chatBadge={chatUnread}
        />

        {/* Content tabs: Chart / OrderBook */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setMobileContentTab("chart")}
            className={`px-3 py-1 text-[11px] rounded transition-colors ${
              mobileContentTab === "chart"
                ? 'bg-[#F0B90B]/15 text-[#F0B90B] font-semibold'
                : 'text-[#848E9C] hover:text-[#D1D4DC]'
            }`}
          >
            {t('page.chart')}
          </button>
          <button
            onClick={() => setMobileContentTab("orderbook")}
            className={`px-3 py-1 text-[11px] rounded transition-colors ${
              mobileContentTab === "orderbook"
                ? 'bg-[#F0B90B]/15 text-[#F0B90B] font-semibold'
                : 'text-[#848E9C] hover:text-[#D1D4DC]'
            }`}
          >
            {t('page.orderbook')}
          </button>
          <button
            onClick={() => setMobileContentTab("info")}
            className={`px-3 py-1 text-[11px] rounded transition-colors ${
              mobileContentTab === "info"
                ? 'bg-[#F0B90B]/15 text-[#F0B90B] font-semibold'
                : 'text-[#848E9C] hover:text-[#D1D4DC]'
            }`}
          >
            {t('page.info')}
          </button>

          {/* Compact ticker on the right */}
          <div className="ml-auto flex items-center gap-1.5 text-[10px]">
            <span className="font-display font-bold text-white text-[10px]">{tradingPair.baseAsset}</span>
            <span className={`font-mono font-bold tabular-nums ${
              priceDirection === 'up' ? 'text-[#0ECB81]' : priceDirection === 'down' ? 'text-[#F6465D]' : 'text-[#D1D4DC]'
            }`}>
              {currentPrice.toFixed(2)}
            </span>
            {ticker && (
              <span className={`font-mono ${ticker.priceChangePct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {ticker.priceChangePct >= 0 ? '+' : ''}{ticker.priceChangePct.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {mobileContentTab === "chart" && (
            <TradingViewChart interval={timeframe} />
          )}
          {mobileContentTab === "orderbook" && (
            <div className="h-full overflow-y-auto">
              <MobileOrderBook orderBook={orderBook} lastPrice={currentPrice} priceDirection={priceDirection} />
            </div>
          )}
          {mobileContentTab === "info" && (
            <div className="h-full overflow-y-auto p-2 space-y-2">
              {/* Compact ticker info */}
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="bg-white/[0.02] rounded p-2">
                  <div className="text-[#848E9C]">{t('page.24hHigh')}</div>
                  <div className="font-mono text-[#D1D4DC]">{ticker?.high24h?.toFixed(2) ?? '—'}</div>
                </div>
                <div className="bg-white/[0.02] rounded p-2">
                  <div className="text-[#848E9C]">{t('page.24hLow')}</div>
                  <div className="font-mono text-[#D1D4DC]">{ticker?.low24h?.toFixed(2) ?? '—'}</div>
                </div>
                <div className="bg-white/[0.02] rounded p-2">
                  <div className="text-[#848E9C]">{t('page.mark')}</div>
                  <div className="font-mono text-[#D1D4DC]">{ticker?.markPrice?.toFixed(2) ?? '—'}</div>
                </div>
                <div className="bg-white/[0.02] rounded p-2">
                  <div className="text-[#848E9C]">{t('page.funding')}</div>
                  <div className={`font-mono ${(ticker?.fundingRate ?? 0) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {ticker?.fundingRate ? (ticker.fundingRate * 100).toFixed(4) + '%' : '—'}
                  </div>
                </div>
                <div className="bg-white/[0.02] rounded p-2">
                  <div className="text-[#848E9C]">{t('page.24hVol')}</div>
                  <div className="font-mono text-[#D1D4DC]">
                    {ticker?.volume24h ? (ticker.volume24h >= 1e6 ? (ticker.volume24h / 1e6).toFixed(1) + 'M' : (ticker.volume24h / 1e3).toFixed(1) + 'K') : '—'}
                  </div>
                </div>
                <div className="bg-white/[0.02] rounded p-2">
                  <div className="text-[#848E9C]">{t('page.prizePool')}</div>
                  <div className="font-mono text-[#F0B90B]">{match.prizePool}U</div>
                </div>
              </div>
              {/* Rank anxiety info */}
              <div className="bg-white/[0.02] rounded p-2 text-[10px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#848E9C] font-semibold">Rank #{account.rank}</span>
                  {account.rank <= 300 ? (
                    <span className="text-[#0ECB81]">{t('page.safe', { n: 300 - account.rank })}</span>
                  ) : (
                    <span className="text-[#F6465D]">{t('page.need', { n: account.rank - 300 })}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[9px] text-[#848E9C]">
                  <span>{t('page.overtakenBy')} <span className={social.tradersOvertakenYou > 0 ? 'text-[#F6465D]' : ''}>{social.tradersOvertakenYou}</span></span>
                  <span>{t('page.youOvertook')} <span className={social.youOvertook > 0 ? 'text-[#0ECB81]' : ''}>{social.youOvertook}</span></span>
                  <span>{t('page.nearLine', { n: social.nearPromotionCount })}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Trading Panel — fixed at bottom */}
        <MobileTradingPanel
          account={account}
          position={position}
          currentPrice={currentPrice}
          onOpenPosition={openPosition}
          onClosePosition={closePosition}

          onSetTpSl={handleSetTpSl}
          isStale={ticker?.stale}
        />

        {/* Overlay panels for Chat, Rank, Stats, News, Trades */}
        <MobileToolbarOverlay activePanel={mobilePanel} onClose={() => setMobilePanel(null)}>
          {mobilePanel === 'chat' && (
            <ChatRoom messages={chatMessages} onSendMessage={handleSendMessage} highlightFromIndex={chatHighlightFrom} />
          )}
          {mobilePanel === 'trades' && (
            <TradeHistory trades={trades} />
          )}
          {mobilePanel === 'leaderboard' && (
            <Leaderboard entries={leaderboard} myRank={account.rank} promotionLineRank={300} account={account} social={social} />
          )}
          {mobilePanel === 'stats' && (
            <MarketStats social={social} account={account} match={match} prediction={prediction} pollData={pollData} ticker={ticker} />
          )}
          {mobilePanel === 'news' && (
            <NewsFeed news={news} />
          )}
        </MobileToolbarOverlay>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DESKTOP LAYOUT (unchanged)
  // ═══════════════════════════════════════════════════════════
  const tabTriggerClass =
    "data-[state=active]:bg-[#F0B90B]/10 data-[state=active]:text-[#F0B90B] data-[state=active]:border-[#F0B90B]/60 data-[state=active]:shadow-none border border-[rgba(255,255,255,0.12)] text-[#848E9C] hover:text-[#D1D4DC] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/[0.03] text-[10px] h-6 px-2.5 rounded-md mx-0.5 transition-all duration-200";

  return (
    <div className={`h-screen flex flex-col bg-[#0B0E11] overflow-hidden select-none ${isShaking ? 'animate-screen-shake' : ''}`}>
      <AchievementOverlay achievements={achievements} />
      {error && (
        <div className="px-3 py-1 text-xs text-[#F6465D] border-b border-[#F6465D]/20 bg-[#F6465D]/10">
          {error}
        </div>
      )}
      {ticker?.stale && (
        <div className="px-3 py-1 text-xs text-[#F6465D] border-b border-[#F6465D]/20 bg-[#F6465D]/10 animate-pulse">
          {t('page.staleDataLong')}
        </div>
      )}

      <StatusBar match={match} />
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
            toast(t('page.predResult', { dir: direction.toUpperCase() }), { description: t('page.predDesc') });
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
              <TradingViewChart interval={timeframe} />
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
        <div style={{ width: rightPanelResize.size }} className="shrink-0 flex flex-col overflow-hidden bg-[#0D1017] border-l border-[rgba(255,255,255,0.1)]">
          <Tabs
            value={rightTab}
            onValueChange={async value => {
              setRightTab(value);
              await trackEvent("tab_change", { tab: value });
            }}
            className="flex flex-col h-full"
          >
            <TabsList className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] rounded-none h-8 px-1.5 gap-0 justify-start w-full shrink-0 items-center">
              <TabsTrigger value="chat" className={`${tabTriggerClass} relative`}>
                {t('toolbar.chat')}
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#F6465D] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="trades" className={tabTriggerClass}>
                {t('toolbar.trades')}
                {trades.length > 0 && <span className="ml-1 text-[9px] text-[#848E9C]">({trades.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className={tabTriggerClass}>{t('toolbar.rank')}</TabsTrigger>
              <TabsTrigger value="stats" className={tabTriggerClass}>{t('toolbar.stats')}</TabsTrigger>
              <TabsTrigger value="news" className={tabTriggerClass}>{t('toolbar.news')}</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
              <ChatRoom messages={chatMessages} onSendMessage={handleSendMessage} highlightFromIndex={chatHighlightFrom} />
            </TabsContent>
            <TabsContent value="trades" className="flex-1 overflow-hidden mt-0">
              <TradeHistory trades={trades} />
            </TabsContent>
            <TabsContent value="leaderboard" className="flex-1 overflow-hidden mt-0">
              <Leaderboard entries={leaderboard} myRank={account.rank} promotionLineRank={300} account={account} social={social} />
            </TabsContent>
            <TabsContent value="stats" className="flex-1 overflow-hidden mt-0">
              <MarketStats social={social} account={account} match={match} prediction={prediction} pollData={pollData} ticker={ticker} />
            </TabsContent>
            <TabsContent value="news" className="flex-1 overflow-hidden mt-0">
              <NewsFeed news={news} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Trading panel — auto height */}
      <div className="shrink-0 border-t border-[rgba(255,255,255,0.08)]">
        <TradingPanel
          account={account}
          position={position}
          currentPrice={currentPrice}
          onOpenPosition={openPosition}
          onClosePosition={closePosition}

          onSetTpSl={handleSetTpSl}
          isStale={ticker?.stale}
        />
      </div>


    </div>
  );
}
