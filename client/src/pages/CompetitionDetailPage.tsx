import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCompetitionDetail,
  getCompetitionLeaderboard,
  registerForCompetition,
  withdrawFromCompetition,
} from "@/lib/competition-api";
import type { CompetitionDetail } from "@shared/competitionTypes";
import type { LeaderboardEntry } from "@/lib/types";
import { RANK_TIERS } from "@/lib/types";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  Users,
  Clock,
  Trophy,
  Shield,
  DollarSign,
  BarChart3,
  Eye,
  ArrowLeft,
} from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "#848E9C" },
  announced: { label: "已公告", color: "#F0B90B" },
  registration_open: { label: "报名中", color: "#F0B90B" },
  registration_closed: { label: "报名截止", color: "#848E9C" },
  live: { label: "进行中", color: "#0ECB81" },
  settling: { label: "结算中", color: "#F0B90B" },
  completed: { label: "已结束", color: "#848E9C" },
  cancelled: { label: "已取消", color: "#F6465D" },
};

const REG_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "#F0B90B" },
  accepted: { label: "已通过", color: "#0ECB81" },
  rejected: { label: "已拒绝", color: "#F6465D" },
  withdrawn: { label: "已撤回", color: "#5E6673" },
  waitlisted: { label: "候补中", color: "#848E9C" },
};

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startTs: number, endTs: number): string {
  const diffMs = endTs - startTs;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}小时${mins > 0 ? `${mins}分钟` : ""}` : `${mins}分钟`;
}

interface Props {
  slug: string;
}

export default function CompetitionDetailPage({ slug }: Props) {
  const { token, username } = useAuth();
  const [comp, setComp] = useState<CompetitionDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [withdrawingReg, setWithdrawingReg] = useState(false);

  const fetchDetail = () => {
    setLoading(true);
    getCompetitionDetail(slug, token)
      .then((data) => {
        setComp(data);
        setError(null);
        // Fetch leaderboard if live
        if (data.status === "live" || data.status === "settling") {
          getCompetitionLeaderboard(slug, token)
            .then((lb) => setLeaderboard(lb))
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.message ?? "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [slug, token]);

  const handleRegister = async () => {
    if (!token) return;
    setRegistering(true);
    try {
      await registerForCompetition(slug, token);
      toast.success("报名成功");
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message ?? "报名失败");
    } finally {
      setRegistering(false);
    }
  };

  const handleWithdraw = async () => {
    if (!token) return;
    setWithdrawingReg(true);
    try {
      await withdrawFromCompetition(slug, token);
      toast.success("已撤回报名");
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message ?? "撤回失败");
    } finally {
      setWithdrawingReg(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error || !comp) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error ?? "加载失败"}</p>
          <Link href="/competitions" className="inline-flex items-center gap-1 mt-4 text-[#F0B90B] text-xs font-bold hover:underline">
            <ArrowLeft className="w-3 h-3" /> 返回赛程
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_LABELS[comp.status] ?? STATUS_LABELS.draft;
  const isParticipant = comp.myRegistrationStatus === "accepted";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back link */}
      <Link href="/competitions" className="inline-flex items-center gap-1 text-[#848E9C] text-[11px] hover:text-[#D1D4DC] transition-colors">
        <ArrowLeft className="w-3 h-3" /> 返回赛程
      </Link>

      {/* Header */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h1 className="text-xl font-display font-bold text-white">{comp.title}</h1>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold"
            style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
          >
            {comp.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />}
            {statusCfg.label}
          </span>
        </div>

        {comp.description && (
          <p className="text-[#848E9C] text-xs mb-4">{comp.description}</p>
        )}

        {/* Key info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Clock className="w-3 h-3" />开始时间</p>
            <p className="text-sm font-mono text-[#D1D4DC]">{formatDateTime(comp.startTime)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Clock className="w-3 h-3" />比赛时长</p>
            <p className="text-sm font-mono text-[#D1D4DC]">{formatDuration(comp.startTime, comp.endTime)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Users className="w-3 h-3" />参赛人数</p>
            <p className="text-sm font-mono text-[#D1D4DC]">{comp.acceptedCount}/{comp.maxParticipants}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#848E9C] flex items-center gap-1"><Trophy className="w-3 h-3" />奖池</p>
            <p className="text-sm font-mono text-[#F0B90B]">{comp.prizePool} USDT</p>
          </div>
        </div>

        {/* Registration action */}
        {comp.status === "registration_open" && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            {comp.myRegistrationStatus ? (
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{
                    backgroundColor: `${REG_BADGE[comp.myRegistrationStatus]?.color ?? "#848E9C"}20`,
                    color: REG_BADGE[comp.myRegistrationStatus]?.color ?? "#848E9C",
                  }}
                >
                  我的报名: {REG_BADGE[comp.myRegistrationStatus]?.label ?? comp.myRegistrationStatus}
                </span>
                {comp.myRegistrationStatus !== "withdrawn" && comp.myRegistrationStatus !== "rejected" && (
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawingReg}
                    className="px-3 py-1.5 text-[11px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
                  >
                    {withdrawingReg ? "撤回中..." : "撤回报名"}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="px-6 py-2.5 bg-[#F0B90B] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
              >
                {registering ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 报名中...</span>
                ) : (
                  "立即报名"
                )}
              </button>
            )}
          </div>
        )}

        {/* Live: Enter arena button */}
        {comp.status === "live" && isParticipant && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            <Link
              href={`/arena/${comp.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ECB81] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
            >
              进入比赛 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Live: Spectator mode */}
        {comp.status === "live" && !isParticipant && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#848E9C] bg-white/5 rounded-lg">
              <Eye className="w-3.5 h-3.5" /> 观战模式
            </span>
          </div>
        )}

        {/* Completed: link to results */}
        {comp.status === "completed" && (
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
            <Link
              href={`/results/${comp.id}`}
              className="inline-flex items-center gap-1 px-5 py-2.5 text-sm font-bold text-[#D1D4DC] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors"
            >
              查看结果 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Rules card (for registration_open) */}
      {(comp.status === "registration_open" || comp.status === "announced" || comp.status === "draft") && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F0B90B]" />
            比赛规则
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" />初始资金</p>
              <p className="font-mono font-bold text-[#D1D4DC]">{comp.startingCapital.toLocaleString()} USDT</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3" />最大交易数</p>
              <p className="font-mono font-bold text-[#D1D4DC]">{comp.maxTradesPerMatch} 笔</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />仅平仓期</p>
              <p className="font-mono font-bold text-[#D1D4DC]">最后 {comp.closeOnlySeconds / 60} 分钟</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-[#848E9C] mb-1">手续费率</p>
              <p className="font-mono font-bold text-[#D1D4DC]">{(comp.feeRate * 100).toFixed(2)}%</p>
            </div>
          </div>
          {(comp.requireMinSeasonPoints > 0 || comp.inviteOnly) && (
            <div className="mt-3 flex items-center gap-3 text-[11px]">
              {comp.requireMinSeasonPoints > 0 && (
                <span className="text-[#F0B90B]">最低赛季积分: {comp.requireMinSeasonPoints}pts</span>
              )}
              {comp.inviteOnly && (
                <span className="text-[#F6465D]">仅限邀请</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mini leaderboard (for live) */}
      {(comp.status === "live" || comp.status === "settling") && leaderboard.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F0B90B]" />
            实时排行
          </h2>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((entry) => {
              const isYou = entry.username === username || entry.isYou;
              return (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] ${
                    isYou ? "bg-[#F0B90B]/10 border border-[#F0B90B]/20" : "bg-white/[0.02]"
                  }`}
                >
                  <span className="font-mono font-bold text-[#848E9C] w-6">#{entry.rank}</span>
                  <span className={`font-bold flex-1 ${isYou ? "text-[#F0B90B]" : "text-[#D1D4DC]"}`}>
                    {entry.username}
                    {isYou && <span className="text-[9px] ml-1">(你)</span>}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: TIER_COLORS[entry.rankTier] ?? "#5E6673" }}
                  >
                    {RANK_TIERS.find((t) => t.tier === entry.rankTier)?.icon ?? ""}
                  </span>
                  <span className={`font-mono font-bold w-16 text-right ${entry.pnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {entry.pnlPct >= 0 ? "+" : ""}{entry.pnlPct.toFixed(2)}%
                  </span>
                  <span className="font-mono text-[#F0B90B] w-12 text-right">{entry.matchPoints}pts</span>
                </div>
              );
            })}
          </div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 text-[#F0B90B] text-[11px] font-bold mt-3 hover:underline"
          >
            完整排行 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Participants list */}
      {comp.participants && comp.participants.length > 0 && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <h2 className="text-sm font-display font-bold text-[#D1D4DC] mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F0B90B]" />
            参赛选手 ({comp.participants.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {comp.participants.map((p) => (
              <Link
                key={p.username}
                href={`/user/${p.username}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <span
                  className="text-[10px]"
                  style={{ color: TIER_COLORS[p.rankTier] ?? "#5E6673" }}
                >
                  {RANK_TIERS.find((t) => t.tier === p.rankTier)?.icon ?? ""}
                </span>
                <span className={`text-[11px] truncate ${p.username === username ? "text-[#F0B90B] font-bold" : "text-[#D1D4DC]"}`}>
                  {p.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
