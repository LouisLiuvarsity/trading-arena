import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { getCompetitions, withdrawFromCompetition } from "@/lib/competition-api";
import type { CompetitionSummary } from "@shared/competitionTypes";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  Users,
  Clock,
  Trophy,
  CircleDot,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";

type FilterTab = "all" | "registration_open" | "live" | "completed";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "registration_open", label: "报名中" },
  { key: "live", label: "进行中" },
  { key: "completed", label: "已结束" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CircleDot }> = {
  draft: { label: "草稿", color: "#848E9C", bg: "rgba(132,142,156,0.12)", icon: ClipboardList },
  announced: { label: "已公告", color: "#F0B90B", bg: "rgba(240,185,11,0.12)", icon: ClipboardList },
  registration_open: { label: "报名中", color: "#F0B90B", bg: "rgba(240,185,11,0.12)", icon: ClipboardList },
  registration_closed: { label: "报名截止", color: "#848E9C", bg: "rgba(132,142,156,0.12)", icon: Clock },
  live: { label: "进行中", color: "#0ECB81", bg: "rgba(14,203,129,0.12)", icon: CircleDot },
  settling: { label: "结算中", color: "#F0B90B", bg: "rgba(240,185,11,0.12)", icon: Clock },
  completed: { label: "已结束", color: "#848E9C", bg: "rgba(132,142,156,0.12)", icon: CheckCircle2 },
  cancelled: { label: "已取消", color: "#F6465D", bg: "rgba(246,70,93,0.12)", icon: AlertCircle },
};

