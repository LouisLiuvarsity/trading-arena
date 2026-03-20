import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useProfile, useSaveProfile } from "@/hooks/useCompetitionData";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Loader2, Search, Check, Wallet } from "lucide-react";
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
  walletAddress: string | null;
  walletNetwork: string | null;
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
  { code: "CN" },
  { code: "US" },
  { code: "JP" },
  { code: "KR" },
  { code: "HK" },
  { code: "TW" },
  { code: "SG" },
  { code: "GB" },
  { code: "DE" },
  { code: "FR" },
  { code: "CA" },
  { code: "AU" },
];

const PARTICIPANT_TYPES = [
  { value: "student" },
  { value: "professional" },
  { value: "independent" },
];

const WALLET_NETWORKS = [
  { value: "base", label: "Base" },
  { value: "eth", label: "Ethereum (ERC-20)" },
  { value: "sol", label: "Solana" },
  { value: "bnb", label: "BNB Smart Chain (BEP-20)" },
  { value: "trx", label: "Tron (TRC-20)" },
];

export default function ProfileEditPage() {
  const { token } = useAuth();
  const { t } = useT();
  const [, navigate] = useLocation();

  const { data: profileData, isLoading: profileLoading, error: profileError } = useProfile();
  const saveProfileMutation = useSaveProfile();

  const [saving, setSaving] = useState(false);

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

  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");

  const [instSearchQuery, setInstSearchQuery] = useState("");
  const [instSearchResults, setInstSearchResults] = useState<Institution[]>([]);
  const [instSearchOpen, setInstSearchOpen] = useState(false);
  const [instSearchLoading, setInstSearchLoading] = useState(false);
  const instSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instDropdownRef = useRef<HTMLDivElement>(null);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profileData && !initialized) {
      const data = profileData as ProfileData;
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
      setWalletAddress(data.walletAddress ?? "");
      setWalletNetwork(data.walletNetwork ?? "");
      setInitialized(true);
    }
  }, [profileData, initialized]);

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (instDropdownRef.current && !instDropdownRef.current.contains(e.target as Node)) {
        setInstSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      await saveProfileMutation.mutateAsync({
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
        walletAddress: walletAddress.trim() || null,
        walletNetwork: walletNetwork || null,
      });
      toast.success(t('profileEdit.saved'));
      navigate("/profile");
    } catch (err) {
      toast.error((err as Error).message || t('profileEdit.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">{t('common.loadFailed')}</p>
          <p className="text-[#848E9C] text-xs">{(profileError as Error).message}</p>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#D1D4DC] placeholder-[#848E9C]/50 focus:outline-none focus:border-[#F0B90B]/40 transition-colors";
  const labelCls = "block text-[11px] text-[#848E9C] mb-1.5 font-medium";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-display font-bold text-white">{t('profileEdit.title')}</h1>
      </div>

      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-5">
        <div>
          <label className={labelCls}>{t('profileEdit.displayName')}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('profileEdit.displayNamePh')}
            maxLength={64}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            {t('profileEdit.bio')}
            <span className="ml-2 text-[9px] text-[#848E9C]/60">
              {bio.length}/280
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 280))}
            placeholder={t('profileEdit.bioPh')}
            maxLength={280}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className={labelCls}>{t('profileEdit.country')}</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputCls}
          >
            <option value="">{t('profileEdit.countryPh')}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {t('profileEdit.country.' + c.code)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('profileEdit.region')}</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={t('profileEdit.regionPh')}
              maxLength={64}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t('profileEdit.city')}</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t('profileEdit.cityPh')}
              maxLength={64}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('profileEdit.participantType')}</label>
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
                {t('profileEdit.' + pt.value)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative" ref={instDropdownRef}>
          <label className={labelCls}>{t('profileEdit.institution')}</label>
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
              placeholder={t('profileEdit.institutionPh')}
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
              <p className="text-[10px] text-[#848E9C]">{t('profileEdit.noInstitution')}</p>
              <p className="text-[9px] text-[#848E9C]/60 mt-1">{t('profileEdit.manualInput')}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('profileEdit.department')}</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={t('profileEdit.departmentPh')}
              maxLength={128}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t('profileEdit.gradYear')}</label>
            <input
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              placeholder={t('profileEdit.gradYearPh')}
              min={1990}
              max={2040}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-[#F0B90B]" />
          <h2 className="text-sm font-display font-bold text-[#D1D4DC]">{t('profileEdit.walletTitle')}</h2>
        </div>
        <p className="text-[11px] text-[#848E9C] leading-relaxed">{t('profileEdit.walletDesc')}</p>

        <div>
          <label className={labelCls}>{t('profileEdit.walletNetwork')}</label>
          <select
            value={walletNetwork}
            onChange={(e) => setWalletNetwork(e.target.value)}
            className={inputCls}
          >
            <option value="">{t('profileEdit.walletNetworkPh')}</option>
            {WALLET_NETWORKS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>{t('profileEdit.walletAddress')}</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder={t('profileEdit.walletAddressPh')}
            className={`${inputCls} font-mono text-[12px]`}
          />
        </div>

        <p className="text-[10px] text-[#F0B90B]/70 leading-relaxed">
          {t('profileEdit.walletEligibility')}
        </p>

        {/* Withdrawal History */}
        <div className="border-t border-white/[0.06] pt-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-[#7AA2F7]" />
            <h3 className="text-[11px] font-semibold text-[#D1D4DC]">{t('profileEdit.withdrawHistory')}</h3>
          </div>
          <div className="rounded-lg border border-dashed border-white/[0.08] bg-[#0B0E11]/60 px-4 py-6 text-center">
            <Wallet className="mx-auto h-6 w-6 text-[#7D8899]/60" />
            <p className="mt-2 text-[11px] text-[#848E9C]">{t('profileEdit.noWithdrawals')}</p>
            <p className="mt-1 text-[10px] text-[#848E9C]/60">{t('profileEdit.noWithdrawalsHint')}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="flex-1 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-[#848E9C] text-sm hover:border-[rgba(255,255,255,0.15)] transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#F0B90B] text-[#0B0E11] text-sm font-bold hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('common.saving')}
            </span>
          ) : (
            t('common.save')
          )}
        </button>
      </div>
    </div>
  );
}
