import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminCreateCompetition,
  adminUpdateCompetition,
  getCompetitionDetail,
  getSeasons,
} from "@/lib/competition-api";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Save,
} from "lucide-react";
import { Link } from "wouter";

interface Props {
  competitionId?: string;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  seasonId: string;
  competitionNumber: number;
  competitionType: string;
  participantMode: "human" | "agent";
  maxParticipants: number;
  minParticipants: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startTime: string;
  endTime: string;
  prizePool: number;
  requireMinSeasonPoints: number;
  inviteOnly: boolean;
}

const INITIAL_FORM: FormData = {
  title: "",
  slug: "",
  description: "",
  seasonId: "",
  competitionNumber: 1,
  competitionType: "regular",
  participantMode: "human",
  maxParticipants: 50,
  minParticipants: 5,
  registrationOpenAt: "",
  registrationCloseAt: "",
  startTime: "",
  endTime: "",
  prizePool: 500,
  requireMinSeasonPoints: 0,
  inviteOnly: false,
};

const COMP_TYPES = [
  { value: "regular", label: "常规赛" },
  { value: "grand_final", label: "总决赛" },
  { value: "special", label: "特别赛" },
  { value: "practice", label: "练习赛" },
];

function toLocalDatetime(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDatetime(str: string): number {
  if (!str) return 0;
  return new Date(str).getTime();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCompetitionFormPage({ competitionId }: Props) {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const isEdit = !!competitionId;

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Load seasons
  useEffect(() => {
    getSeasons()
      .then(setSeasons)
      .catch(() => {});
  }, []);

  // Load existing competition data for edit mode
  useEffect(() => {
    if (!isEdit || !competitionId || !token) return;
    setLoading(true);
    getCompetitionDetail(competitionId, token)
      .then((data: any) => {
        setForm({
          title: data.title ?? "",
          slug: data.slug ?? "",
          description: data.description ?? "",
          seasonId: data.seasonId ? String(data.seasonId) : "",
          competitionNumber: data.competitionNumber ?? 1,
          competitionType: data.competitionType ?? "regular",
          participantMode: data.participantMode ?? "human",
          maxParticipants: data.maxParticipants ?? 50,
          minParticipants: data.minParticipants ?? 5,
          registrationOpenAt: toLocalDatetime(data.registrationOpenAt),
          registrationCloseAt: toLocalDatetime(data.registrationCloseAt),
          startTime: toLocalDatetime(data.startTime),
          endTime: toLocalDatetime(data.endTime),
          prizePool: data.prizePool ?? 500,
          requireMinSeasonPoints: data.requireMinSeasonPoints ?? 0,
          inviteOnly: data.inviteOnly ?? false,
        });
        setSlugManuallyEdited(true);
        setError(null);
      })
      .catch((err: any) => setError(err.message ?? "加载失败"))
      .finally(() => setLoading(false));
  }, [isEdit, competitionId, token]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate slug from title unless manually edited
      if (key === "title" && !slugManuallyEdited) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Basic validation
    if (!form.title.trim()) {
      toast.error("请填写比赛标题");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("请填写比赛slug");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        seasonId: form.seasonId ? Number(form.seasonId) : null,
        competitionNumber: form.competitionNumber,
        competitionType: form.competitionType,
        participantMode: form.participantMode,
        maxParticipants: form.maxParticipants,
        minParticipants: form.minParticipants,
        registrationOpenAt: fromLocalDatetime(form.registrationOpenAt) || null,
        registrationCloseAt: fromLocalDatetime(form.registrationCloseAt) || null,
        startTime: fromLocalDatetime(form.startTime) || null,
        endTime: fromLocalDatetime(form.endTime) || null,
        prizePool: form.prizePool,
        requireMinSeasonPoints: form.requireMinSeasonPoints,
        inviteOnly: form.inviteOnly,
      };

      if (isEdit) {
        await adminUpdateCompetition(Number(competitionId), payload, token);
        toast.success("比赛已更新");
      } else {
        const result = await adminCreateCompetition(payload, token);
        toast.success(`比赛已创建 (ID: ${result.id})`);
      }
      navigate("/admin/competitions");
    } catch (err: any) {
      toast.error(err.message ?? "保存失败");
    } finally {
      setSaving(false);
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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error}</p>
          <Link href="/admin/competitions" className="inline-flex items-center gap-1 mt-4 text-[#F0B90B] text-xs font-bold hover:underline">
            <ArrowLeft className="w-3 h-3" /> 返回列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link href="/admin/competitions" className="inline-flex items-center gap-1 text-[#848E9C] text-[11px] hover:text-[#D1D4DC] transition-colors mb-4">
        <ArrowLeft className="w-3 h-3" /> 返回比赛管理
      </Link>

      <h1 className="text-xl font-display font-bold text-white mb-6">
        {isEdit ? "编辑比赛" : "创建比赛"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-display font-bold text-[#D1D4DC] mb-2">基本信息</h2>

          <div>
            <label className="block text-[10px] text-[#848E9C] mb-1">比赛标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="第X场常规赛"
              className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] placeholder-[#848E9C]/50 focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] text-[#848E9C] mb-1">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                updateField("slug", e.target.value);
              }}
              placeholder="competition-slug"
              className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] font-mono placeholder-[#848E9C]/50 focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] text-[#848E9C] mb-1">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="比赛描述（可选）"
              rows={3}
              className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] placeholder-[#848E9C]/50 focus:border-[#F0B90B]/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">赛季</label>
              <select
                value={form.seasonId}
                onChange={(e) => updateField("seasonId", e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              >
                <option value="">选择赛季</option>
                {seasons.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">比赛编号</label>
              <input
                type="number"
                value={form.competitionNumber}
                onChange={(e) => updateField("competitionNumber", Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] font-mono focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[#848E9C] mb-1">比赛类型</label>
            <select
              value={form.competitionType}
              onChange={(e) => updateField("competitionType", e.target.value)}
              className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
            >
              {COMP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[#848E9C] mb-1">参赛模式</label>
            <select
              value={form.participantMode}
              onChange={(e) => updateField("participantMode", e.target.value as "human" | "agent")}
              className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
            >
              <option value="human">Human vs Human</option>
              <option value="agent">Agent vs Agent</option>
            </select>
            <p className="mt-1 text-[10px] text-[#848E9C]">
              Agent 赛仅开放 API Key 参赛；比赛时间与奖金池按主办方需求单独配置。
            </p>
          </div>
        </div>

        {/* Participants & Prize */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-display font-bold text-[#D1D4DC] mb-2">参赛设置</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">最大参赛人数</label>
              <input
                type="number"
                value={form.maxParticipants}
                onChange={(e) => updateField("maxParticipants", Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] font-mono focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">最少参赛人数</label>
              <input
                type="number"
                value={form.minParticipants}
                onChange={(e) => updateField("minParticipants", Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] font-mono focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">奖池 (USDT)</label>
              <input
                type="number"
                value={form.prizePool}
                onChange={(e) => updateField("prizePool", Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] font-mono focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">最低赛季积分要求</label>
              <input
                type="number"
                value={form.requireMinSeasonPoints}
                onChange={(e) => updateField("requireMinSeasonPoints", Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] font-mono focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.inviteOnly}
                  onChange={(e) => updateField("inviteOnly", e.target.checked)}
                  className="w-4 h-4 rounded border-[rgba(255,255,255,0.08)] bg-white/[0.03] text-[#F0B90B] focus:ring-[#F0B90B]/50"
                />
                <span className="text-[11px] text-[#D1D4DC]">仅限邀请</span>
              </label>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-display font-bold text-[#D1D4DC] mb-2">时间安排</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">报名开始时间</label>
              <input
                type="datetime-local"
                value={form.registrationOpenAt}
                onChange={(e) => updateField("registrationOpenAt", e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">报名截止时间</label>
              <input
                type="datetime-local"
                value={form.registrationCloseAt}
                onChange={(e) => updateField("registrationCloseAt", e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">比赛开始时间</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => updateField("startTime", e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#848E9C] mb-1">比赛结束时间</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => updateField("endTime", e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F0B90B] text-[#0B0E11] text-sm font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
            ) : (
              <><Save className="w-4 h-4" /> {isEdit ? "更新比赛" : "创建比赛"}</>
            )}
          </button>
          <Link
            href="/admin/competitions"
            className="px-4 py-2.5 text-sm text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
