import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { useMatchHistory, useProfile } from "@/hooks/useCompetitionData";
import { Link } from "wouter";
import {
  Award,
  BarChart3,
  Bot,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Shield,
  Trophy,
} from "lucide-react";
import { getRankTier } from "@/lib/types";

interface ProfileData {
  arenaAccountId: number;
  username: string;
  seasonPoints: number;
  capital: number;
  displayName: string | null;
  bio: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  institutionName: string | null;
  department: string | null;
  participantType: string;
}

interface MatchResult {
  id: number;
  competitionId: number;
  finalRank: number;
  totalPnl: number;
  totalPnlPct: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  pointsEarned: number;
  prizeWon: number;
  avgHoldDuration: number | null;
  createdAt: number;
}

const PAGE_CLASS =
  "rounded-[28px] border border-white/[0.08] bg-[#151A24] shadow-[0_18px_60px_rgba(0,0,0,0.28)]";

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset);
}

function formatDate(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(ts);
}

function formatDuration(seconds: number): string {
  if (!seconds) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h${rem > 0 ? `${rem}m` : ""}`;
}

function formatSigned(value: number, digits = 0): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function InsightCard({
  label,
  value,
  hint,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  hint?: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7E899B]">{label}</p>
      <p className={`mt-3 text-2xl font-display font-bold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-[#8E98A8]">{hint}</p> : null}
    </div>
  );
}

function QuickLinkCard({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.08] bg-[#111723] p-4 transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0B90B]/12 text-[#F0B90B]">
          {icon}
        </span>
        <ChevronRight className="h-4 w-4 text-[#677283] transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#8E98A8]">{hint}</p>
    </Link>
  );
}

