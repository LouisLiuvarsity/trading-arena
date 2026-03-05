import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  ChevronDown,
  ChevronRight,
  Trophy,
  Target,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useMatchHistory } from "@/hooks/useCompetitionData";
import type { MatchResultSummary } from "@shared/competitionTypes";

interface TradeDetail {
  id: string;
  tradeNumber: number;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  holdDuration: number;
  closeReason: "tp" | "sl" | "manual" | "match_end" | "time_limit";
}

interface MatchHistoryItem extends MatchResultSummary {
  trades?: TradeDetail[];
}

function formatPnl(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function pnlColor(pct: number): string {
  return pct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]";
}

function pnlBgColor(pct: number): string {
  return pct >= 0 ? "bg-[#0ECB81]/10" : "bg-[#F6465D]/10";
}

function formatHoldTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function SkeletonCard() {
  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-4 bg-white/5 rounded w-24" />
        <div className="h-3 bg-white/5 rounded w-32" />
        <div className="h-3 bg-white/5 rounded w-16 ml-auto" />
      </div>
      <div className="flex gap-4">
        <div className="h-3 bg-white/5 rounded w-20" />
        <div className="h-3 bg-white/5 rounded w-16" />
        <div className="h-3 bg-white/5 rounded w-24" />
      </div>
    </div>
  );
}

