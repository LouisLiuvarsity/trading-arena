import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { ArrowUpRight, Bot, Calendar, Home, Trophy, User, BarChart3 } from "lucide-react";

type FlowAction = {
  href: string;
  label: string;
  primary?: boolean;
};

type FlowConfig = {
  matches: string[];
  eyebrow: string;
  title: string;
  description: string;
  actions: FlowAction[];
};

function matchesPath(pathname: string, matches: string[]): boolean {
  return matches.some((pattern) =>
    pathname === pattern || pathname.startsWith(`${pattern}/`),
  );
}

function getFlowConfig(pathname: string, lang: string): FlowConfig {
  const configs: FlowConfig[] =
    lang === "zh"
      ? [
          {
            matches: ["/hub"],
            eyebrow: "登录后首页",
            title: "先看通知、已参加比赛和可报名比赛",
            description: "Hub 负责把当前最重要的动作放到前面，减少你在多个页面之间来回判断。",
            actions: [
              { href: "/competitions", label: "去看比赛", primary: true },
              { href: "/profile", label: "完善个人资料" },
            ],
          },
          {
            matches: ["/competitions"],
            eyebrow: "比赛流程",
            title: "先选比赛，再决定报名、观战或进入比赛",
            description: "Human 比赛可以在网页端报名和进入；Agent 比赛从 AI管理中心走 API 流程。",
            actions: [
              { href: "/leaderboard", label: "看实时排行", primary: true },
              { href: "/agents", label: "打开AI管理中心" },
            ],
          },
          {
            matches: ["/watch"],
            eyebrow: "只读观战",
            title: "这里是 Agent 比赛的围观入口",
            description: "在观战页看实时排名、资金曲线和聊天，不提供任何交易操作。",
            actions: [
              { href: "/leaderboard", label: "查看排行榜", primary: true },
              { href: "/competitions", label: "返回比赛列表" },
            ],
          },
          {
            matches: ["/results"],
            eyebrow: "比赛结果",
            title: "看完结果后，继续回到历史或排行榜",
            description: "结果页适合复盘单场表现，长期走势和更多记录分别在历史和排行榜里查看。",
            actions: [
              { href: "/history", label: "查看比赛历史", primary: true },
              { href: "/leaderboard", label: "查看排行榜" },
            ],
          },
          {
            matches: ["/leaderboard"],
            eyebrow: "排行榜",
            title: "先看实时榜，再决定是否进入比赛或继续观战",
            description: "排行榜负责告诉你谁领先、你在什么位置，以及下一步值不值得参与。",
            actions: [
              { href: "/competitions", label: "去看比赛", primary: true },
              { href: "/stats", label: "看整体统计" },
            ],
          },
          {
            matches: ["/stats"],
            eyebrow: "整体统计",
            title: "从总体数据回到比赛和排行",
            description: "统计页更适合看整体活跃度、国家和机构分布，不负责单场决策。",
            actions: [
              { href: "/leaderboard", label: "回到排行榜", primary: true },
              { href: "/competitions", label: "浏览比赛" },
            ],
          },
          {
            matches: ["/profile", "/history"],
            eyebrow: "个人资料",
            title: "这里管理人类用户资料、历史和个人表现",
            description: "个人资料、机构信息、比赛历史和个人成就都放这里；AI 相关设置单独放在 AI管理中心。",
            actions: [
              { href: "/profile/edit", label: "编辑资料", primary: true },
              { href: "/history", label: "查看比赛历史" },
            ],
          },
          {
            matches: ["/agents"],
            eyebrow: "AI管理中心",
            title: "这里单独管理你的唯一 Agent",
            description: "绑定 Agent、管理 API key、查看报名记录、比赛结果和成交记录，都在这里完成。",
            actions: [
              { href: "/agent-join", label: "绑定或认领Agent", primary: true },
              { href: "/competitions", label: "查看比赛" },
            ],
          },
          {
            matches: ["/notifications"],
            eyebrow: "通知中心",
            title: "通知看完后，回到比赛或历史继续操作",
            description: "通知负责提醒状态变化，真正的动作还是回到比赛页、历史页或 AI管理中心完成。",
            actions: [
              { href: "/hub", label: "回到Hub", primary: true },
              { href: "/history", label: "查看历史" },
            ],
          },
        ]
      : [
          {
            matches: ["/hub"],
            eyebrow: "Start Here",
            title: "See alerts, joined competitions, and open registrations first",
            description: "The Hub surfaces the few actions that matter right now so you do not need to scan multiple pages.",
            actions: [
              { href: "/competitions", label: "Browse competitions", primary: true },
              { href: "/profile", label: "Update profile" },
            ],
          },
          {
            matches: ["/competitions"],
            eyebrow: "Competition Flow",
            title: "Pick a competition first, then register, watch, or enter",
            description: "Human matches can be joined on the web. Agent matches go through the Agent Center and API flow.",
            actions: [
              { href: "/leaderboard", label: "Open leaderboard", primary: true },
              { href: "/agents", label: "Open Agent Center" },
            ],
          },
          {
            matches: ["/watch"],
            eyebrow: "Spectator Mode",
            title: "This is the read-only view for agent competitions",
            description: "Use the spectator page for rankings, curves, and chat. No trading actions are available here.",
            actions: [
              { href: "/leaderboard", label: "View leaderboard", primary: true },
              { href: "/competitions", label: "Back to competitions" },
            ],
          },
          {
            matches: ["/results"],
            eyebrow: "Results",
            title: "After reviewing one result, continue in history or rankings",
            description: "Use the results page for a single-match review, then move to history or rankings for the broader picture.",
            actions: [
              { href: "/history", label: "Open match history", primary: true },
              { href: "/leaderboard", label: "View leaderboard" },
            ],
          },
          {
            matches: ["/leaderboard"],
            eyebrow: "Leaderboard",
            title: "Check the live standings before deciding what to do next",
            description: "The leaderboard is where you judge who leads, where you stand, and whether a match is worth opening.",
            actions: [
              { href: "/competitions", label: "Browse competitions", primary: true },
              { href: "/stats", label: "Open stats" },
            ],
          },
          {
            matches: ["/stats"],
            eyebrow: "Overall Stats",
            title: "Use the big-picture data, then go back to matches and rankings",
            description: "Stats explain activity, countries, and institutions. Match decisions still happen in competitions and rankings.",
            actions: [
              { href: "/leaderboard", label: "Back to leaderboard", primary: true },
              { href: "/competitions", label: "Browse competitions" },
            ],
          },
          {
            matches: ["/profile", "/history"],
            eyebrow: "Profile",
            title: "Manage your human account, history, and personal performance here",
            description: "Your profile, institution details, match history, and personal achievements live here. AI settings stay separate in Agent Center.",
            actions: [
              { href: "/profile/edit", label: "Edit profile", primary: true },
              { href: "/history", label: "Open match history" },
            ],
          },
          {
            matches: ["/agents"],
            eyebrow: "Agent Center",
            title: "Manage your single bound agent here",
            description: "Bind the agent, manage API keys, and review registrations, results, and trades in one place.",
            actions: [
              { href: "/agent-join", label: "Bind or claim agent", primary: true },
              { href: "/competitions", label: "View competitions" },
            ],
          },
          {
            matches: ["/notifications"],
            eyebrow: "Notifications",
            title: "Review the update, then return to the page where action happens",
            description: "Notifications tell you what changed. The actual action still happens in competitions, history, or Agent Center.",
            actions: [
              { href: "/hub", label: "Back to Hub", primary: true },
              { href: "/history", label: "Open history" },
            ],
          },
        ];

  return (
    configs.find((item) => matchesPath(pathname, item.matches)) ??
    (lang === "zh"
      ? {
          matches: [],
          eyebrow: "当前页面",
          title: "保持当前任务，按右侧入口继续下一步",
          description: "主导航负责切页面，右上角 Profile 管理人类账户，AI管理中心只处理 Agent 相关内容。",
          actions: [
            { href: "/hub", label: "回到Hub", primary: true },
            { href: "/competitions", label: "浏览比赛" },
          ],
        }
      : {
          matches: [],
          eyebrow: "Current Page",
          title: "Stay on the current task and use the actions on the right for the next step",
          description: "Use the main navigation to switch pages, the Profile entry for the human account, and Agent Center for agent-only work.",
          actions: [
            { href: "/hub", label: "Back to Hub", primary: true },
            { href: "/competitions", label: "Browse competitions" },
          ],
        })
  );
}

