import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { useCountryStats, useInstitutions, useStatsOverview } from "@/hooks/useCompetitionData";
import {
  BarChart3,
  Building2,
  ChevronRight,
  DollarSign,
  Globe,
  Trophy,
  Users,
} from "lucide-react";

interface OverviewStats {
  totalPlayers: number;
  totalTrades: number;
  totalCompetitions: number;
  totalPrize: number;
  totalCountries: number;
  totalInstitutions: number;
}

interface CountryRow {
  country: string;
  participantCount: number;
  totalPrize: number;
  avgPnlPct: number;
  competitionCount: number;
}

interface InstitutionRow {
  institutionId: number | null;
  name: string;
  country: string;
  memberCount: number;
  totalPrize: number;
  avgPnlPct: number;
  bestRank: number;
}

const PAGE_CLASS =
  "rounded-[28px] border border-white/[0.08] bg-[#151A24] shadow-[0_18px_60px_rgba(0,0,0,0.28)]";

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return code.toUpperCase().replace(/./g, (char) =>
    String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

const COUNTRY_NAMES: Record<string, { zh: string; en: string }> = {
  CN: { zh: "中国", en: "China" },
  US: { zh: "美国", en: "United States" },
  JP: { zh: "日本", en: "Japan" },
  KR: { zh: "韩国", en: "South Korea" },
  SG: { zh: "新加坡", en: "Singapore" },
  HK: { zh: "中国香港", en: "Hong Kong" },
  TW: { zh: "中国台湾", en: "Taiwan" },
  GB: { zh: "英国", en: "United Kingdom" },
  DE: { zh: "德国", en: "Germany" },
  FR: { zh: "法国", en: "France" },
  AU: { zh: "澳大利亚", en: "Australia" },
  CA: { zh: "加拿大", en: "Canada" },
  IN: { zh: "印度", en: "India" },
  BR: { zh: "巴西", en: "Brazil" },
  RU: { zh: "俄罗斯", en: "Russia" },
  MY: { zh: "马来西亚", en: "Malaysia" },
  TH: { zh: "泰国", en: "Thailand" },
  VN: { zh: "越南", en: "Vietnam" },
  ID: { zh: "印度尼西亚", en: "Indonesia" },
  PH: { zh: "菲律宾", en: "Philippines" },
  AE: { zh: "阿联酋", en: "UAE" },
  TR: { zh: "土耳其", en: "Turkey" },
  NL: { zh: "荷兰", en: "Netherlands" },
  CH: { zh: "瑞士", en: "Switzerland" },
  ES: { zh: "西班牙", en: "Spain" },
  IT: { zh: "意大利", en: "Italy" },
  SE: { zh: "瑞典", en: "Sweden" },
  NO: { zh: "挪威", en: "Norway" },
  FI: { zh: "芬兰", en: "Finland" },
  DK: { zh: "丹麦", en: "Denmark" },
  PL: { zh: "波兰", en: "Poland" },
  NG: { zh: "尼日利亚", en: "Nigeria" },
  ZA: { zh: "南非", en: "South Africa" },
  MX: { zh: "墨西哥", en: "Mexico" },
  AR: { zh: "阿根廷", en: "Argentina" },
  CL: { zh: "智利", en: "Chile" },
  CO: { zh: "哥伦比亚", en: "Colombia" },
  NZ: { zh: "新西兰", en: "New Zealand" },
  IL: { zh: "以色列", en: "Israel" },
  PT: { zh: "葡萄牙", en: "Portugal" },
};

function getCountryName(code: string, lang: string): string {
  const entry = COUNTRY_NAMES[code.toUpperCase()];
  if (entry) return lang === "zh" ? entry.zh : entry.en;
  return code.toUpperCase();
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  toneClass = "text-white",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#7E899B]">{label}</p>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0B90B]/12 text-[#F0B90B]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-4 text-2xl font-display font-bold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-[#8E98A8]">{hint}</p> : null}
    </div>
  );
}