function TradeRow({ trade, t }: { trade: TradeDetail; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const CLOSE_REASON_ICONS: Record<string, { icon: string; label: string }> = {
    tp: { icon: "\uD83C\uDFAF", label: "TP" },
    sl: { icon: "\uD83D\uDED1", label: "SL" },
    manual: { icon: "\u270B", label: t('history.closeManual') },
    match_end: { icon: "\u23F0", label: t('history.closeEnd') },
    time_limit: { icon: "\u23F0", label: t('history.closeTimeout') },
  };

  const closeInfo = CLOSE_REASON_ICONS[trade.closeReason] ?? CLOSE_REASON_ICONS.manual;

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-mono bg-[#0B0E11] rounded-lg">
      <span className="text-[#5E6673] w-6 shrink-0">#{trade.tradeNumber}</span>
      <span
        className={`w-12 shrink-0 font-semibold ${
          trade.direction === "long" ? "text-[#0ECB81]" : "text-[#F6465D]"
        }`}
      >
        {trade.direction === "long" ? "LONG" : "SHORT"}
      </span>
      <span className="text-[#D1D4DC] shrink-0">
        {trade.entryPrice.toFixed(2)}
        <span className="text-[#5E6673] mx-0.5">{"\u2192"}</span>
        {trade.exitPrice.toFixed(2)}
      </span>
      <span className={`font-semibold shrink-0 ${pnlColor(trade.pnlPct)}`}>
        {formatPnl(trade.pnlPct)}
      </span>
      <span className="text-[#848E9C] shrink-0">
        {formatHoldTime(trade.holdDuration)}
      </span>
      <span className="ml-auto shrink-0" title={closeInfo.label}>
        {closeInfo.icon}
        <span className="text-[#848E9C] ml-0.5 text-[9px]">{closeInfo.label}</span>
      </span>
    </div>
  );
}

function MatchCard({ match, isExpanded, onToggle, t }: {
  match: MatchHistoryItem;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const winRate =
    match.tradesCount > 0
      ? ((match.winCount / match.tradesCount) * 100).toFixed(1)
      : "0.0";

  function getCompTypeLabel(title: string): string {
    if (title.includes("\u603B\u51B3\u8D5B") || title.toLowerCase().includes("grand")) return t('history.grandFinal');
    if (title.includes("\u7EC3\u4E60") || title.toLowerCase().includes("practice")) return t('history.practice');
    return t('history.regular');
  }

  const compType = getCompTypeLabel(match.competitionTitle);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-2 mb-2.5 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[#848E9C] bg-white/5 px-2 py-0.5 rounded">
              #{match.competitionNumber}
            </span>
            <span className="text-[11px] font-semibold text-[#D1D4DC]">
              {compType}
            </span>
            <span className="text-[10px] text-[#5E6673]">{"\u00B7"}</span>
            <span className="text-[11px] text-[#D1D4DC] font-mono">
              Rank <span className="font-bold">#{match.finalRank}</span>
              <span className="text-[#848E9C]">/{match.participantCount}</span>
            </span>
          </div>
          <span className="text-[10px] text-[#5E6673] ml-auto shrink-0">
            {formatDate(match.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-[11px]">
          <span className={`font-mono font-bold ${pnlColor(match.totalPnlPct)} ${pnlBgColor(match.totalPnlPct)} px-2 py-0.5 rounded`}>
            {formatPnl(match.totalPnlPct)}
          </span>
          {match.pointsEarned > 0 && (
            <span className="font-mono text-[#F0B90B] flex items-center gap-0.5">
              <Target className="w-3 h-3" />
              +{match.pointsEarned}pts
            </span>
          )}
          {match.prizeWon > 0 && (
            <span className="font-mono text-[#F0B90B] font-semibold flex items-center gap-0.5">
              <Trophy className="w-3 h-3" />
              {match.prizeWon}U
            </span>
          )}
          <span className="text-[#5E6673] hidden sm:inline">{"\u00B7"}</span>
          <span className="text-[#848E9C] font-mono">
            {t('history.nTrades', { n: match.tradesCount })}
          </span>
          <span className="text-[#848E9C] font-mono">
            WR {winRate}%
          </span>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-1 px-4 py-2 border-t border-[rgba(255,255,255,0.05)] text-[10px] text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.02] transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronDown className="w-3 h-3" />
            {t('history.collapseDetails')}
          </>
        ) : (
          <>
            <ChevronRight className="w-3 h-3" />
            {t('history.expandDetails')}
          </>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1.5">
              {match.trades && match.trades.length > 0 ? (
                match.trades.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} t={t} />
                ))
              ) : (
                <div className="text-center py-4 text-[#5E6673] text-[11px]">
                  {t('history.noDetails')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SummaryStats({ matches, t }: { matches: MatchHistoryItem[]; t: (key: string, vars?: Record<string, string | number>) => string }) {
  if (matches.length === 0) return null;

  const totalMatches = matches.length;
  const totalPrize = matches.reduce((s, m) => s + (m.prizeWon ?? 0), 0);
  const totalPoints = matches.reduce((s, m) => s + (m.pointsEarned ?? 0), 0);
  const avgPnl =
    matches.reduce((s, m) => s + m.totalPnlPct, 0) / totalMatches;
  const bestRank = Math.min(...matches.map((m) => m.finalRank));
  const winCount = matches.filter((m) => m.totalPnlPct > 0).length;
  const winRate = (winCount / totalMatches) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5"
    >
      {[
        { label: t('history.totalMatches'), value: String(totalMatches), color: "text-[#D1D4DC]" },
        { label: t('history.totalPrize'), value: `${totalPrize}U`, color: totalPrize > 0 ? "text-[#F0B90B]" : "text-[#848E9C]" },
        { label: t('history.totalPoints'), value: `+${totalPoints}`, color: "text-[#F0B90B]" },
        { label: t('history.avgPnl'), value: formatPnl(avgPnl), color: pnlColor(avgPnl) },
        { label: t('history.bestRank'), value: `#${bestRank}`, color: "text-[#D1D4DC]" },
        { label: t('history.winRate'), value: `${winRate.toFixed(0)}%`, color: "text-[#D1D4DC]" },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-center"
        >
          <p className="text-[9px] text-[#848E9C] uppercase mb-1">{label}</p>
          <p className={`text-sm font-mono font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </motion.div>
  );
}

function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-10 text-center">
      <Inbox className="w-10 h-10 text-[#5E6673] mx-auto mb-3" />
      <p className="text-[#848E9C] text-sm font-display font-bold mb-1">
        {t('history.noRecords')}
      </p>
      <p className="text-[#5E6673] text-[11px]">
        {t('history.noRecordsHint')}
      </p>
    </div>
  );
}

export default function MatchHistoryPage() {
  const { t } = useT();
  const { data: historyData, isLoading: loading, error: queryError, refetch } = useMatchHistory();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const rawResults = (historyData as any)?.results ?? historyData ?? [];
  const matches: MatchHistoryItem[] = [...rawResults].sort((a: MatchHistoryItem, b: MatchHistoryItem) => b.createdAt - a.createdAt);
  const error = queryError ? (queryError as Error).message ?? t('common.loadFailed') : null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const toggleExpand = useCallback((competitionId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(competitionId)) {
        next.delete(competitionId);
      } else {
        next.add(competitionId);
      }
      return next;
    });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#F0B90B]" />
          <h1 className="text-xl font-display font-bold text-white">{t('history.title')}</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-1 text-[11px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t('history.refresh')}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-[#1C2030] border border-[#F6465D]/20 rounded-xl p-6 text-center">
          <p className="text-[#F6465D] text-sm mb-2">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-[#848E9C] hover:text-[#D1D4DC] text-xs underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <SummaryStats matches={matches} t={t} />
          {matches.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <MatchCard
                  key={match.competitionId}
                  match={match}
                  isExpanded={expandedIds.has(match.competitionId)}
                  onToggle={() => toggleExpand(match.competitionId)}
                  t={t}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
