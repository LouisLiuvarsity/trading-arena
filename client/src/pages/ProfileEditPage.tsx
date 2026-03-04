import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, Search, Check } from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  arenaAccountId: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  institutionId: number | null;
  institutionName: string | null;
  department: string | null;
  graduationYear: number | null;
  participantType: string;
}

interface Institution {
  id: number;
  name: string;
  nameEn: string | null;
  shortName: string | null;
  type: string;
  country: string;
  region: string | null;
  city: string | null;
}

const COUNTRIES = [
  { code: "CN", label: "中国" },
  { code: "US", label: "美国" },
  { code: "JP", label: "日本" },
  { code: "KR", label: "韩国" },
  { code: "HK", label: "香港" },
  { code: "TW", label: "台湾" },
  { code: "SG", label: "新加坡" },
  { code: "GB", label: "英国" },
  { code: "DE", label: "德国" },
  { code: "FR", label: "法国" },
  { code: "CA", label: "加拿大" },
  { code: "AU", label: "澳大利亚" },
];

const PARTICIPANT_TYPES = [
  { value: "student", label: "学生" },
  { value: "professional", label: "职业人士" },
  { value: "independent", label: "独立交易者" },
];

export default function ProfileEditPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [participantType, setParticipantType] = useState("independent");
  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [institutionName, setInstitutionName] = useState("");
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  // Institution search
  const [instSearchQuery, setInstSearchQuery] = useState("");
  const [instSearchResults, setInstSearchResults] = useState<Institution[]>([]);
  const [instSearchOpen, setInstSearchOpen] = useState(false);
  const [instSearchLoading, setInstSearchLoading] = useState(false);
  const instSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instDropdownRef = useRef<HTMLDivElement>(null);

  // Load current profile
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiRequest<ProfileData>("/api/me/profile", { token });
        if (!cancelled) {
          setDisplayName(data.displayName ?? "");
          setBio(data.bio ?? "");
          setCountry(data.country ?? "");
          setRegion(data.region ?? "");
          setCity(data.city ?? "");
          setParticipantType(data.participantType ?? "independent");
          setInstitutionId(data.institutionId ?? null);
          setInstitutionName(data.institutionName ?? "");
          setInstSearchQuery(data.institutionName ?? "");
          setDepartment(data.department ?? "");
          setGraduationYear(data.graduationYear ? String(data.graduationYear) : "");
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Institution search with debounce
  const searchInstitutions = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setInstSearchResults([]);
      return;
    }
    setInstSearchLoading(true);
    try {
      const results = await apiRequest<Institution[]>(
        `/api/institutions/search?q=${encodeURIComponent(query)}&limit=10`,
        { token }
      );
      setInstSearchResults(results);
    } catch {
      setInstSearchResults([]);
    } finally {
      setInstSearchLoading(false);
    }
  }, [token]);

  function handleInstSearchChange(value: string) {
    setInstSearchQuery(value);
    setInstSearchOpen(true);
    // Clear current selection if user types
    setInstitutionId(null);
    setInstitutionName(value);

    if (instSearchTimeoutRef.current) {
      clearTimeout(instSearchTimeoutRef.current);
    }
    instSearchTimeoutRef.current = setTimeout(() => {
      searchInstitutions(value);
    }, 300);
  }

  function selectInstitution(inst: Institution) {
    setInstitutionId(inst.id);
    setInstitutionName(inst.name);
    setInstSearchQuery(inst.name);
    setInstSearchOpen(false);
  }

  // Close institution dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (instDropdownRef.current && !instDropdownRef.current.contains(e.target as Node)) {
        setInstSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Save handler
  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      await apiRequest("/api/me/profile", {
        method: "PUT",
        token,
        body: {
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
          country: country || null,
          region: region.trim() || null,
          city: city.trim() || null,
          participantType,
          institutionId: institutionId ?? null,
          institutionName: institutionName.trim() || null,
          department: department.trim() || null,
          graduationYear: graduationYear ? Number(graduationYear) : null,
        },
      });
      toast.success("个人资料已保存");
      navigate("/profile");
    } catch (err) {
      toast.error((err as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">加载失败</p>
          <p className="text-[#848E9C] text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#D1D4DC] placeholder-[#848E9C]/50 focus:outline-none focus:border-[#F0B90B]/40 transition-colors";
  const labelCls = "block text-[11px] text-[#848E9C] mb-1.5 font-medium";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-display font-bold text-white">编辑个人资料</h1>
      </div>

      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-5">
        {/* Display Name */}
        <div>
          <label className={labelCls}>显示名称</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="输入显示名称..."
            maxLength={64}
            className={inputCls}
          />
        </div>

        {/* Bio */}
        <div>
          <label className={labelCls}>
            个人简介
            <span className="ml-2 text-[9px] text-[#848E9C]/60">
              {bio.length}/280
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 280))}
            placeholder="简单介绍自己..."
            maxLength={280}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Country */}
        <div>
          <label className={labelCls}>国家/地区</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputCls}
          >
            <option value="">选择国家/地区</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Region + City */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>省/州</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="如: 北京"
              maxLength={64}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>城市</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="如: 海淀区"
              maxLength={64}
              className={inputCls}
            />
          </div>
        </div>

        {/* Participant Type */}
        <div>
          <label className={labelCls}>参赛身份</label>
          <div className="flex gap-3">
            {PARTICIPANT_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setParticipantType(pt.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-[11px] font-medium transition-colors ${
                  participantType === pt.value
                    ? "border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]"
                    : "border-[rgba(255,255,255,0.08)] text-[#848E9C] hover:border-[rgba(255,255,255,0.15)]"
                }`}
              >
                {participantType === pt.value && <Check className="w-3 h-3 inline mr-1" />}
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Institution Search */}
        <div className="relative" ref={instDropdownRef}>
          <label className={labelCls}>学校/机构</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848E9C]" />
            <input
              type="text"
              value={instSearchQuery}
              onChange={(e) => handleInstSearchChange(e.target.value)}
              onFocus={() => {
                if (instSearchQuery.trim().length > 0) {
                  setInstSearchOpen(true);
                  searchInstitutions(instSearchQuery);
                }
              }}
              placeholder="搜索学校或机构名称..."
              className={`${inputCls} pl-9`}
            />
            {instSearchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848E9C] animate-spin" />
            )}
          </div>
          {instSearchOpen && instSearchResults.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-[#1C2030] border border-[rgba(255,255,255,0.12)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {instSearchResults.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => selectInstitution(inst)}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-[rgba(255,255,255,0.04)] last:border-0"
                >
                  <div className="text-[11px] text-[#D1D4DC]">{inst.name}</div>
                  {inst.nameEn && (
                    <div className="text-[9px] text-[#848E9C]">{inst.nameEn}</div>
                  )}
                  <div className="text-[9px] text-[#848E9C]">
                    {inst.city ?? inst.region ?? ""} · {inst.type}
                  </div>
                </button>
              ))}
            </div>
          )}
          {instSearchOpen && instSearchQuery.trim().length > 0 && instSearchResults.length === 0 && !instSearchLoading && (
            <div className="absolute z-20 top-full mt-1 w-full bg-[#1C2030] border border-[rgba(255,255,255,0.12)] rounded-lg shadow-xl p-3 text-center">
              <p className="text-[10px] text-[#848E9C]">未找到匹配的机构</p>
              <p className="text-[9px] text-[#848E9C]/60 mt-1">将使用手动输入的名称</p>
            </div>
          )}
        </div>

        {/* Department + Graduation Year */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>院系/部门</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="如: 计算机科学"
              maxLength={128}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>毕业年份</label>
            <input
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              placeholder="如: 2026"
              min={1990}
              max={2040}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="flex-1 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-[#848E9C] text-sm hover:border-[rgba(255,255,255,0.15)] transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#F0B90B] text-[#0B0E11] text-sm font-bold hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              保存中...
            </span>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </div>
  );
}
