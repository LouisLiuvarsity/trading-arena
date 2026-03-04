import { type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { Home, Calendar, Trophy, BarChart3, User, LogOut, Swords, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import NotificationBell from "./NotificationBell";

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const { t } = useT();
  const { username, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const navItems = [
    { path: "/hub", label: "Hub", icon: Home },
    { path: "/competitions", label: "赛程", icon: Calendar },
    { path: "/leaderboard", label: "排行", icon: Trophy },
    { path: "/stats", label: "统计", icon: BarChart3 },
  ];

  const isActive = (path: string) => location === path || location.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      {/* Desktop Top Nav */}
      {!isMobile && (
        <header className="h-12 border-b border-[rgba(255,255,255,0.08)] bg-[#0D1017] flex items-center px-4 shrink-0">
          <Link href="/hub" className="text-[#F0B90B] font-display font-bold text-sm mr-6">
            逆向Alpha
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  isActive(item.path)
                    ? "bg-[#F0B90B]/10 text-[#F0B90B]"
                    : "text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.03]"
                }`}
              >
                <item.icon className="w-3.5 h-3.5 inline mr-1" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <Link href="/profile" className="text-[11px] text-[#D1D4DC] hover:text-[#F0B90B] transition-colors">
              {username}
            </Link>
            <button onClick={logout} className="text-[#848E9C] hover:text-[#F6465D] transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      {isMobile && (
        <nav className="h-14 border-t border-[rgba(255,255,255,0.08)] bg-[#0D1017] flex items-center justify-around shrink-0 px-2">
          {[
            { path: "/hub", label: "Hub", icon: Home },
            { path: "/competitions", label: "赛程", icon: Calendar },
            { path: "/competitions", label: "比赛", icon: Swords },
            { path: "/leaderboard", label: "排行", icon: Trophy },
            { path: "/profile", label: "我的", icon: User },
          ].map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${
                isActive(item.path)
                  ? "text-[#F0B90B]"
                  : "text-[#5E6673]"
              }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
