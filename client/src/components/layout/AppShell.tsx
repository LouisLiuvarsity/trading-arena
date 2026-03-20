import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { BarChart3, Bot, Calendar, Home, LogOut, Swords, Trophy, User } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import NotificationBell from "./NotificationBell";

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const { t, lang } = useT();
  const { username, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const navItems = [
    { path: "/hub", label: t("nav.hub"), icon: Home },
    { path: "/competitions", label: t("nav.competitions"), icon: Calendar },
    { path: "/ai-arena", label: lang === "zh" ? "VS 对决" : "VS Arena", icon: Swords, accent: true },
    { path: "/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
    { path: "/stats", label: t("nav.stats"), icon: BarChart3 },
    { path: "/agents", label: lang === "zh" ? "AI管理中心" : "Agent Center", icon: Bot },
  ];

  const mobileItems = [
    { path: "/hub", label: t("nav.hub"), icon: Home },
    { path: "/competitions", label: t("nav.competitions"), icon: Calendar },
    { path: "/ai-arena", label: lang === "zh" ? "VS 对决" : "VS", icon: Swords, accent: true },
    { path: "/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
    { path: "/profile", label: t("nav.profile"), icon: User },
  ];

  const isActive = (path: string) => location === path || location.startsWith(path + "/");

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0E11]">
      {!isMobile ? (
        <header className="flex h-12 shrink-0 items-center border-b border-[rgba(255,255,255,0.08)] bg-[#0D1017] px-4">
          <Link href="/hub" className="mr-6 text-sm font-bold text-[#F0B90B] font-display">
            {t("nav.brand")}
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const accent = 'accent' in item && item.accent;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-[#F0B90B]/10 text-[#F0B90B]"
                      : accent && !active
                        ? "text-[#F0B90B]/70 hover:bg-[#F0B90B]/[0.06] hover:text-[#F0B90B]"
                        : "text-[#848E9C] hover:bg-white/[0.03] hover:text-[#D1D4DC]"
                  }`}
                >
                  <item.icon className="mr-1 inline h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <Link
              href="/profile"
              className={`group flex items-center gap-3 rounded-full border px-3 py-1.5 transition-colors ${
                isActive("/profile")
                  ? "border-[#F0B90B]/25 bg-[#F0B90B]/10"
                  : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                  isActive("/profile")
                    ? "bg-[#F0B90B] text-[#0B0E11]"
                    : "bg-white/[0.06] text-[#D1D4DC]"
                }`}
              >
                <User className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] uppercase tracking-[0.18em] text-[#7D8798]">
                  {t("nav.profile")}
                </span>
                <span className="block max-w-[140px] truncate text-[11px] font-medium text-[#D1D4DC] group-hover:text-white">
                  {username}
                </span>
              </span>
            </Link>
            <button onClick={logout} className="text-[#848E9C] transition-colors hover:text-[#F6465D]">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>
      ) : null}

      <main className="flex-1 overflow-auto">{children}</main>

      {isMobile ? (
        <nav className="flex h-14 shrink-0 items-center justify-around border-t border-[rgba(255,255,255,0.08)] bg-[#0D1017] px-2">
          {mobileItems.map((item) => {
            const active = isActive(item.path);
            const accent = 'accent' in item && item.accent;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-1 transition-colors ${
                  active
                    ? "text-[#F0B90B]"
                    : accent
                      ? "text-[#F0B90B]/50"
                      : "text-[#5E6673]"
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
                <span className="max-w-[3.6rem] text-center text-[9px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