export default function PostLoginFlowBar({ location }: { location: string }) {
  const { t, lang } = useT();
  const flow = getFlowConfig(location, lang);
  const navPills = [
    { href: "/hub", label: t("nav.hub"), icon: Home },
    { href: "/competitions", label: t("nav.competitions"), icon: Calendar },
    { href: "/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
    { href: "/stats", label: t("nav.stats"), icon: BarChart3 },
    { href: "/agents", label: lang === "zh" ? "AI管理中心" : "Agent Center", icon: Bot },
    { href: "/profile", label: t("nav.profile"), icon: User },
  ];

  const isPillActive = (href: string) => location === href || location.startsWith(`${href}/`);

  return (
    <section className="border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(20,24,38,0.96),rgba(13,16,23,0.96))]">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#F0B90B]">{flow.eyebrow}</p>
            <h2 className="mt-2 text-xl font-display font-bold text-white">{flow.title}</h2>
            <p className="mt-2 text-sm text-[#8E98A8]">{flow.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {flow.actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  action.primary
                    ? "bg-[#F0B90B] text-[#0B0E11] hover:bg-[#F0B90B]/90"
                    : "border border-white/10 text-[#D1D4DC] hover:bg-white/[0.04]"
                }`}
              >
                {action.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {navPills.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                isPillActive(item.href)
                  ? "border-[#F0B90B]/25 bg-[#F0B90B]/10 text-[#F0B90B]"
                  : "border-white/[0.08] bg-white/[0.03] text-[#9CA6B7] hover:text-white"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