function RankingRow({
  rank,
  flag,
  title,
  subtitle,
  members,
  metric,
}: {
  rank: number;
  flag: string;
  title: string;
  subtitle: string;
  members: string;
  metric: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3">
      <span className="w-8 text-center font-mono text-sm text-[#8E98A8]">#{rank}</span>
      <span className="text-xl leading-none">{flag}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-[#8E98A8]">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono text-[#D1D4DC]">{members}</p>
        <p className={`text-xs font-mono ${metric.startsWith("-") ? "text-[#F6465D]" : "text-[#0ECB81]"}`}>
          {metric}
        </p>
      </div>
    </div>
  );
}

export default function StatsOverviewPage() {
  const { t, lang } = useT();
  const { data: overview, isLoading } = useStatsOverview();
  const { data: countriesData = [] } = useCountryStats();
  const { data: institutionsData = [] } = useInstitutions(10);

  const ov = overview as OverviewStats | undefined;
  const countries = countriesData as CountryRow[];
  const institutions = institutionsData as InstitutionRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <section className={`${PAGE_CLASS} p-6 md:p-7`}>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#F0B90B]">
              {lang === "zh" ? "统计总览" : "Stats overview"}
            </p>
            <h1 className="mt-3 text-3xl font-display font-bold text-white">{t("statspage.title")}</h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={Users}
                label={t("statspage.totalPlayers")}
                value={isLoading ? "..." : String(ov?.totalPlayers ?? 0)}
              />
              <MetricCard
                icon={Trophy}
                label={t("statspage.totalComps")}
                value={isLoading ? "..." : String(ov?.totalCompetitions ?? 0)}
                toneClass="text-[#F0B90B]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              icon={BarChart3}
              label={t("statspage.totalTrades")}
              value={isLoading ? "..." : (ov?.totalTrades ?? 0).toLocaleString()}
            />
            <MetricCard
              icon={DollarSign}
              label={t("statspage.totalPrize")}
              value={isLoading ? "..." : `${ov?.totalPrize ?? 0}U`}
              toneClass="text-[#0ECB81]"
            />
            <MetricCard
              icon={Globe}
              label={t("statspage.countries")}
              value={isLoading ? "..." : String(ov?.totalCountries ?? 0)}
            />
            <MetricCard
              icon={Building2}
              label={t("statspage.institutions")}
              value={isLoading ? "..." : String(ov?.totalInstitutions ?? 0)}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={`${PAGE_CLASS} p-6`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "国家分布" : "Country ranking"}
              </p>
              <h2 className="mt-2 text-xl font-display font-bold text-white">{t("statspage.countryRanking")}</h2>
            </div>
          </div>

          {countries.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-10 text-center text-sm text-[#848E9C]">
              {t("common.noData")}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {countries.slice(0, 10).map((row, index) => (
                <RankingRow
                  key={row.country}
                  rank={index + 1}
                  flag={countryFlag(row.country)}
                  title={getCountryName(row.country, lang)}
                  subtitle={
                    lang === "zh"
                      ? `${row.competitionCount} 场比赛 · 奖金 ${row.totalPrize}U`
                      : `${row.competitionCount} competitions · ${row.totalPrize}U prize`
                  }
                  members={t("common.people", { n: row.participantCount })}
                  metric={`${row.avgPnlPct > 0 ? "+" : ""}${row.avgPnlPct}%`}
                />
              ))}
            </div>
          )}
        </section>

        <section className={`${PAGE_CLASS} p-6`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "机构分布" : "Institution ranking"}
              </p>
              <h2 className="mt-2 text-xl font-display font-bold text-white">{t("statspage.instRanking")}</h2>
            </div>

            <Link
              href="/stats/institutions"
              className="inline-flex items-center gap-1 text-sm text-[#F0B90B] hover:underline"
            >
              {t("common.viewAll")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {institutions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-10 text-center text-sm text-[#848E9C]">
              {t("common.noData")}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {institutions.map((row, index) => (
                <RankingRow
                  key={`${row.name}-${index}`}
                  rank={index + 1}
                  flag={countryFlag(row.country)}
                  title={row.name}
                  subtitle={
                    lang === "zh"
                      ? `最佳名次 ${row.bestRank > 0 ? `#${row.bestRank}` : "--"} · 奖金 ${row.totalPrize}U`
                      : `Best finish ${row.bestRank > 0 ? `#${row.bestRank}` : "--"} · ${row.totalPrize}U prize`
                  }
                  members={t("common.people", { n: row.memberCount })}
                  metric={`${row.avgPnlPct > 0 ? "+" : ""}${row.avgPnlPct}%`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
