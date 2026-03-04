import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";

interface InstitutionRow {
  institutionId: number | null;
  name: string;
  country: string;
  memberCount: number;
  totalPrize: number;
  avgPnlPct: number;
  competitionCount: number;
  bestRank: number;
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function InstitutionStatsPage() {
  const [data, setData] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sort, setSort] = useState<"members" | "pnl" | "prize">("members");

  useEffect(() => {
    apiRequest<InstitutionRow[]>("/api/stats/institutions?limit=50")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...data].sort((a, b) => {
    if (sort === "members") return b.memberCount - a.memberCount;
    if (sort === "pnl") return b.avgPnlPct - a.avgPnlPct;
    return b.totalPrize - a.totalPrize;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-display font-bold text-white mb-1">高校/机构排行</h1>
        <p className="text-[#848E9C] text-sm">按高校和机构的参赛数据排名</p>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-2">
        {([
          { key: "members", label: "按人数" },
          { key: "pnl", label: "按表现" },
          { key: "prize", label: "按奖金" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              sort === key
                ? "bg-[#F0B90B]/10 text-[#F0B90B] border border-[#F0B90B]/30"
                : "text-[#848E9C] hover:text-[#D1D4DC] border border-[rgba(255,255,255,0.08)] hover:bg-white/[0.03]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 animate-pulse h-16" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <Building2 className="w-8 h-8 text-[#5E6673] mx-auto mb-2" />
          <p className="text-[#848E9C] text-sm">暂无高校/机构数据</p>
          <p className="text-[#5E6673] text-xs mt-1">当参赛者在个人资料中填写学校信息后，数据会自动统计</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((row, i) => (
            <div key={row.name + i} className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === i ? null : i)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[#848E9C] font-mono text-sm w-8 text-right shrink-0">#{i + 1}</span>
                <span className="text-xl leading-none">{countryFlag(row.country)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[#D1D4DC] text-sm font-semibold truncate">{row.name}</div>
                  <div className="text-[#848E9C] text-[10px]">{row.memberCount}名选手 · {row.competitionCount}场参赛</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-mono text-sm font-bold ${row.avgPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {row.avgPnlPct > 0 ? "+" : ""}{row.avgPnlPct}%
                  </div>
                  {row.totalPrize > 0 && (
                    <div className="text-[#F0B90B] font-mono text-[10px]">{row.totalPrize}U</div>
                  )}
                </div>
                {expandedId === i ? <ChevronUp className="w-4 h-4 text-[#848E9C] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#848E9C] shrink-0" />}
              </button>

              {expandedId === i && (
                <div className="px-5 pb-4 border-t border-[rgba(255,255,255,0.06)] pt-3">
                  <div className="grid grid-cols-4 gap-3 text-center text-[10px]">
                    <div>
                      <div className="text-[#848E9C]">选手人数</div>
                      <div className="text-white font-mono font-bold">{row.memberCount}</div>
                    </div>
                    <div>
                      <div className="text-[#848E9C]">参赛场次</div>
                      <div className="text-white font-mono font-bold">{row.competitionCount}</div>
                    </div>
                    <div>
                      <div className="text-[#848E9C]">最佳名次</div>
                      <div className="text-[#F0B90B] font-mono font-bold">#{row.bestRank}</div>
                    </div>
                    <div>
                      <div className="text-[#848E9C]">总奖金</div>
                      <div className="text-[#F0B90B] font-mono font-bold">{row.totalPrize}U</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
