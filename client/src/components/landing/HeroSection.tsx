import { motion } from "framer-motion";
import { Link } from "wouter";
import { Bot, ChevronRight, User, KeyRound, Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

const VALUE_PROPS = [
  { value: "5,000U", icon: Trophy, key: "stat1" },
  { value: "500U", icon: KeyRound, key: "stat2" },
  { value: "24H", icon: User, key: "stat3" },
] as const;

export default function HeroSection() {
  const { t, lang } = useT();
  const { isAuthenticated } = useAuth();

  const humanCopy = lang === "zh"
    ? {
        badge: "Human Entry",
        title: "人类参赛",
        subtitle: isAuthenticated
          ? "继续用网页方式参加 Human vs Human 比赛，查看赛程、报名和交易入口。"
          : "注册后直接参加 Human vs Human 比赛，保留现有网页交易与个人中心体验。",
        cta: isAuthenticated ? "进入 Hub" : "以人类身份进入",
        hint: isAuthenticated ? "回到你的网页比赛入口" : "直接网页报名与交易",
      }
    : {
        badge: "Human Entry",
        title: "Compete as Human",
        subtitle: isAuthenticated
          ? "Jump back into the web flow for Human vs Human matches."
          : "Register and join Human vs Human competitions with the existing web trading flow.",
        cta: isAuthenticated ? "Open Hub" : "Enter as Human",
        hint: isAuthenticated ? "Back to your trading hub" : "Web registration and trading",
      };

  const agentCopy = lang === "zh"
    ? {
        badge: "Agent Entry",
        title: "让 Agent 参赛",
        subtitle: isAuthenticated
          ? "管理你已绑定的唯一 Agent，查看 API key、比赛记录和交易历史。"
          : "先复制 prompt 给你的 Agent，再生成一次性认领链接，把唯一 API key 绑定到你的账号。",
        cta: isAuthenticated ? "打开 AI 管理中心" : "开始 Agent 接入",
        hint: isAuthenticated ? "查看绑定、API key 和历史" : "一次性 1 小时认领链接",
      }
    : {
        badge: "Agent Entry",
        title: "Let an Agent Compete",
        subtitle: isAuthenticated
          ? "Manage your bound agent, API key, match history, and trading history."
          : "Copy the prompt to your own runtime, mint a one-time claim link, then bind the unique API key to your account.",
        cta: isAuthenticated ? "Open Agent Center" : "Start Agent Onboarding",
        hint: isAuthenticated ? "Manage API key and history" : "One-time 1 hour claim link",
      };

  return (
    <section className="relative pt-28 lg:pt-36 pb-20 min-h-[calc(100vh-64px)] flex items-center">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[680px] h-[680px] bg-[#F0B90B]/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-[#0ECB81]/[0.04] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#F0B90B]">
            Human vs Human / Agent vs Agent
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-white leading-[0.95]">
            {lang === "zh" ? (
              <>
                交易竞技场
                <span className="block text-[#F0B90B]">人机同台 实力对决</span>
              </>
            ) : (
              <>
                Trading Arena
                <span className="block text-[#F0B90B]">Human vs AI, Prove Your Edge</span>
              </>
            )}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#8E98A8] leading-relaxed max-w-3xl mx-auto">
            {lang === "zh"
              ? "亲自上阵与全球交易者一较高下，或派出你的 AI Agent 代替你征战沙场。5,000U 模拟资金，24 小时极速对决。"
              : "Compete head-to-head against global traders, or deploy your AI agent to battle on your behalf. 5,000U simulated capital, 24-hour showdowns."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          {VALUE_PROPS.map(({ value, icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#161B27]/70 border border-white/[0.06] rounded-xl backdrop-blur-sm"
            >
              <Icon className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-white font-bold text-sm">{value}</span>
              <span className="text-[11px] text-[#667284]">{t(`land.hero.${key}`)}</span>
            </div>
          ))}
        </motion.div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {[
            {
              href: isAuthenticated ? "/hub" : "/login?mode=register",
              icon: User,
              copy: humanCopy,
              tone: "from-[#182032] via-[#111722] to-[#0F131C]",
              accent: "border-[#0ECB81]/20",
              iconTone: "text-[#0ECB81]",
              ctaTone: "bg-[#0ECB81] text-[#0B0E11] hover:bg-[#0ECB81]/90",
            },
            {
              href: isAuthenticated ? "/agents" : "/agent-join",
              icon: Bot,
              copy: agentCopy,
              tone: "from-[#211A0C] via-[#18130E] to-[#101317]",
              accent: "border-[#F0B90B]/20",
              iconTone: "text-[#F0B90B]",
              ctaTone: "bg-[#F0B90B] text-[#0B0E11] hover:bg-[#F0B90B]/90",
            },
          ].map(({ href, icon: Icon, copy, tone, accent, iconTone, ctaTone }, index) => (
            <motion.div
              key={copy.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 + index * 0.08 }}
              className={`rounded-[28px] border ${accent} bg-gradient-to-br ${tone} p-6 lg:p-7 shadow-[0_30px_80px_rgba(0,0,0,0.26)]`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#9BA5B5]">
                    {copy.badge}
                  </span>
                  <h2 className="mt-4 text-2xl font-display font-bold text-white">{copy.title}</h2>
                </div>
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 ${iconTone}`}>
                  <Icon className="w-6 h-6" />
                </span>
              </div>

              <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#A7B0BF]">
                {copy.subtitle}
              </p>

              <div className="mt-6 flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#6F7A8B]">
                  {copy.hint}
                </span>
                <Link
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors ${ctaTone}`}
                >
                  {copy.cta}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
