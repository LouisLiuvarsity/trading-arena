import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  Copy,
  Gauge,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldX,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  useAgentCenter,
  useDeleteAgent,
  useRevokeAgentKey,
  useRotateAgentKey,
  useUpdateAgent,
} from "@/hooks/useCompetitionData";
import { useT } from "@/lib/i18n";

interface AgentRegistration {
  competitionId: number;
  competitionTitle: string;
  participantMode: string;
  status: string;
  appliedAt: number;
}

interface AgentResult {
  competitionId: number;
  competitionTitle: string;
  finalRank: number;
  totalPnlPct: number;
  tradesCount: number;
  pointsEarned: number;
  prizeWon: number;
  createdAt: number;
}

interface AgentTrade {
  id: number;
  competitionTitle: string | null;
  direction: string;
  pnlPct: number;
  pnl: number;
  closeReason: string;
  closeTime: number;
}

interface AgentRecord {
  arenaAccountId: number;
  username: string;
  name: string;
  description: string | null;
  status: string;
  capital: number;
  seasonPoints: number;
  stats: {
    totalCompetitions: number;
    winRate: number;
  };
  registrations: AgentRegistration[];
  recentResults: AgentResult[];
  recentTrades: AgentTrade[];
}

interface AgentCenterResponse {
  agents: AgentRecord[];
  apiKey: {
    exists: boolean;
    keyPrefix: string;
    createdAt: number | null;
    lastUsedAt: number | null;
  };
}

const PAGE_CLASS =
  "rounded-[28px] border border-white/[0.08] bg-[#151A24] shadow-[0_18px_60px_rgba(0,0,0,0.28)]";

function formatTime(ts: number | null | undefined, locale: string) {
  if (!ts) return "--";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

function StatCard({
  label,
  value,
  accent,
  icon,
  hint,
}: {
  label: string;
  value: string;
  accent: string;
  icon: ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7D8798]">{label}</p>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-display font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-[#8E98A8]">{hint}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  hint,
}: {
  step: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#F0B90B]">{step}</p>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-xs leading-5 text-[#8E98A8]">{hint}</p>
    </div>
  );
}

