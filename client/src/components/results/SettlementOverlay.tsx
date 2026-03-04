import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, X, ArrowRight, Star, TrendingUp, TrendingDown } from "lucide-react";
import { RANK_TIERS } from "@/lib/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  result: {
    competitionTitle: string;
    finalRank: number;
    participantCount: number;
    totalPnlPct: number;
    prizeWon: number;
    pointsEarned: number;
    rankTier: string;
  } | null;
}

function getTierInfo(tierKey: string) {
  const found = RANK_TIERS.find((t) => t.tier === tierKey);
  return found ?? RANK_TIERS[0];
}

function getRankMedal(rank: number): string | null {
  if (rank === 1) return "\uD83E\uDD47";
  if (rank === 2) return "\uD83E\uDD48";
  if (rank === 3) return "\uD83E\uDD49";
  return null;
}

export default function SettlementOverlay({ visible, onClose, result }: Props) {
  const handleViewDetails = useCallback(() => {
    // Navigate to detailed results -- caller can wire this up
    onClose();
  }, [onClose]);

  if (!result) return null;

  const tier = getTierInfo(result.rankTier);
  const medal = getRankMedal(result.finalRank);
  const isProfit = result.totalPnlPct >= 0;
  const topPercent = Math.round((result.finalRank / result.participantCount) * 100);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
            className="relative z-10 w-[90vw] max-w-md bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#848E9C] hover:text-white transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top gradient accent */}
            <div className="h-1.5 bg-gradient-to-r from-[#F0B90B] via-[#0ECB81] to-[#F0B90B]" />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.3, duration: 0.6, times: [0, 0.6, 1] }}
                className="text-[#F0B90B] mb-3"
              >
                <Trophy className="w-10 h-10 mx-auto drop-shadow-[0_0_12px_rgba(240,185,11,0.5)]" />
              </motion.div>
              <p className="text-[#848E9C] text-[11px] uppercase tracking-widest mb-1">
                比赛结算
              </p>
              <h2 className="text-white font-display font-bold text-lg leading-tight">
                {result.competitionTitle}
              </h2>
            </div>

            {/* Rank display */}
            <div className="px-6 pb-4 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="inline-flex flex-col items-center"
              >
                {medal && (
                  <span className="text-4xl mb-1">{medal}</span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-mono font-bold text-white tracking-tight">
                    #{result.finalRank}
                  </span>
                  <span className="text-[#848E9C] text-sm font-mono">
                    /{result.participantCount}
                  </span>
                </div>
                <p className="text-[#848E9C] text-[11px] mt-1">
                  {topPercent <= 10
                    ? `Top ${topPercent}%`
                    : topPercent <= 50
                      ? `Top ${topPercent}%`
                      : `Top ${topPercent}%`}
                </p>
              </motion.div>
            </div>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mx-6 mb-4 grid grid-cols-2 gap-3"
            >
              {/* PnL */}
              <div className="bg-[#0B0E11] rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {isProfit ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[#0ECB81]" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-[#F6465D]" />
                  )}
                  <span className="text-[#848E9C] text-[10px] uppercase">收益率</span>
                </div>
                <span
                  className={`text-xl font-mono font-bold ${
                    isProfit ? "text-[#0ECB81]" : "text-[#F6465D]"
                  }`}
                >
                  {isProfit ? "+" : ""}
                  {result.totalPnlPct.toFixed(2)}%
                </span>
              </div>

              {/* Points */}
              <div className="bg-[#0B0E11] rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-3.5 h-3.5 text-[#F0B90B]" />
                  <span className="text-[#848E9C] text-[10px] uppercase">积分</span>
                </div>
                <span className="text-xl font-mono font-bold text-[#F0B90B]">
                  +{result.pointsEarned}
                </span>
              </div>

              {/* Prize */}
              {result.prizeWon > 0 && (
                <div className="bg-[#0B0E11] rounded-xl p-3 text-center col-span-2">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Trophy className="w-3.5 h-3.5 text-[#F0B90B]" />
                    <span className="text-[#848E9C] text-[10px] uppercase">奖金</span>
                  </div>
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [0.8, 1.15, 1] }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="text-2xl font-mono font-bold text-[#F0B90B] drop-shadow-[0_0_8px_rgba(240,185,11,0.4)]"
                  >
                    {result.prizeWon} USDT
                  </motion.span>
                </div>
              )}
            </motion.div>

            {/* Tier badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mx-6 mb-5 flex items-center justify-center gap-2"
            >
              <span className="text-sm">{tier.icon}</span>
              <span className="text-[11px] font-semibold" style={{ color: tier.color }}>
                {tier.label}
              </span>
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.3 }}
              className="px-6 pb-6 flex gap-3"
            >
              <button
                onClick={handleViewDetails}
                className="flex-1 flex items-center justify-center gap-2 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#0B0E11] font-display font-bold text-sm py-3 rounded-xl transition-colors"
              >
                查看详细结果
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 bg-[#0B0E11] hover:bg-white/5 text-[#848E9C] hover:text-[#D1D4DC] font-display font-bold text-sm rounded-xl border border-[rgba(255,255,255,0.08)] transition-colors"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
