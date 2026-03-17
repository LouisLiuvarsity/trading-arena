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

function formatTime(ts: number | null | undefined, locale: string) {
  if (!ts) return "--";
  return new Date(ts).toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#151A24] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#7D8798]">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-display font-bold text-white">{value}</p>
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

  const agent = data?.agents?.[0] ?? null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plainKey, setPlainKey] = useState<string | null>(null);

  useEffect(() => {
    setName(agent?.name ?? "");
    setDescription(agent?.description ?? "");
  }, [agent?.arenaAccountId, agent?.name, agent?.description]);

  const prompt = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `Read ${window.location.origin}/agent-skill.md and follow the instructions to join Trading Arena Agent League.`;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-[28px] border border-white/10 bg-[#151A24] p-8 text-center text-sm text-[#D1D4DC]">
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
        ? "删除后当前 Agent 的 key 会立刻失效，且需要重新走认领流程。确认删除吗？"
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
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-[32px] border border-[#F0B90B]/15 bg-[linear-gradient(160deg,#19150E_0%,#121824_60%,#0F131B_100%)] p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0B90B]/12 text-[#F0B90B]">
              <Bot className="w-6 h-6" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#F0B90B]">
                {lang === "zh" ? "用户中心" : "Agent Center"}
              </p>
              <h1 className="mt-1 text-3xl font-display font-bold text-white">
                {lang === "zh" ? "你还没有绑定 Agent" : "No Agent Bound Yet"}
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-[#A5AFBE]">
            {lang === "zh"
              ? "Agent 必须通过一次性认领链接绑定到当前人类账号。认领完成后，唯一 API key 才会获得查看比赛、报名和下单权限。"
              : "An agent must be bound through the one-time claim flow. Only after the claim succeeds does the unique API key gain permissions to inspect competitions, register, and trade."}
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">prompt</p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(prompt);
                  toast.success(lang === "zh" ? "Prompt 已复制" : "Prompt copied");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#D1D4DC] hover:bg-white/[0.04]"
              >
                <Copy className="w-3.5 h-3.5" />
                {lang === "zh" ? "复制" : "Copy"}
              </button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-white font-mono">{prompt}</pre>
          </div>

          <Link
            href="/agent-join"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-bold text-[#0B0E11] hover:bg-[#F0B90B]/90"
          >
            <Sparkles className="w-4 h-4" />
            {lang === "zh" ? "开始 Agent 接入" : "Start Agent Onboarding"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#F0B90B]">
            {lang === "zh" ? "人类用户中心 / Agent Owner Console" : "Human Console / Agent Owner Console"}
          </p>
          <h1 className="mt-2 text-3xl font-display font-bold text-white">{agent.name}</h1>
          <p className="mt-2 text-sm text-[#8E98A8]">
            {lang === "zh"
              ? "每个人类账号仅允许绑定 1 个 Agent。Agent 只能参加 Agent vs Agent 比赛，并且只能通过 API 操作。"
              : "Each human account can bind exactly one agent. The agent can only join Agent vs Agent competitions and can only operate through the API."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/agent-join" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#D1D4DC] hover:bg-white/[0.04]">
            {lang === "zh" ? "重新生成认领包" : "New Claim Package"}
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-[#F6465D]/30 px-4 py-2 text-sm text-[#F6465D] hover:bg-[#F6465D]/10 disabled:opacity-70"
          >
            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {lang === "zh" ? "删除 Agent" : "Delete Agent"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={lang === "zh" ? "Agent 资金" : "Agent Capital"}
          value={`${agent.capital.toFixed(0)}U`}
          accent="bg-[#0ECB81]/12 text-[#0ECB81]"
          icon={<Gauge className="w-4 h-4" />}
        />
        <StatCard
          label={lang === "zh" ? "Agent 积分" : "Agent Points"}
          value={agent.seasonPoints.toFixed(0)}
          accent="bg-[#F0B90B]/12 text-[#F0B90B]"
          icon={<Trophy className="w-4 h-4" />}
        />
        <StatCard
          label={lang === "zh" ? "总比赛数" : "Competitions"}
          value={String(agent.stats.totalCompetitions)}
          accent="bg-[#7AA2F7]/12 text-[#7AA2F7]"
          icon={<Activity className="w-4 h-4" />}
        />
        <StatCard
          label={lang === "zh" ? "胜率" : "Win Rate"}
          value={`${agent.stats.winRate.toFixed(1)}%`}
          accent="bg-[#FF6B35]/12 text-[#FF6B35]"
          icon={<Sparkles className="w-4 h-4" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "Agent 资料" : "Agent Profile"}
              </p>
              <p className="mt-2 text-lg font-display font-bold text-white">{agent.username}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${agent.status === "active" ? "bg-[#0ECB81]/10 text-[#0ECB81]" : "bg-[#F6465D]/10 text-[#F6465D]"}`}>
              {agent.status}
            </span>
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
                {lang === "zh" ? "策略说明" : "Strategy Notes"}
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
              />
            </label>

            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-bold text-[#0B0E11] hover:bg-[#F0B90B]/90 disabled:opacity-70"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {lang === "zh" ? "保存资料" : "Save Profile"}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "唯一 API key" : "Unique API Key"}
              </p>
              <p className="mt-2 text-sm text-[#A5AFBE]">
                {lang === "zh"
                  ? "认领成功后才会激活权限。当前账号只有这一个 Agent，因此这个 key 就是它的唯一比赛 key。"
                  : "Permissions activate only after claim. Because this account can bind only one agent, this key is the agent's unique competition key."}
              </p>
            </div>
            <KeyRound className="w-5 h-5 text-[#F0B90B]" />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            {plainKey ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                    {lang === "zh" ? "新 key（只显示一次）" : "New key (shown once)"}
                  </span>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(plainKey);
                      toast.success(lang === "zh" ? "API key 已复制" : "API key copied");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-[#F0B90B]"
                  >
                    <Copy className="w-3.5 h-3.5" />
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
                  {data.apiKey.exists ? `${data.apiKey.keyPrefix}...` : (lang === "zh" ? "尚未生成" : "Not generated")}
                </p>
              </>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#111723] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#7E899B]">
                  {lang === "zh" ? "创建时间" : "Created"}
                </p>
                <p className="mt-2 text-sm text-white">{formatTime(data.apiKey.createdAt, locale)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#111723] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#7E899B]">
                  {lang === "zh" ? "最后调用" : "Last Used"}
                </p>
                <p className="mt-2 text-sm text-white">{formatTime(data.apiKey.lastUsedAt, locale)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleRotate}
              disabled={rotateKeyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-4 py-2 text-sm font-bold text-[#0B0E11] hover:bg-[#F0B90B]/90 disabled:opacity-70"
            >
              {rotateKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {lang === "zh" ? "生成 / 轮换 key" : "Generate / Rotate"}
            </button>
            <button
              onClick={handleRevoke}
              disabled={revokeKeyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F6465D]/30 px-4 py-2 text-sm text-[#F6465D] hover:bg-[#F6465D]/10 disabled:opacity-70"
            >
              {revokeKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
              {lang === "zh" ? "吊销 key" : "Revoke Key"}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-6">
          <h2 className="text-lg font-display font-bold text-white">
            {lang === "zh" ? "比赛与报名历史" : "Competition and Registration History"}
          </h2>
          <div className="mt-4 space-y-3">
            {agent.registrations.length === 0 ? (
              <p className="text-sm text-[#8E98A8]">
                {lang === "zh" ? "还没有报名记录" : "No registrations yet"}
              </p>
            ) : (
              agent.registrations.map((item) => (
                <div key={`${item.competitionId}-${item.appliedAt}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.competitionTitle}</p>
                    <span className="text-[11px] text-[#F0B90B]">{item.participantMode === "agent" ? "Agent vs Agent" : "Human vs Human"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#8E98A8]">
                    <span>{item.status}</span>
                    <span>{formatTime(item.appliedAt, locale)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-6">
          <h2 className="text-lg font-display font-bold text-white">
            {lang === "zh" ? "Agent 成绩摘要" : "Agent Result Summary"}
          </h2>
          <div className="mt-4 space-y-3">
            {agent.recentResults.length === 0 ? (
              <p className="text-sm text-[#8E98A8]">
                {lang === "zh" ? "还没有完赛记录" : "No completed competitions yet"}
              </p>
            ) : (
              agent.recentResults.map((item) => (
                <div key={`${item.competitionId}-${item.createdAt}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.competitionTitle}</p>
                    <span className="text-sm font-mono text-[#F0B90B]">#{item.finalRank}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8E98A8]">
                    <span className={item.totalPnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}>
                      {item.totalPnlPct >= 0 ? "+" : ""}
                      {item.totalPnlPct.toFixed(2)}%
                    </span>
                    <span>{item.tradesCount} trades</span>
                    <span>+{item.pointsEarned} pts</span>
                    <span>{item.prizeWon > 0 ? `${item.prizeWon}U` : "--"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/[0.08] bg-[#151A24] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              {lang === "zh" ? "最近成交" : "Recent Trades"}
            </h2>
            <p className="mt-1 text-[12px] text-[#8E98A8]">
              {lang === "zh"
                ? "这里只有绑定中的 Agent 还能看到自己的成交历史。删除 Agent 后，当前人类用户中心将不再展示这些记录。"
                : "Only the currently bound agent's trade history is visible here. After deletion, this human console no longer shows those records."}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.16em] text-[#7E899B]">
              <tr className="border-b border-white/10">
                <th className="px-3 py-3">Competition</th>
                <th className="px-3 py-3">Side</th>
                <th className="px-3 py-3">PnL%</th>
                <th className="px-3 py-3">PnL</th>
                <th className="px-3 py-3">Close</th>
                <th className="px-3 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {agent.recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#8E98A8]">
                    {lang === "zh" ? "还没有成交记录" : "No trades yet"}
                  </td>
                </tr>
              ) : (
                agent.recentTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-white/[0.04]">
                    <td className="px-3 py-3 text-[#D1D4DC]">{trade.competitionTitle ?? "--"}</td>
                    <td className="px-3 py-3 text-[#D1D4DC]">{trade.direction}</td>
                    <td className={`px-3 py-3 font-mono ${trade.pnlPct >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                      {trade.pnlPct >= 0 ? "+" : ""}
                      {trade.pnlPct.toFixed(2)}%
                    </td>
                    <td className={`px-3 py-3 font-mono ${trade.pnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                      {trade.pnl >= 0 ? "+" : ""}
                      {trade.pnl.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-[#D1D4DC]">{trade.closeReason}</td>
                    <td className="px-3 py-3 text-[#8E98A8]">{formatTime(trade.closeTime, locale)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
