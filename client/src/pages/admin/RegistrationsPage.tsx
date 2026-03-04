import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminGetRegistrations,
  adminReviewRegistration,
  adminBatchReview,
} from "@/lib/competition-api";
import type { AdminRegistration } from "@shared/competitionTypes";
import { RANK_TIERS } from "@/lib/types";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Check,
  X,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  iron: "#5E6673",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F0B90B",
  platinum: "#00D4AA",
  diamond: "#B9F2FF",
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "#F0B90B" },
  accepted: { label: "已通过", color: "#0ECB81" },
  rejected: { label: "已拒绝", color: "#F6465D" },
  withdrawn: { label: "已撤回", color: "#5E6673" },
  waitlisted: { label: "候补", color: "#848E9C" },
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

interface Props {
  competitionId: string;
}

export default function AdminRegistrationsPage({ competitionId }: Props) {
  const { token } = useAuth();
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const compId = Number(competitionId);

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    adminGetRegistrations(compId, token)
      .then((data) => {
        setRegistrations(data);
        setError(null);
      })
      .catch((err) => setError(err.message ?? "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [token, competitionId]);

  const pendingRegs = useMemo(() => registrations.filter((r) => r.status === "pending"), [registrations]);
  const acceptedRegs = useMemo(() => registrations.filter((r) => r.status === "accepted"), [registrations]);
  const selectedPending = useMemo(
    () => pendingRegs.filter((r) => selected.has(r.id)),
    [pendingRegs, selected],
  );

  const toggleSelection = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pendingRegs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingRegs.map((r) => r.id)));
    }
  };

  const handleReview = async (id: number, decision: "accepted" | "rejected") => {
    if (!token) return;
    setActionLoading(id);
    try {
      await adminReviewRegistration(id, decision, token);
      toast.success(decision === "accepted" ? "已通过" : "已拒绝");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchAction = async (action: "accepted" | "rejected") => {
    if (!token) return;
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error("请先选择报名");
      return;
    }
    setBatchLoading(true);
    try {
      const result = await adminBatchReview(compId, ids, action, token);
      toast.success(`已${action === "accepted" ? "批量接受" : "批量拒绝"} ${result.processed} 条`);
      setSelected(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "批量操作失败");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchAcceptAll = async () => {
    if (!token) return;
    const ids = pendingRegs.map((r) => r.id);
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const result = await adminBatchReview(compId, ids, "accepted", token);
      toast.success(`已全部接受 ${result.processed} 条`);
      setSelected(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "操作失败");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchRejectAll = async () => {
    if (!token) return;
    const ids = pendingRegs.map((r) => r.id);
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const result = await adminBatchReview(compId, ids, "rejected", token);
      toast.success(`已全部拒绝 ${result.processed} 条`);
      setSelected(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "操作失败");
    } finally {
      setBatchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error}</p>
          <Link href="/admin/competitions" className="inline-flex items-center gap-1 mt-4 text-[#F0B90B] text-xs font-bold hover:underline">
            <ArrowLeft className="w-3 h-3" /> 返回比赛管理
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back link */}
      <Link href="/admin/competitions" className="inline-flex items-center gap-1 text-[#848E9C] text-[11px] hover:text-[#D1D4DC] transition-colors mb-4">
        <ArrowLeft className="w-3 h-3" /> 返回比赛管理
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-display font-bold text-white">报名审核</h1>
          <p className="text-[#848E9C] text-[11px] mt-0.5">比赛 #{competitionId} 的报名管理</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingRegs.length > 0 && (
            <>
              <button
                onClick={handleBatchAcceptAll}
                disabled={batchLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#0ECB81] border border-[#0ECB81]/30 rounded-lg hover:bg-[#0ECB81]/10 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3 h-3" /> 全部接受
              </button>
              <button
                onClick={handleBatchRejectAll}
                disabled={batchLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3 h-3" /> 全部拒绝
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center">
          <p className="text-[10px] text-[#848E9C]">总报名</p>
          <p className="text-xl font-mono font-bold text-white">{registrations.length}</p>
        </div>
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center">
          <p className="text-[10px] text-[#848E9C]">待审核</p>
          <p className="text-xl font-mono font-bold text-[#F0B90B]">{pendingRegs.length}</p>
        </div>
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center">
          <p className="text-[10px] text-[#848E9C]">已通过</p>
          <p className="text-xl font-mono font-bold text-[#0ECB81]">{acceptedRegs.length}</p>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedPending.length > 0 && (
        <div className="bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-[11px] text-[#F0B90B] font-bold">
            已选: {selectedPending.length}/{pendingRegs.length} 待审核
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBatchAction("accepted")}
              disabled={batchLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#0B0E11] bg-[#0ECB81] rounded-lg hover:bg-[#0ECB81]/90 transition-colors disabled:opacity-50"
            >
              {batchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              批量接受选中
            </button>
            <button
              onClick={() => handleBatchAction("rejected")}
              disabled={batchLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
            >
              批量拒绝
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2.5rem_1fr_5rem_4.5rem_5rem_6rem] gap-2 px-4 py-2.5 text-[10px] text-[#848E9C] font-bold border-b border-[rgba(255,255,255,0.08)]">
          <span className="flex items-center">
            {pendingRegs.length > 0 && (
              <input
                type="checkbox"
                checked={selected.size === pendingRegs.length && pendingRegs.length > 0}
                onChange={toggleAll}
                className="w-3.5 h-3.5 rounded border-[rgba(255,255,255,0.2)] bg-white/[0.03] text-[#F0B90B] focus:ring-[#F0B90B]/50"
              />
            )}
          </span>
          <span>选手</span>
          <span>状态</span>
          <span className="text-right">赛季分</span>
          <span className="text-right">申请时间</span>
          <span className="text-right">操作</span>
        </div>

        {registrations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Users className="w-6 h-6 text-[#848E9C] mx-auto mb-2" />
            <p className="text-[#848E9C] text-[11px]">暂无报名</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {registrations.map((reg) => {
              const badge = STATUS_BADGE[reg.status] ?? { label: reg.status, color: "#848E9C" };
              const tierInfo = RANK_TIERS.find((t) => t.tier === reg.rankTier);
              const tierColor = TIER_COLORS[reg.rankTier] ?? "#5E6673";
              const isPending = reg.status === "pending";
              const isReviewing = actionLoading === reg.id;

              return (
                <div
                  key={reg.id}
                  className={`grid grid-cols-[2.5rem_1fr_5rem_4.5rem_5rem_6rem] gap-2 px-4 py-2.5 text-[11px] items-center ${
                    isPending ? "hover:bg-white/[0.02]" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <span className="flex items-center">
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={selected.has(reg.id)}
                        onChange={() => toggleSelection(reg.id)}
                        className="w-3.5 h-3.5 rounded border-[rgba(255,255,255,0.2)] bg-white/[0.03] text-[#F0B90B] focus:ring-[#F0B90B]/50"
                      />
                    )}
                  </span>

                  {/* Username + tier */}
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9px]" style={{ color: tierColor }}>{tierInfo?.icon ?? ""}</span>
                    <span className="text-[#D1D4DC] font-bold truncate">{reg.username}</span>
                    {reg.institutionName && (
                      <span className="text-[9px] text-[#848E9C] truncate">({reg.institutionName})</span>
                    )}
                  </span>

                  {/* Status */}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-center"
                    style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                  >
                    {badge.label}
                  </span>

                  {/* Season points */}
                  <span className="font-mono text-[#D1D4DC] text-right">{reg.seasonPoints}</span>

                  {/* Applied time */}
                  <span className="text-[#848E9C] text-right text-[10px]">{formatTimeAgo(reg.appliedAt)}</span>

                  {/* Actions */}
                  <span className="flex items-center gap-1 justify-end">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleReview(reg.id, "accepted")}
                          disabled={isReviewing}
                          className="inline-flex items-center justify-center w-7 h-7 text-[#0ECB81] border border-[#0ECB81]/30 rounded-lg hover:bg-[#0ECB81]/10 transition-colors disabled:opacity-50"
                          title="通过"
                        >
                          {isReviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleReview(reg.id, "rejected")}
                          disabled={isReviewing}
                          className="inline-flex items-center justify-center w-7 h-7 text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
                          title="拒绝"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#848E9C]">--</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