export default function ProfilePage() {
  const { t, lang } = useT();
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: historyData, isLoading: historyLoading } = useMatchHistory(5);
  const locale = lang === "zh" ? "zh-CN" : "en-US";

  const loading = profileLoading || historyLoading;
  const historyResponse = historyData as { results?: MatchResult[] } | MatchResult[] | undefined;
  const history: MatchResult[] = Array.isArray(historyResponse) ? historyResponse : historyResponse?.results ?? [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className={`${PAGE_CLASS} p-8 text-center`}>
          <p className="text-sm text-[#F6465D]">{t("common.loadFailed")}</p>
          <p className="mt-2 text-xs text-[#848E9C]">{(profileError as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const p = profile as ProfileData;
  const tier = getRankTier(p.seasonPoints);
  const totalMatches = history.length;
  const totalPnl = history.reduce((sum, item) => sum + item.totalPnl, 0);
  const totalWins = history.reduce((sum, item) => sum + (item.winCount ?? 0), 0);
  const totalLosses = history.reduce((sum, item) => sum + (item.lossCount ?? 0), 0);
  const winRate = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0;
  const totalPrize = history.reduce((sum, item) => sum + (item.prizeWon ?? 0), 0);
  const bestRank = history.length > 0 ? Math.min(...history.map((item) => item.finalRank)) : null;
  const avgHoldDuration = history.length > 0
    ? history.reduce((sum, item) => sum + (item.avgHoldDuration ?? 0), 0) / history.length
    : 0;

  const locationParts: string[] = [];
  if (p.country) locationParts.push(t(`profileEdit.country.${p.country}`));
  if (p.region) locationParts.push(p.region);
  if (p.city) locationParts.push(p.city);

  const institutionParts: string[] = [];
  if (p.institutionName) institutionParts.push(p.institutionName);
  if (p.department) institutionParts.push(p.department);

  const participantLabel =
    p.participantType === "agent"
      ? lang === "zh"
        ? "Agent 账号"
        : "Agent account"
      : lang === "zh"
        ? "Human 账号"
        : "Human account";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className={`${PAGE_CLASS} p-6 md:p-7`}>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#F0B90B]">
                  {lang === "zh" ? "个人中心" : "Profile"}
                </p>
                <h1 className="mt-3 text-3xl font-display font-bold text-white">
                  {p.displayName || p.username}
                </h1>
                {p.displayName ? <p className="mt-1 text-sm text-[#8E98A8]">@{p.username}</p> : null}
              </div>

              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-[#D1D4DC] transition-colors hover:bg-white/[0.04]"
              >
                <Pencil className="h-4 w-4" />
                {t("profile.editProfile")}
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: `${tier.color}33`, color: tier.color, backgroundColor: `${tier.color}14` }}
              >
                <span>{tier.icon}</span>
                {tier.label}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D1D4DC]">
                {participantLabel}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D1D4DC]">
                {Math.round(p.seasonPoints)} pts
              </span>
            </div>

            {locationParts.length > 0 ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-[#D1D4DC]">
                <MapPin className="h-4 w-4 text-[#7E899B]" />
                <span>{countryFlag(p.country)} {locationParts.join(" · ")}</span>
              </div>
            ) : null}

            {institutionParts.length > 0 ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-[#D1D4DC]">
                <Shield className="h-4 w-4 text-[#7E899B]" />
                <span>{institutionParts.join(" · ")}</span>
              </div>
            ) : null}

            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#8E98A8]">
              {p.bio ||
                (lang === "zh"
                  ? "补充你的背景、交易风格和关注方向，其他参赛者会更容易理解你的定位。"
                  : "Add your background, trading style, and focus areas so others can understand your profile quickly.")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InsightCard
              label={lang === "zh" ? "赛季积分" : "Season points"}
              value={`${Math.round(p.seasonPoints)}`}
              hint={`${tier.icon} ${tier.label}`}
              toneClass="text-[#F0B90B]"
            />
            <InsightCard
              label={lang === "zh" ? "账户资金" : "Capital"}
              value={`${p.capital.toFixed(0)}U`}
              hint={lang === "zh" ? "当前比赛账户资金" : "Current arena capital"}
              toneClass="text-[#0ECB81]"
            />
            <InsightCard
              label={lang === "zh" ? "最近比赛数" : "Recent matches"}
              value={String(totalMatches)}
              hint={lang === "zh" ? "基于最近可见记录" : "Based on recent visible records"}
            />
            <InsightCard
              label={lang === "zh" ? "累计奖金" : "Prize won"}
              value={`${totalPrize.toFixed(0)}U`}
              hint={
                bestRank
                  ? lang === "zh"
                    ? `最佳成绩 #${bestRank}`
                    : `Best finish #${bestRank}`
                  : lang === "zh"
                    ? "暂无完赛成绩"
                    : "No completed results yet"
              }
              toneClass="text-white"
            />
          </div>
        </div>
      </section>

      <section className={`${PAGE_CLASS} p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
              {lang === "zh" ? "赛季概览" : "Season snapshot"}
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-white">
              {lang === "zh" ? "先看这 4 个关键指标" : "Four numbers that matter first"}
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#8E98A8]">
            {lang === "zh"
              ? "把胜率、收益、持仓时长和最好名次放到同一行，判断状态时不需要来回翻。"
              : "Win rate, PnL, holding time, and best finish are grouped so the current state is obvious immediately."}
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            label={t("profile.winRate")}
            value={`${winRate.toFixed(1)}%`}
            hint={`${totalWins}-${totalLosses}`}
            toneClass="text-[#0ECB81]"
          />
          <InsightCard
            label={t("profile.totalPnl")}
            value={formatSigned(totalPnl, 0)}
            hint={lang === "zh" ? "最近比赛累计" : "Across recent matches"}
            toneClass={totalPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
          />
          <InsightCard
            label={t("profile.avgHold")}
            value={formatDuration(avgHoldDuration)}
            hint={lang === "zh" ? "平均持仓时长" : "Average hold duration"}
          />
          <InsightCard
            label={t("profile.best")}
            value={bestRank ? `#${bestRank}` : "--"}
            hint={lang === "zh" ? `杠杆上限 ${tier.leverage}x` : `Tier leverage ${tier.leverage}x`}
            toneClass="text-[#F0B90B]"
          />
        </div>
      </section>

      <section className={`${PAGE_CLASS} p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
              {lang === "zh" ? "快捷入口" : "Quick actions"}
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-white">
              {lang === "zh" ? "按任务进入，不用先想菜单在哪" : "Go straight to the task you want"}
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickLinkCard
            href="/history"
            icon={<Trophy className="h-4 w-4" />}
            title={t("profile.matchHistory")}
            hint={lang === "zh" ? "查看比赛结果和积分变化" : "Review results and point changes"}
          />
          <QuickLinkCard
            href="/profile/analytics"
            icon={<BarChart3 className="h-4 w-4" />}
            title={t("profile.analytics")}
            hint={lang === "zh" ? "查看收益、命中率和操作习惯" : "Inspect PnL, hit rate, and behavior"}
          />
          <QuickLinkCard
            href="/profile/achievements"
            icon={<Award className="h-4 w-4" />}
            title={t("profile.achievements")}
            hint={lang === "zh" ? "查看徽章、阶段成就和解锁进度" : "See badges, milestones, and unlock progress"}
          />
          <QuickLinkCard
            href="/agents"
            icon={<Bot className="h-4 w-4" />}
            title={lang === "zh" ? "用户中心" : "Agent Center"}
            hint={lang === "zh" ? "查看绑定 Agent 的历史和 API key" : "Open your bound agent console and API key"}
          />
        </div>
      </section>

      <section className={`${PAGE_CLASS} overflow-hidden`}>
        <div className="border-b border-white/[0.08] px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
            {lang === "zh" ? "最近结果" : "Recent results"}
          </p>
          <h2 className="mt-2 text-xl font-display font-bold text-white">{t("profile.recentMatches")}</h2>
          <p className="mt-1 text-sm text-[#8E98A8]">
            {lang === "zh"
              ? "每场只保留最有用的信息：名次、收益、积分、日期。"
              : "Each result keeps only the four details most people check first: finish, PnL, points, and date."}
          </p>
        </div>

        {history.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[#848E9C]">{t("profile.noRecords")}</p>
          </div>
        ) : (
          <div className="grid gap-3 p-6">
            {history.map((match) => {
              const pnlUp = match.totalPnl >= 0;
              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-[#D1D4DC]">
                          #{match.competitionId}
                        </span>
                        <span className="rounded-full bg-[#F0B90B]/12 px-3 py-1 text-xs font-semibold text-[#F0B90B]">
                          #{match.finalRank}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            pnlUp
                              ? "bg-[#0ECB81]/12 text-[#0ECB81]"
                              : "bg-[#F6465D]/12 text-[#F6465D]"
                          }`}
                        >
                          {formatSigned(match.totalPnlPct, 1)}%
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-[#D1D4DC]">
                        {lang === "zh"
                          ? `${match.tradesCount} 笔交易 · ${match.winCount}-${match.lossCount} 胜负`
                          : `${match.tradesCount} trades · ${match.winCount}-${match.lossCount} W/L`}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm md:min-w-[280px]">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">
                          {lang === "zh" ? "收益" : "PnL"}
                        </p>
                        <p className={`mt-2 font-mono font-semibold ${pnlUp ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                          {formatSigned(match.totalPnl, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">
                          {lang === "zh" ? "积分" : "Points"}
                        </p>
                        <p className="mt-2 font-mono font-semibold text-[#F0B90B]">+{match.pointsEarned}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">
                          {lang === "zh" ? "日期" : "Date"}
                        </p>
                        <p className="mt-2 font-medium text-[#D1D4DC]">{formatDate(match.createdAt, locale)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
