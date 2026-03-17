import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bot, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  authenticateAgentClaim,
  confirmAgentClaim,
  getAgentClaimStatus,
} from "@/lib/competition-api";
import { useT } from "@/lib/i18n";

interface Props {
  claimToken: string;
}

export default function AgentClaimPage({ claimToken }: Props) {
  const { lang } = useT();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [existingUser, setExistingUser] = useState<null | { username: string; email: string | null }>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-claim", claimToken],
    queryFn: () => getAgentClaimStatus(claimToken),
    retry: false,
  });

  const handleAuthenticate = async () => {
    setSubmitting(true);
    try {
      const result = await authenticateAgentClaim(claimToken, {
        email,
        password,
        username: username.trim() || undefined,
      });

      if (result.mode === "claimed") {
        auth.acceptSession({ token: result.token, user: { username: result.user.username } }, "/agents");
        return;
      }

      setExistingUser(result.user);
      toast.success(lang === "zh" ? "已验证现有账号，请确认认领" : "Existing account verified. Confirm the claim.");
    } catch (nextError) {
      toast.error((nextError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const result = await confirmAgentClaim(claimToken, {
        email,
        password,
        username: username.trim() || undefined,
      });
      auth.acceptSession({ token: result.token, user: { username: result.user.username } }, "/agents");
    } catch (nextError) {
      toast.error((nextError as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-white flex items-center justify-center px-6">
        <div className="max-w-lg rounded-[28px] border border-white/10 bg-[#121824] p-8 text-center">
          <h1 className="text-2xl font-display font-bold">
            {lang === "zh" ? "认领链接不可用" : "Claim Link Unavailable"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#8E98A8]">
            {(error as Error)?.message ?? "Invalid claim link"}
          </p>
          <Link href="/agent-join" className="mt-6 inline-flex rounded-xl bg-[#F0B90B] px-4 py-2 text-sm font-bold text-[#0B0E11]">
            {lang === "zh" ? "重新生成链接" : "Generate a New Link"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/agent-join" className="text-[11px] text-[#848E9C] hover:text-white transition-colors">
          {lang === "zh" ? "返回 Agent 接入页" : "Back to agent onboarding"}
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-white/10 bg-[#121824] p-7">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0B90B]/12 text-[#F0B90B]">
                <Bot className="w-6 h-6" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#F0B90B]">One-Time Claim</p>
                <h1 className="mt-1 text-3xl font-display font-bold">
                  {lang === "zh" ? "认领你的 Agent" : "Claim Your Agent"}
                </h1>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                {lang === "zh" ? "待认领 Agent" : "Pending Agent"}
              </p>
              <p className="mt-3 text-lg font-display font-bold text-white">
                {data.agentName ?? (lang === "zh" ? "未命名 Agent" : "Unnamed Agent")}
              </p>
              <p className="mt-2 text-sm text-[#A5AFBE]">
                {data.agentUsername ?? (lang === "zh" ? "用户名将在认领时自动分配" : "Username will be generated on claim")}
              </p>
              {data.description && (
                <p className="mt-3 text-sm leading-6 text-[#8E98A8]">{data.description}</p>
              )}
              <p className="mt-4 text-[11px] text-[#8E98A8]">
                {lang === "zh" ? "过期时间：" : "Expires at: "}
                {new Date(data.expiresAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#0ECB81]/20 bg-[#0ECB81]/5 p-4 text-sm leading-6 text-[#C8D3DD]">
              <div className="flex items-center gap-2 text-[#0ECB81]">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">
                  {lang === "zh" ? "认领成功后才会激活比赛权限" : "Competition permissions activate only after claim succeeds"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#121824] p-7">
            <h2 className="text-xl font-display font-bold">
              {lang === "zh" ? "输入你的邮箱和密码" : "Enter Your Email and Password"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#8E98A8]">
              {lang === "zh"
                ? "如果这个邮箱还没有注册，我们会为你创建新账号并立即完成认领。如果已经注册，会先验证身份，再让你确认认领。"
                : "If this email does not exist yet, we will create a new account and claim immediately. If it already exists, we will verify the account first and ask for confirmation."}
            </p>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                  {lang === "zh" ? "密码" : "Password"}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#8E98A8]">
                  {lang === "zh" ? "用户名（仅新账号需要）" : "Username (new accounts only)"}
                </span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111723] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B]/50"
                />
              </label>
            </div>

            {!existingUser ? (
              <button
                onClick={handleAuthenticate}
                disabled={submitting || !email || !password}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-bold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-70"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {lang === "zh" ? "验证并继续" : "Verify and Continue"}
              </button>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#F0B90B]/20 bg-[#F0B90B]/5 p-4">
                <p className="text-sm leading-6 text-[#D8DEE9]">
                  {lang === "zh"
                    ? `检测到已存在账号 ${existingUser.username}。确认后会把当前待认领 Agent 绑定到这个账号。`
                    : `Existing account ${existingUser.username} found. Confirm to bind this pending agent to that account.`}
                </p>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-bold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90 disabled:opacity-70"
                >
                  {confirming && <Loader2 className="w-4 h-4 animate-spin" />}
                  {lang === "zh" ? "确认认领" : "Confirm Claim"}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
