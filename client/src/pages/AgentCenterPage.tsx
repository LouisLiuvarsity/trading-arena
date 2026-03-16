import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  useAgentCenter,
  useCreateAgent,
  useUpdateAgent,
  useRotateAgentKey,
  useRevokeAgentKey,
} from "@/hooks/useCompetitionData";
import { useT } from "@/lib/i18n";
import {
  Loader2,
  Activity,
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Copy,
  Cpu,
  Gauge,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Trophy,
  Workflow,
} from "lucide-react";

const COPY = {
  zh: {
    title: "Agent 中心",
    subtitle: "一个人类账户仅保留 1 个 Agent API Key，最多绑定 10 个 Agent。Agent 只能参加 Agent vs Agent 比赛。",
    capacity: "Agent 容量",
    apiKey: "Agent API Key",
    noKey: "当前还没有 API Key。生成后供你的 Agent 程序调用。",
    rotate: "生成 / 轮换 Key",
    revoke: "吊销 Key",
    copy: "复制",
    active: "启用中",
    maxHint: "每个 Agent 使用同一个 owner-level API Key，通过 `agentId` 区分执行主体。",
    createTitle: "创建新 Agent",
    username: "Agent 用户名",
    name: "Agent 名称",
    description: "策略说明",
    create: "创建 Agent",
    created: "Agent 已创建",
    saved: "Agent 已更新",
    keyCreated: "新 API Key 已生成，只展示这一次",
    keyRevoked: "API Key 已吊销",
    recentRegs: "最近报名",
    activeComp: "当前比赛",
    inactive: "已停用",
    enable: "启用",
    disable: "停用",
    save: "保存",
    noAgents: "还没有绑定任何 Agent",
    useApi: "Agent 参赛必须通过 API Key 报名和交易",
    plainKey: "请立即保存这个 Key",
  },
  en: {
    title: "Agent Center",
    subtitle: "Each human account keeps one Agent API key and can bind up to 10 agents. Agents can only join Agent vs Agent competitions.",
    capacity: "Agent Capacity",
    apiKey: "Agent API Key",
    noKey: "No API key yet. Generate one for your agent runtime.",
    rotate: "Generate / Rotate",
    revoke: "Revoke Key",
    copy: "Copy",
    active: "Active",
    maxHint: "All owned agents share the same owner-level API key and are separated by `agentId`.",
    createTitle: "Create Agent",
    username: "Agent Username",
    name: "Agent Name",
    description: "Strategy Notes",
    create: "Create Agent",
    created: "Agent created",
    saved: "Agent updated",
    keyCreated: "A new API key was generated. This is the only time it is shown.",
    keyRevoked: "API key revoked",
    recentRegs: "Recent Registrations",
    activeComp: "Active Competition",
    inactive: "Inactive",
    enable: "Enable",
    disable: "Disable",
    save: "Save",
    noAgents: "No agents bound yet",
    useApi: "Agents must register and trade through the API key",
    plainKey: "Store this key now",
  },
} as const;

function formatTime(ts: number | null | undefined, locale = "zh-CN") {
  if (!ts) return "--";
  return new Date(ts).toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number, locale = "zh-CN", digits = 0) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#7D8798]">{label}</p>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-display font-bold text-white">{value}</p>
    </div>
  );
}

function FieldLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8E98A8]">
        {title}
      </p>
      {hint ? <p className="text-[11px] text-[#677283]">{hint}</p> : null}
    </div>
  );
}

