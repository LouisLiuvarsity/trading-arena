import { useState } from "react";
import { toast } from "sonner";
import {
  useAgentCenter,
  useCreateAgent,
  useUpdateAgent,
  useRotateAgentKey,
  useRevokeAgentKey,
} from "@/hooks/useCompetitionData";
import { useT } from "@/lib/i18n";
import { Loader2, Cpu, KeyRound, Copy, RefreshCw, ShieldX, Bot, Plus, Activity, Trophy } from "lucide-react";

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

function formatTime(ts: number | null | undefined) {
  if (!ts) return "--";
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgentCenterPage() {
  const { lang } = useT();
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <section className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(240,185,11,0.14),rgba(12,17,25,0.94))] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-3 py-1 text-[11px] font-semibold text-[#F0B90B]">
              <Cpu className="w-3.5 h-3.5" />
              Agent vs Agent
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{copy.title}</h1>
            <p className="text-sm leading-6 text-[#B7BDC6]">{copy.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0E131C]/80 px-4 py-3 text-sm text-[#D1D4DC]">
            <div className="text-[#848E9C] text-[11px]">{copy.capacity}</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-display font-bold text-white">{agentCount}</span>
              <span className="pb-1 text-[#848E9C]">/ {data.maxAgents}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-[#151A24] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold text-white">{copy.apiKey}</h2>
              <p className="text-[12px] text-[#848E9C] mt-1">{copy.maxHint}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0ECB81]/10 px-3 py-1 text-[11px] font-semibold text-[#0ECB81]">
              <KeyRound className="w-3.5 h-3.5" />
              {data.apiKey.exists ? copy.active : "--"}
            </div>
          </div>

          {plainKey && (
            <div className="rounded-2xl border border-[#F0B90B]/25 bg-[#F0B90B]/8 p-4">
              <div className="text-[11px] font-semibold text-[#F0B90B]">{copy.plainKey}</div>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#0E131C] px-3 py-3">
                <code className="flex-1 overflow-x-auto text-[12px] text-[#F8D66D]">{plainKey}</code>
                <button
                  onClick={() => handleCopy(plainKey)}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-[#D1D4DC] hover:bg-white/5"
                >
                  {copy.copy}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/8 bg-[#0E131C] p-4 space-y-2">
            {data.apiKey.exists ? (
              <>
                <div className="text-[12px] text-[#D1D4DC]">
                  Prefix: <span className="font-mono text-white">{data.apiKey.keyPrefix}</span>
                </div>
                <div className="text-[12px] text-[#848E9C]">
                  Created: {formatTime(data.apiKey.createdAt)}
                </div>
                <div className="text-[12px] text-[#848E9C]">
                  Last used: {formatTime(data.apiKey.lastUsedAt)}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-[#848E9C]">{copy.noKey}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRotateKey}
              disabled={rotateKeyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-4 py-2.5 text-sm font-semibold text-[#0B0E11] hover:bg-[#F0B90B]/90 disabled:opacity-50"
            >
              {rotateKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {copy.rotate}
            </button>
            <button
              onClick={handleRevoke}
              disabled={revokeKeyMutation.isPending || !data.apiKey.exists}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F6465D]/30 px-4 py-2.5 text-sm font-semibold text-[#F6465D] hover:bg-[#F6465D]/10 disabled:opacity-50"
            >
              {revokeKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
              {copy.revoke}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151A24] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white">{copy.createTitle}</h2>
            <p className="text-[12px] text-[#848E9C] mt-1">{copy.useApi}</p>
          </div>

          <div className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={copy.username}
              disabled={reachedLimit}
              className="w-full rounded-xl border border-white/10 bg-[#0E131C] px-4 py-3 text-sm text-white placeholder:text-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.name}
              disabled={reachedLimit}
              className="w-full rounded-xl border border-white/10 bg-[#0E131C] px-4 py-3 text-sm text-white placeholder:text-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={copy.description}
              rows={4}
              disabled={reachedLimit}
              className="w-full rounded-xl border border-white/10 bg-[#0E131C] px-4 py-3 text-sm text-white placeholder:text-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none resize-none"
            />
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || reachedLimit || !username.trim() || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0ECB81] px-4 py-2.5 text-sm font-semibold text-[#0B0E11] hover:bg-[#0ECB81]/90 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {copy.create}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {data.agents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#11161F] p-10 text-center text-sm text-[#848E9C]">
            {copy.noAgents}
          </div>
        ) : (
          data.agents.map((agent) => {
            const draft = drafts[agent.arenaAccountId] ?? {
              name: agent.name,
              description: agent.description ?? "",
              status: agent.status as "active" | "inactive",
            };
            return (
              <div key={agent.arenaAccountId} className="rounded-2xl border border-white/10 bg-[#151A24] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0B90B]/10 text-[#F0B90B]">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-lg font-display font-bold text-white">{agent.name}</div>
                        <div className="text-[12px] text-[#848E9C]">@{agent.username}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${draft.status === "active" ? "bg-[#0ECB81]/10 text-[#0ECB81]" : "bg-white/10 text-[#9BA3AF]"}`}>
                        {draft.status === "active" ? copy.active : copy.inactive}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-white/8 bg-[#0E131C] px-3 py-3">
                        <div className="text-[10px] text-[#848E9C]">Season Points</div>
                        <div className="mt-1 text-lg font-mono font-semibold text-white">{Math.round(agent.seasonPoints)}</div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-[#0E131C] px-3 py-3">
                        <div className="text-[10px] text-[#848E9C]">Capital</div>
                        <div className="mt-1 text-lg font-mono font-semibold text-white">{Math.round(agent.capital)}</div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-[#0E131C] px-3 py-3">
                        <div className="text-[10px] text-[#848E9C]">{copy.activeComp}</div>
                        <div className="mt-1 text-sm font-semibold text-white">{agent.activeCompetitionTitle ?? "--"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-xl space-y-3">
                    <input
                      value={draft.name}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [agent.arenaAccountId]: { ...draft, name: e.target.value } }))}
                      className="w-full rounded-xl border border-white/10 bg-[#0E131C] px-4 py-3 text-sm text-white focus:border-[#F0B90B]/50 focus:outline-none"
                    />
                    <textarea
                      value={draft.description}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [agent.arenaAccountId]: { ...draft, description: e.target.value } }))}
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-[#0E131C] px-4 py-3 text-sm text-white focus:border-[#F0B90B]/50 focus:outline-none resize-none"
                    />
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
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0B0E11] hover:bg-white/90 disabled:opacity-50"
                      >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        {copy.save}
                      </button>
                      <button
                        onClick={() => setDrafts((prev) => ({
                          ...prev,
                          [agent.arenaAccountId]: {
                            ...draft,
                            status: draft.status === "active" ? "inactive" : "active",
                          },
                        }))}
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-[#D1D4DC] hover:bg-white/5"
                      >
                        {draft.status === "active" ? copy.disable : copy.enable}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/8 bg-[#0E131C] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Trophy className="w-4 h-4 text-[#F0B90B]" />
                    {copy.recentRegs}
                  </div>
                  {agent.registrations.length === 0 ? (
                    <p className="text-[12px] text-[#848E9C]">--</p>
                  ) : (
                    <div className="space-y-2">
                      {agent.registrations.slice(0, 3).map((item) => (
                        <div key={`${agent.arenaAccountId}-${item.competitionId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-[12px]">
                          <div className="text-[#D1D4DC]">{item.competitionTitle}</div>
                          <div className="flex items-center gap-2 text-[#848E9C]">
                            <span className="rounded-full bg-[#F0B90B]/10 px-2 py-0.5 text-[#F0B90B]">
                              {item.participantMode === "agent" ? "Agent" : "Human"}
                            </span>
                            <span>{item.status}</span>
                            <span>{formatTime(item.startTime)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
