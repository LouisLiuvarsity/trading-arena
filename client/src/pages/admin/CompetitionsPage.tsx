import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCompetitions,
  adminTransitionCompetition,
  adminDuplicateCompetition,
} from "@/lib/competition-api";
import type { CompetitionSummary } from "@shared/competitionTypes";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Plus,
  ChevronRight,
  Users,
  Clock,
  Trophy,
  Edit,
  Copy,
  XCircle,
  PlayCircle,
  StopCircle,
  ClipboardCheck,
  Send,
} from "lucide-react";

type FilterTab = "all" | "draft" | "registration_open" | "live" | "completed" | "cancelled";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "registration_open", label: "报名中" },
  { key: "live", label: "进行中" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "#848E9C" },
  announced: { label: "已公告", color: "#F0B90B" },
  registration_open: { label: "报名中", color: "#F0B90B" },
  registration_closed: { label: "报名截止", color: "#848E9C" },
  live: { label: "进行中", color: "#0ECB81" },
  settling: { label: "结算中", color: "#F0B90B" },
  completed: { label: "已完成", color: "#0ECB81" },
  cancelled: { label: "已取消", color: "#F6465D" },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesFilter(comp: CompetitionSummary, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "live") return comp.status === "live" || comp.status === "settling";
  if (filter === "completed") return comp.status === "completed";
  if (filter === "cancelled") return comp.status === "cancelled";
  if (filter === "registration_open") return comp.status === "registration_open" || comp.status === "registration_closed";
  return comp.status === filter;
}

export default function AdminCompetitionsPage() {
  const { token } = useAuth();
  const [competitions, setCompetitions] = useState<CompetitionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = () => {
    setLoading(true);
    getCompetitions(token)
      .then((res) => {
        setCompetitions(res.items);
        setError(null);
      })
      .catch((err) => setError(err.message ?? "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleTransition = async (id: number, status: string, label: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      await adminTransitionCompetition(id, status, token);
      toast.success(`已${label}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? `${label}失败`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (id: number) => {
    if (!token) return;
    setActionLoading(id);
    try {
      const result = await adminDuplicateCompetition(id, token);
      toast.success(`已复制，新比赛ID: ${result.id}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "复制失败");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = competitions.filter((c) => matchesFilter(c, filter));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold text-white">比赛管理</h1>
          <p className="text-[#848E9C] text-[11px] mt-0.5">创建和管理比赛日程</p>
        </div>
        <Link
          href="/admin/competitions/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F0B90B] text-[#0B0E11] text-xs font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 创建比赛
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-white/[0.03] rounded-lg p-1 w-fit overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors whitespace-nowrap ${
              filter === tab.key
                ? "bg-[#F0B90B] text-[#0B0E11]"
                : "text-[#848E9C] hover:text-[#D1D4DC]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#848E9C] text-sm">暂无比赛。点击上方按钮创建第一场。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((comp) => {
            const statusCfg = STATUS_CONFIG[comp.status] ?? STATUS_CONFIG.draft;
            const isActioning = actionLoading === comp.id;

            return (
              <div
                key={comp.id}
                className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.15)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title + ID + Status */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[#848E9C] text-[10px] font-mono">#{comp.id}</span>
                      <span className="text-[#D1D4DC] text-sm font-display font-bold truncate">{comp.title}</span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
                      >
                        {comp.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />}
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Info line */}
                    <div className="flex items-center gap-3 text-[11px] text-[#848E9C] flex-wrap">
                      {comp.startTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(comp.startTime)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {comp.registeredCount}人报名 / {comp.acceptedCount}人通过
                      </span>
                      {comp.prizePool > 0 && (
                        <span className="flex items-center gap-1 text-[#F0B90B]">
                          <Trophy className="w-3 h-3" />
                          {comp.prizePool}U
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                    {isActioning && <Loader2 className="w-4 h-4 text-[#F0B90B] animate-spin" />}

                    {/* Draft actions */}
                    {comp.status === "draft" && (
                      <>
                        <button
                          onClick={() => handleTransition(comp.id, "registration_open", "发布")}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#0ECB81] border border-[#0ECB81]/30 rounded-lg hover:bg-[#0ECB81]/10 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" /> 发布
                        </button>
                        <Link
                          href={`/admin/competitions/${comp.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#D1D4DC] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <Edit className="w-3 h-3" /> 编辑
                        </Link>
                        <button
                          onClick={() => handleDuplicate(comp.id)}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#848E9C] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                          <Copy className="w-3 h-3" /> 复制
                        </button>
                      </>
                    )}

                    {/* Registration open actions */}
                    {(comp.status === "registration_open" || comp.status === "announced") && (
                      <>
                        <Link
                          href={`/admin/registrations/${comp.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F0B90B] border border-[#F0B90B]/30 rounded-lg hover:bg-[#F0B90B]/10 transition-colors"
                        >
                          <ClipboardCheck className="w-3 h-3" /> 审核报名
                        </Link>
                        <button
                          onClick={() => handleTransition(comp.id, "registration_closed", "关闭报名")}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#848E9C] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                          <StopCircle className="w-3 h-3" /> 关闭报名
                        </button>
                        <Link
                          href={`/admin/competitions/${comp.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#D1D4DC] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <Edit className="w-3 h-3" /> 编辑
                        </Link>
                        <button
                          onClick={() => handleTransition(comp.id, "cancelled", "取消比赛")}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" /> 取消
                        </button>
                      </>
                    )}

                    {/* Registration closed: start live */}
                    {comp.status === "registration_closed" && (
                      <>
                        <Link
                          href={`/admin/registrations/${comp.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F0B90B] border border-[#F0B90B]/30 rounded-lg hover:bg-[#F0B90B]/10 transition-colors"
                        >
                          <ClipboardCheck className="w-3 h-3" /> 审核报名
                        </Link>
                        <button
                          onClick={() => handleTransition(comp.id, "live", "开始比赛")}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#0ECB81] border border-[#0ECB81]/30 rounded-lg hover:bg-[#0ECB81]/10 transition-colors disabled:opacity-50"
                        >
                          <PlayCircle className="w-3 h-3" /> 开始比赛
                        </button>
                        <button
                          onClick={() => handleTransition(comp.id, "cancelled", "取消比赛")}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" /> 取消
                        </button>
                      </>
                    )}

                    {/* Live actions */}
                    {comp.status === "live" && (
                      <>
                        <button
                          onClick={() => handleTransition(comp.id, "settling", "进入结算")}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F0B90B] border border-[#F0B90B]/30 rounded-lg hover:bg-[#F0B90B]/10 transition-colors disabled:opacity-50"
                        >
                          <StopCircle className="w-3 h-3" /> 结束比赛
                        </button>
                      </>
                    )}

                    {/* Settling */}
                    {comp.status === "settling" && (
                      <button
                        onClick={() => handleTransition(comp.id, "completed", "完成结算")}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#0ECB81] border border-[#0ECB81]/30 rounded-lg hover:bg-[#0ECB81]/10 transition-colors disabled:opacity-50"
                      >
                        <PlayCircle className="w-3 h-3" /> 完成结算
                      </button>
                    )}

                    {/* Completed / Cancelled */}
                    {(comp.status === "completed" || comp.status === "cancelled") && (
                      <button
                        onClick={() => handleDuplicate(comp.id)}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#848E9C] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        <Copy className="w-3 h-3" /> 复制
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
