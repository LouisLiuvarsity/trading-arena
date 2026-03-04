import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { TRADING_PAIR } from "@shared/tradingPair";
import type {
  AccountState,
  ChatMessage,
  CompletedTrade,
  LeaderboardEntry,
  MatchState,
  OrderBook,
  PollVoteData,
  Position,
  PredictionState,
  SeasonState,
  SocialData,
  TickerData,
} from "@/lib/types";

type ArenaState = {
  account: AccountState;
  position: Position | null;
  trades: CompletedTrade[];
  leaderboard: LeaderboardEntry[];
  social: SocialData;
  season: SeasonState;
  match: MatchState;
  chatMessages: ChatMessage[];
  ticker: TickerData | null;
  orderBook: OrderBook;
  prediction: PredictionState | null;
  pollData: PollVoteData | null;
};

const emptyState: ArenaState = {
  account: {
    capital: 5000,
    equity: 5000,
    pnl: 0,
    pnlPct: 0,
    weightedPnl: 0,
    tradesUsed: 0,
    tradesMax: 40,
    rank: 1,
    matchPoints: 0,
    seasonPoints: 0,
    grandFinalQualified: false,
    grandFinalLine: 200,
    prizeEligible: false,
    rankTier: "iron",
    tierLeverage: 1,
    prizeAmount: 0,
    directionConsistency: 0,
    directionBonus: false,
  },
  position: null,
  trades: [],
  leaderboard: [],
  social: {
    longPct: 50,
    shortPct: 50,
    longPctDelta: 0,
    profitablePct: 0,
    losingPct: 0,
    avgProfitPct: 0,
    avgLossPct: 0,
    avgTradesPerPerson: 0,
    medianTradesPerPerson: 0,
    activeTradersPct: 0,
    nearPromotionCount: 0,
    nearPromotionRange: "#290-#310",
    nearPromotionDelta: 0,
    consecutiveLossLeader: 0,
    tradersOnLosingStreak: 0,
    recentDirectionBias: "neutral",
    recentTradeVolume: 0,
    avgRankChange30m: 0,
    tradersOvertakenYou: 0,
    youOvertook: 0,
  },
  season: {
    seasonId: "",
    month: "",
    matchesPlayed: 0,
    matchesTotal: 15,
    grandFinalScheduled: true,
    matches: [],
    totalPoints: 0,
    grandFinalQualified: false,
  },
  match: {
    matchId: "",
    matchNumber: 1,
    matchType: "regular",
    totalRegularMatches: 15,
    startTime: Date.now(),
    endTime: Date.now() + 24 * 60 * 60 * 1000,
    elapsed: 0,
    remainingSeconds: 24 * 60 * 60,
    symbol: TRADING_PAIR.symbol,
    participantCount: 0,
    prizePool: 500,
    isCloseOnly: false,
    monthLabel: "",
  },
  chatMessages: [],
  ticker: null,
  orderBook: { bids: [], asks: [] },
  prediction: null,
  pollData: null,
};

export function useArena(token: string | null, onAuthError?: () => void) {
  const [state, setState] = useState<ArenaState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onAuthErrorRef = useRef(onAuthError);
  onAuthErrorRef.current = onAuthError;

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const next = await apiRequest<ArenaState>("/api/state", { token });
      setState(next);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthErrorRef.current?.();
        return;
      }
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));

    // Poll every 3 seconds, pause when tab is hidden
    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (timer) return;
      timer = setInterval(() => { void refresh(); }, 3000);
    };
    const stopPolling = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibilityChange = () => {
      if (document.hidden) { stopPolling(); } else { void refresh(); startPolling(); }
    };
    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, refresh]);

  const openPosition = useCallback(
    async (direction: "long" | "short", size: number, tp?: number | null, sl?: number | null) => {
      if (!token) return;
      await apiRequest("/api/trade/open", {
        method: "POST",
        token,
        body: { direction, size, tp: tp ?? null, sl: sl ?? null },
      });
      void refresh();
    },
    [token, refresh],
  );

  const closePosition = useCallback(async () => {
    if (!token) return null;
    const result = await apiRequest<{ ok: true; tradeId: string }>("/api/trade/close", {
      method: "POST",
      token,
    });
    void refresh();
    return result.tradeId;
  }, [token, refresh]);

  const setTpSl = useCallback(
    async (tp?: number | null, sl?: number | null) => {
      if (!token) return;
      // Build body: only include fields that are explicitly passed (not undefined)
      const body: Record<string, number | null> = {};
      if (tp !== undefined) body.tp = tp;
      if (sl !== undefined) body.sl = sl;
      await apiRequest("/api/trade/tpsl", {
        method: "POST",
        token,
        body,
      });
      void refresh();
    },
    [token, refresh],
  );

  const sendChatMessage = useCallback(
    async (message: string) => {
      if (!token) return;
      await apiRequest("/api/chat", {
        method: "POST",
        token,
        body: { message },
      });
      void refresh();
    },
    [token, refresh],
  );

  const trackEvent = useCallback(
    async (type: string, payload?: unknown) => {
      if (!token) return;
      try {
        await apiRequest("/api/events", {
          method: "POST",
          token,
          body: { type, payload, source: "frontend" },
        });
      } catch {
        // Analytics failure should never break user actions.
      }
    },
    [token],
  );

  const submitPrediction = useCallback(
    async (direction: "up" | "down", confidence: number = 3) => {
      if (!token) return;
      await apiRequest("/api/prediction", {
        method: "POST",
        token,
        body: { direction, confidence },
      });
      void refresh();
    },
    [token, refresh],
  );

  const submitPollVote = useCallback(
    async (direction: "long" | "short" | "neutral") => {
      if (!token) return;
      try {
        await apiRequest("/api/arena/poll", {
          method: "POST",
          token,
          body: { direction },
        });
        void refresh();
      } catch {
        // Poll failure is non-critical
      }
    },
    [token, refresh],
  );

  return useMemo(
    () => ({
      ...state,
      loading,
      error,
      refresh,
      openPosition,
      closePosition,
      setTpSl,
      sendChatMessage,
      trackEvent,
      submitPrediction,
      submitPollVote,
    }),
    [state, loading, error, refresh, openPosition, closePosition, setTpSl, sendChatMessage, trackEvent, submitPrediction, submitPollVote],
  );
}