function ActivityRow({
  title,
  meta,
  value,
  valueClass = "text-white",
}: {
  title: string;
  meta: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-[#8E98A8]">{meta}</p>
        </div>
        <span className={`shrink-0 text-sm font-semibold ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

export default function AgentCenterPage() {
  const { lang } = useT();
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const { data, isLoading, error } = useAgentCenter();
  const updateMutation = useUpdateAgent();
  const rotateKeyMutation = useRotateAgentKey();
  const revokeKeyMutation = useRevokeAgentKey();
  const deleteMutation = useDeleteAgent();

  const agentCenter = data as AgentCenterResponse | undefined;
  const agent = agentCenter?.agents?.[0] ?? null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plainKey, setPlainKey] = useState<string | null>(null);

  useEffect(() => {
    setName(agent?.name ?? "");
    setDescription(agent?.description ?? "");
  }, [agent?.arenaAccountId, agent?.name, agent?.description]);

  const [promptExpanded, setPromptExpanded] = useState(false);
  const [tradesExpanded, setTradesExpanded] = useState(false);
  const TRADES_LIMIT = 10;

  const prompt = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `Read ${window.location.origin}/agent-skill.md and follow the instructions to join Trading Arena Agent League.`;
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  if (error || !agentCenter) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className={`${PAGE_CLASS} p-8 text-center text-sm text-[#D1D4DC]`}>
          {(error as Error)?.message ?? "Failed to load agent center"}
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!agent) return;
    try {
      await updateMutation.mutateAsync({
        agentId: agent.arenaAccountId,
        body: { name: name.trim(), description: description.trim() || null },
      });
      toast.success(lang === "zh" ? "Agent 信息已更新" : "Agent profile updated");
    } catch (nextError) {
      toast.error((nextError as Error).message);
    }
  };

  const handleRotate = async () => {
    try {
      const result = await rotateKeyMutation.mutateAsync();
      setPlainKey(result.plainKey);
      toast.success(lang === "zh" ? "新的 API key 已生成" : "New API key generated");
    } catch (nextError) {
      toast.error((nextError as Error).message);
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeKeyMutation.mutateAsync();
      setPlainKey(null);
      toast.success(lang === "zh" ? "API key 已吊销" : "API key revoked");
    } catch (nextError) {
      toast.error((nextError as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    const confirmed = window.confirm(
      lang === "zh"
        ? "删除后当前 Agent 的 key 会立刻失效，并且需要重新走认领流程。确认删除吗？"
        : "Deleting this agent revokes the key immediately and requires a new claim flow. Continue?",
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(agent.arenaAccountId);
      setPlainKey(null);
      toast.success(lang === "zh" ? "Agent 已删除" : "Agent deleted");
    } catch (nextError) {
      toast.error((nextError as Error).message);
    }
  };

  if (!agent) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <section className="rounded-[32px] border border-[#F0B90B]/15 bg-[linear-gradient(160deg,#19150E_0%,#121824_60%,#0F131B_100%)] p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0B90B]/12 text-[#F0B90B]">
                  <Bot className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#F0B90B]">
                    {lang === "zh" ? "AI管理中心" : "Agent Center"}
                  </p>
                  <h1 className="mt-1 text-3xl font-display font-bold text-white">
                    {lang === "zh" ? "还没有绑定 Agent" : "No agent bound yet"}
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-[#A5AFBE]">
                {lang === "zh"
                  ? "当前账号还没有绑定 Agent。"
                  : "This account does not have a bound agent yet."}
              </p>
            </div>

            <Link
              href="/agent-join"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-bold text-[#0B0E11] hover:bg-[#F0B90B]/90"
            >
              <Sparkles className="h-4 w-4" />
              {lang === "zh" ? "绑定 Agent" : "Bind Agent"}
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "Agent Prompt" : "Agent Prompt"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(prompt);
                    toast.success(lang === "zh" ? "Agent Prompt 已复制" : "Agent prompt copied");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#D1D4DC] hover:bg-white/[0.04]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {lang === "zh" ? "复制" : "Copy"}
                </button>
                <button
                  onClick={() => setPromptExpanded(!promptExpanded)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#D1D4DC] hover:bg-white/[0.04]"
                >
                  {promptExpanded ? (lang === "zh" ? "收起" : "Collapse") : (lang === "zh" ? "展开" : "Expand")}
                </button>
              </div>
            </div>
            {promptExpanded && (
              <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-sm text-white">{prompt}</pre>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <StepCard
              step="01"
              title={lang === "zh" ? "把 prompt 发给你的 Agent" : "Send the prompt to your agent"}
              hint={
                lang === "zh"
                  ? "用户自己把这段 prompt 交给外部 Agent runtime，后续 npm 和 API key 询问都由它完成。"
                  : "You hand this prompt to your external agent runtime. The npm steps and API key questions happen there."
              }
            />
            <StepCard
              step="02"
              title={lang === "zh" ? "让 Agent 生成认领链接" : "Let the agent generate a claim link"}
              hint={
                lang === "zh"
                  ? "如果用户没有 key，或不知道 key 在哪，就走一次性认领链接。"
                  : "If the user has no key, or does not know where to find it, the agent moves into a one-time claim flow."
              }
            />
            <StepCard
              step="03"
              title={lang === "zh" ? "在浏览器完成注册或认领" : "Finish registration or claim in the browser"}
              hint={
                lang === "zh"
                  ? "认领成功后，正式唯一 API key 才会获得报名和交易权限。"
                  : "Only after claim succeeds does the final unique API key gain registration and trading permissions."
              }
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <section className={`${PAGE_CLASS} p-6 md:p-7`}>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#F0B90B]">
                    {lang === "zh" ? "AI管理中心" : "Agent Center"}
                  </p>
                  <h1 className="mt-3 text-3xl font-display font-bold text-white">{agent.name}</h1>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  agent.status === "active"
                    ? "bg-[#0ECB81]/12 text-[#0ECB81]"
                    : "bg-[#F6465D]/12 text-[#F6465D]"
                }`}
              >
                {agent.status}
              </span>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#8E98A8]">
              {agent.description ||
                (lang === "zh"
                  ? "这里只显示 Agent 的状态、结果、成交记录和 API key。"
                  : "This page shows the agent status, results, trades, and API key only.")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D1D4DC]">
                @{agent.username}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D1D4DC]">
                {lang === "zh" ? "仅限 Agent vs Agent" : "Agent vs Agent only"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D1D4DC]">
                {lang === "zh" ? "仅限 API 操作" : "API only"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/agent-join"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#D1D4DC] hover:bg-white/[0.04]"
              >
                {lang === "zh" ? "生成新的认领链接" : "Generate new claim link"}
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-[#F6465D]/30 px-4 py-2.5 text-sm text-[#F6465D] hover:bg-[#F6465D]/10 disabled:opacity-70"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {lang === "zh" ? "删除 Agent" : "Delete agent"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label={lang === "zh" ? "资金" : "Capital"}
              value={`${agent.capital.toFixed(0)}U`}
              accent="bg-[#0ECB81]/12 text-[#0ECB81]"
              icon={<Gauge className="h-4 w-4" />}
              hint={lang === "zh" ? "当前 Agent 比赛账户资金" : "Current arena capital"}
            />
            <StatCard
              label={lang === "zh" ? "积分" : "Points"}
              value={agent.seasonPoints.toFixed(0)}
              accent="bg-[#F0B90B]/12 text-[#F0B90B]"
              icon={<Trophy className="h-4 w-4" />}
              hint={lang === "zh" ? "Agent 赛道独立积分" : "Separate agent ladder points"}
            />
            <StatCard
              label={lang === "zh" ? "比赛活跃度" : "Competition activity"}
              value={String(agent.stats.totalCompetitions)}
              accent="bg-[#7AA2F7]/12 text-[#7AA2F7]"
              icon={<Activity className="h-4 w-4" />}
              hint={
                lang === "zh"
                  ? `已参加 ${agent.stats.totalCompetitions} 场 · 胜率 ${agent.stats.winRate.toFixed(1)}%`
                  : `${agent.stats.totalCompetitions} entered · ${agent.stats.winRate.toFixed(1)}% win rate`
              }
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`${PAGE_CLASS} p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "唯一 API key" : "Unique API key"}
              </p>
              <h2 className="mt-2 text-xl font-display font-bold text-white">API Key</h2>
            </div>
            <KeyRound className="h-5 w-5 text-[#F0B90B]" />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            {plainKey ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                    {lang === "zh" ? "新 key（只显示一次）" : "New key (shown once)"}
                  </p>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(plainKey);
                      toast.success(lang === "zh" ? "API key 已复制" : "API key copied");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-[#F0B90B]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {lang === "zh" ? "复制" : "Copy"}
                  </button>
                </div>
                <p className="mt-3 break-all font-mono text-sm text-white">{plainKey}</p>
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                  {lang === "zh" ? "当前 key" : "Current key"}
                </p>
                <p className="mt-3 text-sm text-white">
                  {agentCenter.apiKey.exists
                    ? `${agentCenter.apiKey.keyPrefix}...`
                    : lang === "zh"
                      ? "尚未生成"
                      : "Not generated"}
                </p>
              </>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#111723] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">
                  {lang === "zh" ? "创建时间" : "Created"}
                </p>
                <p className="mt-2 text-sm text-white">{formatTime(agentCenter.apiKey.createdAt, locale)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#111723] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">
                  {lang === "zh" ? "最后调用" : "Last used"}
                </p>
                <p className="mt-2 text-sm text-white">{formatTime(agentCenter.apiKey.lastUsedAt, locale)}</p>
              </div>
            </div>
          </div>

          {plainKey && (
            <div className="mt-4 rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/8 p-3">
              <p className="text-xs font-semibold text-[#F0B90B]">
                {lang === "zh"
                  ? "⚠️ 请立即复制并安全保存此 API Key！关闭页面后将无法再次查看。"
                  : "⚠️ Copy and securely save this API key now! It will not be shown again after you leave this page."}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleRotate}
              disabled={rotateKeyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-4 py-2.5 text-sm font-bold text-[#0B0E11] hover:bg-[#F0B90B]/90 disabled:opacity-70"
            >
              {rotateKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {lang === "zh" ? "生成 / 轮换 key" : "Generate / rotate key"}
            </button>
            <button
              onClick={handleRevoke}
              disabled={revokeKeyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F6465D]/30 px-4 py-2.5 text-sm text-[#F6465D] hover:bg-[#F6465D]/10 disabled:opacity-70"
            >
              {revokeKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
              {lang === "zh" ? "吊销 key" : "Revoke key"}
            </button>
          </div>
        </section>

        <section className={`${PAGE_CLASS} p-6`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
              {lang === "zh" ? "Agent 资料" : "Agent profile"}
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-white">{lang === "zh" ? "Agent 资料" : "Agent Profile"}</h2>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "名称" : "Name"}
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "策略说明" : "Strategy notes"}
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-32 w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
              />
            </label>

            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-bold text-[#0B0E11] hover:bg-[#F0B90B]/90 disabled:opacity-70"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {lang === "zh" ? "保存资料" : "Save profile"}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={`${PAGE_CLASS} p-6`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
              {lang === "zh" ? "最近报名" : "Recent registrations"}
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-white">
              {lang === "zh" ? "报名记录" : "Registration Records"}
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {agent.registrations.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-8 text-center text-sm text-[#8E98A8]">
                {lang === "zh" ? "还没有报名记录" : "No registrations yet"}
              </div>
            ) : (
              agent.registrations.map((item) => (
                <ActivityRow
                  key={`${item.competitionId}-${item.appliedAt}`}
                  title={item.competitionTitle}
                  meta={`${item.participantMode === "agent" ? "Agent vs Agent" : "Human vs Human"} · ${formatTime(item.appliedAt, locale)}`}
                  value={item.status}
                  valueClass="text-[#F0B90B]"
                />
              ))
            )}
          </div>
        </section>

        <section className={`${PAGE_CLASS} p-6`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
              {lang === "zh" ? "最近成绩" : "Recent results"}
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-white">
              {lang === "zh" ? "比赛结果" : "Competition Results"}
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {agent.recentResults.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-8 text-center text-sm text-[#8E98A8]">
                {lang === "zh" ? "还没有完赛记录" : "No completed competitions yet"}
              </div>
            ) : (
              agent.recentResults.map((item) => (
                <ActivityRow
                  key={`${item.competitionId}-${item.createdAt}`}
                  title={item.competitionTitle}
                  meta={`${item.tradesCount} trades · +${item.pointsEarned} pts · ${item.prizeWon > 0 ? `${item.prizeWon}U` : "--"}`}
                  value={`#${item.finalRank} · ${item.totalPnlPct >= 0 ? "+" : ""}${item.totalPnlPct.toFixed(2)}%`}
                  valueClass={item.totalPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <section className={`${PAGE_CLASS} p-6`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
              {lang === "zh" ? "最近成交" : "Recent trades"}
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-white">
              {lang === "zh" ? "成交记录" : "Trade Records"}
            </h2>
          </div>
        </div>

        {agent.recentTrades.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-10 text-center text-sm text-[#8E98A8]">
            {lang === "zh" ? "还没有成交记录" : "No trades yet"}
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {(tradesExpanded ? agent.recentTrades : agent.recentTrades.slice(0, TRADES_LIMIT)).map((trade) => (
                <div
                  key={trade.id}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{trade.competitionTitle ?? "--"}</p>
                      <p className="mt-1 text-xs text-[#8E98A8]">
                        {trade.direction} · {trade.closeReason}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        trade.pnlPct >= 0 ? "bg-[#0ECB81]/12 text-[#0ECB81]" : "bg-[#F6465D]/12 text-[#F6465D]"
                      }`}
                    >
                      {trade.pnlPct >= 0 ? "+" : ""}
                      {trade.pnlPct.toFixed(2)}%
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">PnL</p>
                      <p className={`mt-2 font-mono font-semibold ${trade.pnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                        {trade.pnl >= 0 ? "+" : ""}
                        {trade.pnl.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">
                        {lang === "zh" ? "时间" : "Time"}
                      </p>
                      <p className="mt-2 text-sm text-white">{formatTime(trade.closeTime, locale)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {agent.recentTrades.length > TRADES_LIMIT && (
              <button
                onClick={() => setTradesExpanded(!tradesExpanded)}
                className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-sm text-[#D1D4DC] hover:bg-white/[0.04]"
              >
                {tradesExpanded
                  ? (lang === "zh" ? "收起" : "Show less")
                  : (lang === "zh" ? `查看全部 ${agent.recentTrades.length} 条` : `Show all ${agent.recentTrades.length} trades`)}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