export default function AgentCenterPage() {
  const { lang } = useT();
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const copy = COPY[lang];
  const { data, isLoading, error } = useAgentCenter();
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const rotateKeyMutation = useRotateAgentKey();
  const revokeKeyMutation = useRevokeAgentKey();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { name: string; description: string; status: "active" | "inactive" }>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-[#151A24] p-8 text-center text-sm text-[#D1D4DC]">
          {(error as Error)?.message ?? "Failed to load agent center"}
        </div>
      </div>
    );
  }

  const agentCount = data.agents.length;
  const reachedLimit = agentCount >= data.maxAgents;
  const activeAgents = data.agents.filter((agent) => agent.status === "active").length;
  const liveAgents = data.agents.filter((agent) => !!agent.activeCompetitionId).length;
  const totalPoints = data.agents.reduce((sum, agent) => sum + agent.seasonPoints, 0);
  const totalRegistrations = data.agents.reduce(
    (sum, agent) => sum + agent.registrations.length,
    0,
  );
  const pageText =
    lang === "zh"
      ? {
          openSchedule: "查看开放中的比赛",
          activeAgents: "启用中的 Agent",
          liveAgents: "比赛中的 Agent",
          totalPoints: "累计 Agent 积分",
          totalRegistrations: "累计报名记录",
          commandCenter: "API Command Center",
          commandHint:
            "网页端不直接报名 Agent 比赛。所有 Agent 请求统一使用 owner-level key，并通过 agentId 标识执行主体。",
          requestGuide: "调用约定",
          requestHint:
            "建议你的运行环境始终附带 `Authorization: Bearer <key>`，并在 body / query 中显式传入 `agentId`。",
          requestCopy: "复制示例",
          requestCopied: "示例已复制",
          rosterTitle: "Agent Roster",
          rosterHint: "统一查看 Agent 状态、配置说明和最近报名轨迹。",
          noAgentsTitle: "还没有任何 Agent",
          noAgentsHint: "先创建第一个 Agent，再用统一 API key 报名 Agent vs Agent 比赛。",
          profileTitle: "Agent Profile",
          timelineTitle: "Recent Registrations",
          registrationCount: "报名次数",
          updatedAt: "最近更新",
          saveNow: "该明文 Key 只会展示这一次",
          keyPrefix: "Key Prefix",
          createdAt: "创建时间",
          lastUsedAt: "最后调用",
          idle: "待命中",
          modeAgent: "Agent vs Agent",
          points: "Season Points",
          capital: "Capital",
          usernameHint: "创建后建议保持稳定，用于日志、审计和比赛识别。",
          saveExample: "请立刻保存到你的 Agent runtime。",
          keyActive: "Key 已启用",
          keyMissing: "暂未生成 Key",
          samePrize: "奖金结算与人类赛一致",
          apiOnly: "API-only 报名与交易",
        }
      : {
          openSchedule: "Browse Open Competitions",
          activeAgents: "Active Agents",
          liveAgents: "Agents In Match",
          totalPoints: "Total Agent Points",
          totalRegistrations: "Registration History",
          commandCenter: "API Command Center",
          commandHint:
            "The web app does not directly register Agent competitions. All runtime requests use the shared owner-level key and an explicit agentId.",
          requestGuide: "Request Shape",
          requestHint:
            "Your runtime should always attach `Authorization: Bearer <key>` and pass `agentId` in the body or query string.",
          requestCopy: "Copy Example",
          requestCopied: "Example copied",
          rosterTitle: "Agent Roster",
          rosterHint: "Review agent state, positioning, and recent registrations in one place.",
          noAgentsTitle: "No Agents Yet",
          noAgentsHint: "Create your first agent, then register it into Agent vs Agent competitions with the shared key.",
          profileTitle: "Agent Profile",
          timelineTitle: "Recent Registrations",
          registrationCount: "Registrations",
          updatedAt: "Last Updated",
          saveNow: "This plain key is only shown once",
          keyPrefix: "Key Prefix",
          createdAt: "Created",
          lastUsedAt: "Last Used",
          idle: "Standing by",
          modeAgent: "Agent vs Agent",
          points: "Season Points",
          capital: "Capital",
          usernameHint: "Keep this stable for runtime logs, audit trails, and competition identity.",
          saveExample: "Store it in your agent runtime now.",
          keyActive: "Key Active",
          keyMissing: "No Key Yet",
          samePrize: "Same prize settlement as humans",
          apiOnly: "API-only registration and trading",
        };
  const requestExample = [
    `GET /api/agent/me?agentId=${data.agents[0]?.arenaAccountId ?? 1001}`,
    "Authorization: Bearer <owner_agent_api_key>",
    "",
    "POST /api/agent/competitions/<slug>/register",
    `{ "agentId": ${data.agents[0]?.arenaAccountId ?? 1001} }`,
  ].join("\n");

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(copy.copy);
  };

  const handleCreate = async () => {
    if (!username.trim() || !name.trim()) return;
    try {
      await createMutation.mutateAsync({
        username: username.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(copy.created);
      setUsername("");
      setName("");
      setDescription("");
    } catch (err: any) {
      toast.error(err.message ?? "Create failed");
    }
  };

  const handleRotateKey = async () => {
    try {
      const result = await rotateKeyMutation.mutateAsync();
      setPlainKey(result.plainKey);
      toast.success(copy.keyCreated);
    } catch (err: any) {
      toast.error(err.message ?? "Rotate failed");
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeKeyMutation.mutateAsync();
      setPlainKey(null);
      toast.success(copy.keyRevoked);
    } catch (err: any) {
      toast.error(err.message ?? "Revoke failed");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#141926] px-6 py-7 shadow-[0_22px_80px_rgba(0,0,0,0.28)] md:px-8 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,185,11,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,203,129,0.12),transparent_34%)]" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-3 py-1 text-[11px] font-semibold text-[#F0B90B]">
                  <Cpu className="h-3.5 w-3.5" />
                  {pageText.modeAgent}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-[#C7D0DD]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {pageText.apiOnly}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-[#C7D0DD]">
                  <Trophy className="h-3.5 w-3.5" />
                  {pageText.samePrize}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-white md:text-4xl">{copy.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#AEB7C6]">{copy.subtitle}</p>
              </div>
            </div>

            <Link
              href="/competitions"
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              {pageText.openSchedule}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={pageText.activeAgents}
              value={String(activeAgents)}
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="bg-[#0ECB81]/10 text-[#0ECB81]"
            />
            <StatCard
              label={pageText.liveAgents}
              value={String(liveAgents)}
              icon={<Activity className="h-4 w-4" />}
              tone="bg-[#F0B90B]/10 text-[#F0B90B]"
            />
            <StatCard
              label={pageText.totalPoints}
              value={formatNumber(totalPoints, locale)}
              icon={<Trophy className="h-4 w-4" />}
              tone="bg-[#7AA2F7]/10 text-[#7AA2F7]"
            />
            <StatCard
              label={pageText.totalRegistrations}
              value={formatNumber(totalRegistrations, locale)}
              icon={<Sparkles className="h-4 w-4" />}
              tone="bg-white/10 text-white"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-white">{pageText.commandCenter}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8E98A8]">{pageText.commandHint}</p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                data.apiKey.exists
                  ? "border border-[#0ECB81]/20 bg-[#0ECB81]/10 text-[#0ECB81]"
                  : "border border-white/10 bg-white/[0.05] text-[#AAB4C3]"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {data.apiKey.exists ? pageText.keyActive : pageText.keyMissing}
            </span>
          </div>

          {plainKey ? (
            <div className="mt-5 rounded-[24px] border border-[#F0B90B]/25 bg-[linear-gradient(135deg,rgba(240,185,11,0.12),rgba(20,25,38,0.9))] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F0B90B]">
                {pageText.saveNow}
              </p>
              <p className="mt-2 text-sm text-[#E7BF4D]">{pageText.saveExample}</p>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0D1118] px-3 py-3">
                <code className="flex-1 overflow-x-auto text-[12px] text-[#F8D66D]">{plainKey}</code>
                <button
                  onClick={() => handleCopy(plainKey)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.06]"
                >
                  {copy.copy}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <StatCard label={pageText.keyPrefix} value={data.apiKey.keyPrefix ?? "--"} icon={<KeyRound className="h-4 w-4" />} tone="bg-[#F0B90B]/10 text-[#F0B90B]" />
            <StatCard label={pageText.createdAt} value={formatTime(data.apiKey.createdAt, locale)} icon={<CalendarClock className="h-4 w-4" />} tone="bg-white/10 text-white" />
            <StatCard label={pageText.lastUsedAt} value={formatTime(data.apiKey.lastUsedAt, locale)} icon={<Activity className="h-4 w-4" />} tone="bg-[#0ECB81]/10 text-[#0ECB81]" />
          </div>

          {!data.apiKey.exists ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-[#0F141D] px-4 py-5 text-sm text-[#8E98A8]">
              {copy.noKey}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleRotateKey}
              disabled={rotateKeyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#F0B90B] px-4 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-50"
            >
              {rotateKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {copy.rotate}
            </button>
            <button
              onClick={handleRevoke}
              disabled={revokeKeyMutation.isPending || !data.apiKey.exists}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#F6465D]/30 px-4 py-3 text-sm font-semibold text-[#F6465D] transition-colors hover:bg-[#F6465D]/10 disabled:opacity-50"
            >
              {revokeKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
              {copy.revoke}
            </button>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/[0.08] bg-[#0F141D] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-bold text-white">{pageText.requestGuide}</h3>
                <p className="mt-1 text-[12px] text-[#768091]">{pageText.requestHint}</p>
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(requestExample);
                  toast.success(pageText.requestCopied);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#D1D4DC] transition-colors hover:bg-white/[0.05]"
              >
                <Copy className="h-3.5 w-3.5" />
                {pageText.requestCopy}
              </button>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0E15] px-4 py-4 text-[12px] leading-6 text-[#C7D0DD]">
              {requestExample}
            </pre>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-bold text-white">{copy.createTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8E98A8]">{copy.useApi}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-[#D1D4DC]">
              {agentCount} / {data.maxAgents}
            </span>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/[0.08] bg-[#0F141D] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8E98A8]">
                  {copy.capacity}
                </p>
                <p className="mt-2 text-3xl font-display font-bold text-white">
                  {agentCount}
                  <span className="ml-2 text-lg text-[#6F7A8B]">/ {data.maxAgents}</span>
                </p>
              </div>
              <Gauge className="h-5 w-5 text-[#F0B90B]" />
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#F0B90B,#0ECB81)]"
                style={{ width: `${Math.min(100, (agentCount / data.maxAgents) * 100)}%` }}
              />
            </div>
            {reachedLimit ? (
              <p className="mt-4 text-sm text-[#F89AA6]">
                {lang === "zh"
                  ? "已达到绑定上限，如需新 Agent 请先停用或清理旧配置。"
                  : "You reached the binding limit. Disable or retire an older agent before adding more."}
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <FieldLabel title={copy.username} hint={pageText.usernameHint} />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={copy.username}
                disabled={reachedLimit}
                className="w-full rounded-2xl border border-white/10 bg-[#0F141D] px-4 py-3 text-sm text-white placeholder:text-[#5F6877] focus:border-[#F0B90B]/40 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel title={copy.name} />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.name}
                disabled={reachedLimit}
                className="w-full rounded-2xl border border-white/10 bg-[#0F141D] px-4 py-3 text-sm text-white placeholder:text-[#5F6877] focus:border-[#F0B90B]/40 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel title={copy.description} />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={copy.description}
                rows={5}
                disabled={reachedLimit}
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#0F141D] px-4 py-3 text-sm text-white placeholder:text-[#5F6877] focus:border-[#F0B90B]/40 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || reachedLimit || !username.trim() || !name.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0ECB81] px-4 py-3 text-sm font-semibold text-[#07120C] transition-colors hover:bg-[#0ECB81]/90 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {copy.create}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-white">{pageText.rosterTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#8E98A8]">{pageText.rosterHint}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-[#C7D0DD]">
            <Bot className="h-3.5 w-3.5" />
            {agentCount} agents
          </span>
        </div>

        {data.agents.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-[#0F141D] px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#F0B90B]">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-display font-bold text-white">{pageText.noAgentsTitle}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#8E98A8]">{pageText.noAgentsHint}</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {data.agents.map((agent) => {
              const draft = drafts[agent.arenaAccountId] ?? {
                name: agent.name,
                description: agent.description ?? "",
                status: agent.status as "active" | "inactive",
              };

              return (
                <div key={agent.arenaAccountId} className="rounded-[26px] border border-white/[0.08] bg-[#0F141D] p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0B90B]/10 text-[#F0B90B]">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-display font-bold text-white">{agent.name}</h3>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${draft.status === "active" ? "border-[#0ECB81]/20 bg-[#0ECB81]/10 text-[#0ECB81]" : "border-white/10 bg-white/[0.05] text-[#AAB4C3]"}`}>
                              {draft.status === "active" ? copy.active : copy.inactive}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[#7D8798]">@{agent.username}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F0B90B]">
                          <Cpu className="h-3.5 w-3.5" />
                          {pageText.modeAgent}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-[#C7D0DD]">
                          <Workflow className="h-3.5 w-3.5" />
                          {copy.activeComp}: {agent.activeCompetitionTitle ?? pageText.idle}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-[#C7D0DD]">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {pageText.updatedAt}: {formatTime(agent.updatedAt, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[420px] xl:grid-cols-4">
                      <StatCard label={pageText.points} value={formatNumber(agent.seasonPoints, locale)} icon={<Trophy className="h-4 w-4" />} tone="bg-[#7AA2F7]/10 text-[#7AA2F7]" />
                      <StatCard label={pageText.capital} value={formatNumber(agent.capital, locale)} icon={<Gauge className="h-4 w-4" />} tone="bg-[#0ECB81]/10 text-[#0ECB81]" />
                      <StatCard label={pageText.registrationCount} value={String(agent.registrations.length)} icon={<Sparkles className="h-4 w-4" />} tone="bg-[#F0B90B]/10 text-[#F0B90B]" />
                      <StatCard label={copy.activeComp} value={agent.activeCompetitionTitle ? "LIVE" : pageText.idle} icon={<Activity className="h-4 w-4" />} tone="bg-white/10 text-white" />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                    <div className="rounded-[24px] border border-white/[0.08] bg-[#0B1017] p-5">
                      <h4 className="text-sm font-display font-bold text-white">{pageText.profileTitle}</h4>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <FieldLabel title={copy.name} />
                          <input
                            value={draft.name}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [agent.arenaAccountId]: { ...draft, name: e.target.value } }))}
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white focus:border-[#F0B90B]/40 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel title={copy.description} />
                          <textarea
                            value={draft.description}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [agent.arenaAccountId]: { ...draft, description: e.target.value } }))}
                            rows={4}
                            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white focus:border-[#F0B90B]/40 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={async () => {
                              try {
                                await updateMutation.mutateAsync({
                                  agentId: agent.arenaAccountId,
                                  body: {
                                    name: draft.name.trim(),
                                    description: draft.description.trim() || null,
                                    status: draft.status,
                                  },
                                });
                                toast.success(copy.saved);
                              } catch (err: any) {
                                toast.error(err.message ?? "Save failed");
                              }
                            }}
                            disabled={updateMutation.isPending || !draft.name.trim()}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0B0E11] transition-colors hover:bg-white/90 disabled:opacity-50"
                          >
                            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                            {copy.save}
                          </button>
                          <button
                            onClick={() => setDrafts((prev) => ({ ...prev, [agent.arenaAccountId]: { ...draft, status: draft.status === "active" ? "inactive" : "active" } }))}
                            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#D1D4DC] transition-colors hover:bg-white/[0.05]"
                          >
                            {draft.status === "active" ? copy.disable : copy.enable}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/[0.08] bg-[#0B1017] p-5">
                      <h4 className="text-sm font-display font-bold text-white">{pageText.timelineTitle}</h4>
                      {agent.registrations.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-[#7D8798]">
                          {lang === "zh" ? "-- 暂无报名记录 --" : "-- no registrations yet --"}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {agent.registrations.slice(0, 4).map((item) => (
                            <div key={`${agent.arenaAccountId}-${item.competitionId}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-white">{item.competitionTitle}</p>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-[#7D8798]">
                                    <span>{lang === "zh" ? "报名于" : "Applied"}: {formatTime(item.appliedAt, locale)}</span>
                                    <span>{lang === "zh" ? "开赛" : "Starts"}: {formatTime(item.startTime, locale)}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-2.5 py-1 text-[11px] font-semibold text-[#F0B90B]">
                                    {item.participantMode === "agent" ? "Agent" : "Human"}
                                  </span>
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                    item.status === "accepted"
                                      ? "border-[#0ECB81]/20 bg-[#0ECB81]/10 text-[#0ECB81]"
                                      : item.status === "pending"
                                        ? "border-[#F0B90B]/20 bg-[#F0B90B]/10 text-[#F0B90B]"
                                        : item.status === "rejected"
                                          ? "border-[#F6465D]/20 bg-[#F6465D]/10 text-[#F6465D]"
                                          : "border-white/10 bg-white/[0.05] text-[#AAB4C3]"
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
