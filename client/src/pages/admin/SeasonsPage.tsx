import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSeasons, adminCreateSeason } from "@/lib/competition-api";
import type { SeasonSummary } from "@shared/competitionTypes";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Plus,
  Calendar,
  ChevronUp,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "#0ECB81",
  upcoming: "#F0B90B",
  completed: "#848E9C",
  draft: "#5E6673",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface CreateFormData {
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
}

const INITIAL_FORM: CreateFormData = {
  name: "",
  slug: "",
  startDate: "",
  endDate: "",
};

export default function AdminSeasonsPage() {
  const { token } = useAuth();
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getSeasons()
      .then((data) => {
        setSeasons(data);
        setError(null);
      })
      .catch((err) => setError(err.message ?? "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateField = <K extends keyof CreateFormData>(key: K, value: CreateFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugManuallyEdited) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!form.name.trim()) {
      toast.error("请填写赛季名称");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("请填写赛季slug");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("请填写开始和结束日期");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        startDate: new Date(form.startDate).getTime(),
        endDate: new Date(form.endDate).getTime(),
      };
      const result = await adminCreateSeason(payload, token);
      toast.success(`赛季已创建 (ID: ${result.id})`);
      setForm(INITIAL_FORM);
      setSlugManuallyEdited(false);
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold text-white">赛季管理</h1>
          <p className="text-[#848E9C] text-[11px] mt-0.5">管理月度赛季</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F0B90B] text-[#0B0E11] text-xs font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
        >
          {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "收起" : "创建赛季"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 mb-5">
          <h2 className="text-xs font-display font-bold text-[#D1D4DC] mb-4">创建新赛季</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[#848E9C] mb-1">赛季名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="2026年3月赛季"
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
                  placeholder="2026-03"
                  className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] font-mono placeholder-[#848E9C]/50 focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[#848E9C] mb-1">开始日期 *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#848E9C] mb-1">结束日期 *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#F0B90B] text-[#0B0E11] text-xs font-bold rounded-lg hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 创建中...</>
                ) : (
                  <><Plus className="w-3.5 h-3.5" /> 创建赛季</>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(INITIAL_FORM);
                  setSlugManuallyEdited(false);
                }}
                className="px-4 py-2 text-xs text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Seasons list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#F6465D] mx-auto mb-3" />
          <p className="text-[#D1D4DC] text-sm">{error}</p>
        </div>
      ) : seasons.length === 0 ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <Calendar className="w-8 h-8 text-[#848E9C] mx-auto mb-3" />
          <p className="text-[#848E9C] text-sm">暂无赛季。点击上方按钮创建第一个赛季。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map((season: any) => {
            const statusColor = STATUS_COLORS[season.status] ?? "#848E9C";
            return (
              <div
                key={season.id}
                className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.15)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#848E9C] text-[10px] font-mono">#{season.id}</span>
                      <span className="text-[#D1D4DC] text-sm font-display font-bold">{season.name}</span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                      >
                        {season.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-[#848E9C]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(season.startDate)} - {formatDate(season.endDate)}
                      </span>
                      <span className="font-mono text-[#848E9C]">slug: {season.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-[#848E9C]">比赛数</p>
                      <p className="text-sm font-mono font-bold text-[#D1D4DC]">
                        {season.completedCount ?? 0}/{season.competitionCount ?? 0}
                      </p>
                    </div>
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
