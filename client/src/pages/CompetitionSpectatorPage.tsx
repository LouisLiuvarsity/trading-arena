import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Bot, Eye, Loader2 } from "lucide-react";
import CandlestickChart from "@/components/CandlestickChart";
import ChatRoom from "@/components/ChatRoom";
import Leaderboard from "@/components/Leaderboard";
import { apiRequest } from "@/lib/api";
import type { ChatMessage, LeaderboardEntry, TimeframeKey } from "@/lib/types";
import { useBinanceKline } from "@/hooks/useBinanceWS";
import { useAuth } from "@/contexts/AuthContext";
import { useSetTradingPair } from "@/contexts/TradingPairContext";
import { getSymbolConfig } from "@shared/tradingPair";

interface Props {
  slug: string;
}

interface SpectatorFeed {
  competitionId: number;
  title: string;
  status: string;
  participantMode: "human" | "agent";
  symbol: string;
  startingCapital: number;
  startTime: number;
  endTime: number;
  prizePool: number;
  leaderboard: LeaderboardEntry[];
  chatMessages: ChatMessage[];
}

export default function CompetitionSpectatorPage({ slug }: Props) {
  const { token } = useAuth();
  const setTradingPair = useSetTradingPair();
  const [timeframe, setTimeframe] = useState<TimeframeKey>("5m");
  const [curveData, setCurveData] = useState<Array<Record<string, number | string>>>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["spectator-feed", slug, token],
    queryFn: () => apiRequest<SpectatorFeed>(`/api/competitions/${slug}/spectator-feed`, { token }),
    enabled: !!slug,
    refetchInterval: 3000,
  });

  const symbol = data?.symbol ?? "BTCUSDT";
  const { klines, loading: klinesLoading } = useBinanceKline(symbol, timeframe);

  useEffect(() => {
    if (data?.symbol) {
      setTradingPair(getSymbolConfig(data.symbol));
    }
  }, [data?.symbol, setTradingPair]);

  const trackedUsers = useMemo(
    () => (data?.leaderboard ?? []).slice(0, 5).map((entry) => entry.username),
    [data?.leaderboard],
  );

  useEffect(() => {
    if (!data || data.leaderboard.length === 0) return;

    const row: Record<string, number | string> = {
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    data.leaderboard.slice(0, 5).forEach((entry) => {
      row[entry.username] = Number((data.startingCapital + entry.pnl).toFixed(2));
    });

    setCurveData((prev) => [...prev.slice(-39), row]);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-[28px] border border-white/10 bg-[#121824] p-8 text-center text-sm text-[#D1D4DC]">
          {(error as Error)?.message ?? "Failed to load spectator feed"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <Link href={`/competitions/${slug}`} className="inline-flex items-center gap-1 text-[#848E9C] text-[11px] hover:text-[#D1D4DC]">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to competition
      </Link>

      <div className="rounded-[28px] border border-white/10 bg-[#121824] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F0B90B]">
              <Eye className="w-3.5 h-3.5" />
              Spectator Mode
            </div>
            <h1 className="mt-3 text-3xl font-display font-bold text-white">{data.title}</h1>
            <p className="mt-2 text-sm text-[#8E98A8]">
              Live public view for Agent vs Agent competitions. Trading is disabled here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#7E899B]">mode</p>
              <p className="mt-2 text-sm font-bold text-white inline-flex items-center gap-1">
                <Bot className="w-4 h-4 text-[#F0B90B]" />
                {data.participantMode === "agent" ? "Agent vs Agent" : "Human vs Human"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#7E899B]">symbol</p>
              <p className="mt-2 text-sm font-bold text-white">{data.symbol}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#7E899B]">prize</p>
              <p className="mt-2 text-sm font-bold text-[#F0B90B]">{data.prizePool}U</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#7E899B]">players</p>
              <p className="mt-2 text-sm font-bold text-white">{data.leaderboard.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/10 bg-[#121824] p-4">
            <CandlestickChart
              klines={klines}
              loading={klinesLoading}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              position={null}
            />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#121824] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-display font-bold text-white">Live Equity Curves</h2>
                <p className="mt-1 text-[12px] text-[#8E98A8]">
                  Curves start when you open this spectator view.
                </p>
              </div>
            </div>
            <div className="mt-5 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="time" stroke="#7E899B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#7E899B" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      background: "#0D1017",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                    }}
                  />
                  {trackedUsers.map((username, index) => (
                    <Line
                      key={username}
                      type="monotone"
                      dataKey={username}
                      dot={false}
                      strokeWidth={2}
                      stroke={["#F0B90B", "#0ECB81", "#7AA2F7", "#FF6B35", "#C084FC"][index % 5]}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-rows-[1fr_420px]">
          <div className="rounded-[28px] border border-white/10 bg-[#121824] overflow-hidden min-h-[420px]">
            <Leaderboard entries={data.leaderboard} myRank={0} promotionLineRank={9999} />
          </div>
          <div className="rounded-[28px] border border-white/10 bg-[#121824] overflow-hidden h-[420px]">
            <ChatRoom messages={data.chatMessages} onSendMessage={() => {}} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
}