const REG_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "#F0B90B" },
  accepted: { label: "已通过", color: "#0ECB81" },
  rejected: { label: "已拒绝", color: "#F6465D" },
  withdrawn: { label: "已撤回", color: "#5E6673" },
  waitlisted: { label: "候补中", color: "#848E9C" },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(startTime: number, endTime: number): string {
  const now = Date.now();
  if (now < startTime) {
    const diff = Math.floor((startTime - now) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return h > 0 ? `${h}h ${m}m后开始` : `${m}m后开始`;
  }
  if (now < endTime) {
    const diff = Math.floor((endTime - now) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `剩余${h > 0 ? `${h}h ${m}m` : `${m}m`}`;
  }
  return "";
}

function matchesFilter(comp: CompetitionSummary, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "live") return comp.status === "live" || comp.status === "settling";
  if (filter === "completed") return comp.status === "completed" || comp.status === "cancelled";
  if (filter === "registration_open") return comp.status === "registration_open" || comp.status === "announced";
  return comp.status === filter;
}

function groupByStatus(comps: CompetitionSummary[]): { label: string; icon: typeof CircleDot; comps: CompetitionSummary[] }[] {
  const live = comps.filter((c) => c.status === "live" || c.status === "settling");
  const regOpen = comps.filter((c) => c.status === "registration_open" || c.status === "announced" || c.status === "registration_closed");
  const completed = comps.filter((c) => c.status === "completed" || c.status === "cancelled");
  const draft = comps.filter((c) => c.status === "draft");

  const groups: { label: string; icon: typeof CircleDot; comps: CompetitionSummary[] }[] = [];
  if (live.length > 0) groups.push({ label: "LIVE", icon: CircleDot, comps: live });
  if (regOpen.length > 0) groups.push({ label: "报名中", icon: ClipboardList, comps: regOpen });
  if (draft.length > 0) groups.push({ label: "草稿", icon: ClipboardList, comps: draft });
  if (completed.length > 0) groups.push({ label: "已结束", icon: CheckCircle2, comps: completed });
  return groups;
}

export default function CompetitionsPage() {
  const { token } = useAuth();
  const [competitions, setCompetitions] = useState<CompetitionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

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

  const handleWithdraw = async (slug: string) => {
    if (!token) return;
    setWithdrawing(slug);
    try {
      await withdrawFromCompetition(slug, token);
      toast.success("已撤回报名");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "撤回失败");
    } finally {
      setWithdrawing(null);
    }
  };

  const filtered = competitions.filter((c) => matchesFilter(c, filter));
  const groups = groupByStatus(filtered);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-display font-bold text-white mb-1">赛程</h1>
      <p className="text-[#848E9C] text-[11px] mb-5">浏览所有比赛日程</p>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-white/[0.03] rounded-lg p-1 w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
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
          <p className="text-[#848E9C] text-sm">暂无比赛</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <GroupIcon className="w-4 h-4" style={{ color: group.label === "LIVE" ? "#0ECB81" : group.label === "报名中" ? "#F0B90B" : "#848E9C" }} />
                  <h2 className="text-xs font-display font-bold text-[#D1D4DC]">{group.label}</h2>
                  <span className="text-[10px] text-[#848E9C]">({group.comps.length})</span>
                </div>
                <div className="space-y-3">
                  {group.comps.map((comp) => (
                    <CompetitionCard
                      key={comp.id}
                      comp={comp}
                      onWithdraw={handleWithdraw}
                      withdrawing={withdrawing}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({
  comp,
  onWithdraw,
  withdrawing,
}: {
  comp: CompetitionSummary;
  onWithdraw: (slug: string) => void;
  withdrawing: string | null;
}) {
  const statusCfg = STATUS_CONFIG[comp.status] ?? STATUS_CONFIG.draft;
  const regBadge = comp.myRegistrationStatus ? REG_STATUS_BADGE[comp.myRegistrationStatus] : null;

  return (
    <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.15)] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title + Status */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[#D1D4DC] text-sm font-display font-bold truncate">{comp.title}</span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
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
                {(comp.status === "live" || comp.status === "registration_open") &&
                  ` · ${formatCountdown(comp.startTime, comp.endTime)}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {comp.status === "completed" ? `${comp.acceptedCount}人` : `${comp.registeredCount}/${comp.maxParticipants}人`}
            </span>
            {comp.prizePool > 0 && (
              <span className="flex items-center gap-1 text-[#F0B90B]">
                <Trophy className="w-3 h-3" />
                {comp.prizePool}U
              </span>
            )}
            {comp.symbol && (
              <span className="font-mono">{comp.symbol}</span>
            )}
          </div>

          {/* Registration status */}
          {regBadge && comp.status !== "completed" && (
            <div className="mt-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${regBadge.color}20`, color: regBadge.color }}
              >
                我的状态: {regBadge.label}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-2">
          {comp.status === "live" && comp.myRegistrationStatus === "accepted" && (
            <Link
              href={`/arena/${comp.id}`}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#0ECB81] text-[#0B0E11] text-[11px] font-bold rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
            >
              进入比赛 <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {comp.status === "registration_open" && !comp.myRegistrationStatus && (
            <Link
              href={`/competitions/${comp.slug}`}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#F0B90B] text-[#0B0E11] text-[11px] font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
            >
              报名 <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {comp.status === "registration_open" &&
            comp.myRegistrationStatus &&
            comp.myRegistrationStatus !== "withdrawn" &&
            comp.myRegistrationStatus !== "rejected" && (
              <button
                onClick={() => onWithdraw(comp.slug)}
                disabled={withdrawing === comp.slug}
                className="px-3 py-2 text-[11px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors disabled:opacity-50"
              >
                {withdrawing === comp.slug ? "撤回中..." : "撤回报名"}
              </button>
            )}
          {comp.status === "completed" && (
            <Link
              href={`/results/${comp.id}`}
              className="inline-flex items-center gap-1 px-4 py-2 text-[11px] font-bold text-[#D1D4DC] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-white/5 transition-colors"
            >
              查看结果 <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {comp.status !== "live" && comp.status !== "completed" && comp.status !== "registration_open" && (
            <Link
              href={`/competitions/${comp.slug}`}
              className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
            >
              详情 <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
