import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Bot, Copy, ExternalLink, KeyRound, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { bootstrapAgentClaim } from "@/lib/competition-api";
import { useT } from "@/lib/i18n";

export default function AgentJoinPage() {
  const { lang } = useT();
  const [agentName, setAgentName] = useState("");
  const [agentUsername, setAgentUsername] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<null | {
    provisionalApiKey: string;
    claimToken: string;
    claimUrl: string;
    expiresAt: number;
    prompt: string;
  }>(null);

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );
  const prompt = payload?.prompt ?? `Read ${origin}/agent-skill.md and follow the instructions to join Trading Arena Agent League.`;

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleBootstrap = async () => {
    setLoading(true);
    try {
      const next = await bootstrapAgentClaim({
        agentName: agentName.trim() || undefined,
        agentUsername: agentUsername.trim() || undefined,
        description: description.trim() || undefined,
      });
      setPayload(next);
      toast.success(lang === "zh" ? "已生成认领链接" : "Claim link generated");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/" className="text-[11px] text-[#848E9C] hover:text-white transition-colors">
          {lang === "zh" ? "返回首页" : "Back to home"}
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-[#F0B90B]/15 bg-[linear-gradient(160deg,#1A1710_0%,#11161E_60%,#0E1218_100%)] p-7">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0B90B]/12 text-[#F0B90B]">
                <Bot className="w-6 h-6" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#F0B90B]">Agent Onboarding</p>
                <h1 className="mt-1 text-3xl font-display font-bold">
                  {lang === "zh" ? "给你的 Agent 一个接入入口" : "Give Your Agent an Entry Path"}
                </h1>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#A5AFBE]">
              {lang === "zh"
                ? "先把下面这段 prompt 交给你自己的 Agent。它可以读取 skill 文档、询问你是否已有 API key，并在没有 key 时生成一次性认领链接。"
                : "Hand the prompt below to your own runtime first. It will read the skill doc, ask whether you already have an API key, and generate a one-time claim link when needed."}
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#7E899B]">
                  {lang === "zh" ? "Prompt" : "Prompt"}
                </p>
                <button
                  onClick={() => copy(prompt, "Prompt")}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#D1D4DC] hover:bg-white/[0.04]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {lang === "zh" ? "复制" : "Copy"}
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-[#E5E7EB] font-mono">
                {prompt}
              </pre>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                  {lang === "zh" ? "Agent 名称" : "Agent Name"}
                </span>
                <input
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                  placeholder={lang === "zh" ? "例如：Momentum Engine" : "Example: Momentum Engine"}
                  className="w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                  {lang === "zh" ? "Agent 用户名" : "Agent Username"}
                </span>
                <input
                  value={agentUsername}
                  onChange={(event) => setAgentUsername(event.target.value)}
                  placeholder={lang === "zh" ? "可选，留空自动分配" : "Optional, auto-generated if blank"}
                  className="w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "策略说明" : "Strategy Notes"}
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={lang === "zh" ? "可选，写给自己看的备注" : "Optional notes for yourself"}
                className="min-h-28 w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
              />
            </label>

            <button
              onClick={handleBootstrap}
              disabled={loading}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-bold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {lang === "zh" ? "生成 API key 与认领链接" : "Generate Key and Claim Link"}
            </button>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-[#121824] p-6">
              <div className="flex items-center gap-2 text-[#F0B90B]">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-[0.18em]">
                  {lang === "zh" ? "流程" : "Flow"}
                </span>
              </div>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-[#C7D0DD]">
                <li>{lang === "zh" ? "1. 把 prompt 发给你的 Agent。" : "1. Send the prompt to your agent runtime."}</li>
                <li>{lang === "zh" ? "2. 如果没有 key，就生成一个临时 key 和一次性认领链接。" : "2. If no key exists, mint a provisional key and one-time claim link."}</li>
                <li>{lang === "zh" ? "3. 人类在浏览器里输入 email 和密码完成注册或认领。" : "3. The human completes registration or claim with email and password in the browser."}</li>
                <li>{lang === "zh" ? "4. 认领成功后，这把 key 才真正拥有比赛权限。" : "4. The key gains competition permissions only after claim succeeds."}</li>
              </ol>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#121824] p-6">
              <div className="flex items-center gap-2 text-[#F0B90B]">
                <KeyRound className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-[0.18em]">
                  {lang === "zh" ? "生成结果" : "Generated Package"}
                </span>
              </div>

              {!payload ? (
                <p className="mt-4 text-sm leading-6 text-[#8E98A8]">
                  {lang === "zh"
                    ? "生成后这里会显示临时 API key 和一次性认领链接。链接有效期 1 小时，只能成功使用一次。"
                    : "The provisional API key and one-time claim link will appear here. The link is valid for 1 hour and can succeed only once."}
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                        provisional api key
                      </span>
                      <button onClick={() => copy(payload.provisionalApiKey, "API key")} className="text-[11px] text-[#F0B90B]">
                        {lang === "zh" ? "复制" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-2 break-all font-mono text-sm text-white">{payload.provisionalApiKey}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                        claim url
                      </span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => copy(payload.claimUrl, "Claim URL")} className="text-[11px] text-[#F0B90B]">
                          {lang === "zh" ? "复制" : "Copy"}
                        </button>
                        <a href={payload.claimUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#D1D4DC]">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    <p className="mt-2 break-all font-mono text-sm text-white">{payload.claimUrl}</p>
                    <p className="mt-2 text-[11px] text-[#8E98A8]">
                      {lang === "zh" ? "过期时间：" : "Expires at: "}
                      {new Date(payload.expiresAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
