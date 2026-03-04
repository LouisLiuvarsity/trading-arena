import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useLocation } from "wouter";
import { Loader2, CheckCheck, BellOff } from "lucide-react";

interface NotificationItem {
  id: number;
  arenaAccountId: number;
  type: string;
  title: string;
  message: string | null;
  competitionId: number | null;
  actionUrl: string | null;
  isRead: number;
  createdAt: number;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const TYPE_ICONS: Record<string, string> = {
  competition_selected: "🟢",
  competition_end: "🏁",
  competition_start: "🚀",
  prize_awarded: "💰",
  rank_change: "📊",
  achievement: "🏆",
  system: "🔔",
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all notifications
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<NotificationsResponse>(
          "/api/me/notifications?limit=50",
          { token }
        );
        if (!cancelled) {
          setNotifications(data.items);
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleMarkAllRead() {
    if (!token) return;
    try {
      await apiRequest("/api/me/notifications/read-all", { method: "POST", token });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  }

  async function handleNotificationClick(n: NotificationItem) {
    if (!n.isRead && token) {
      try {
        await apiRequest(`/api/me/notifications/${n.id}/read`, { method: "POST", token });
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: 1 } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently ignore
      }
    }
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#F0B90B] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">加载失败</p>
          <p className="text-[#848E9C] text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">通知中心</h1>
          {unreadCount > 0 && (
            <p className="text-[#848E9C] text-[10px] mt-0.5">
              {unreadCount} 条未读
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors border border-[rgba(255,255,255,0.08)]"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            全部已读
          </button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-12 text-center">
          <BellOff className="w-8 h-8 text-[#848E9C]/40 mx-auto mb-3" />
          <p className="text-[#848E9C] text-sm">暂无通知</p>
          <p className="text-[#848E9C]/60 text-xs mt-1">参加比赛后将收到相关通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const icon = TYPE_ICONS[n.type] ?? "🔔";
            return (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left bg-[#1C2030] border rounded-xl p-4 transition-colors ${
                  !n.isRead
                    ? "border-[#F0B90B]/20 bg-[#F0B90B]/[0.02] hover:bg-[#F0B90B]/[0.05]"
                    : "border-[rgba(255,255,255,0.08)] hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Read indicator */}
                  <div className="mt-0.5 shrink-0">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        !n.isRead
                          ? "bg-[#0ECB81]"
                          : "border border-[#848E9C]/30"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[12px] font-medium ${
                        !n.isRead ? "text-[#D1D4DC]" : "text-[#848E9C]"
                      }`}>
                        {icon} {n.title}
                      </span>
                      <span className="text-[9px] text-[#848E9C] whitespace-nowrap shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.message && (
                      <p className={`text-[11px] mt-1 leading-relaxed ${
                        !n.isRead ? "text-[#D1D4DC]/80" : "text-[#848E9C]"
                      }`}>
                        {n.message}
                      </p>
                    )}
                    {n.actionUrl && (
                      <span className="inline-block mt-1.5 text-[9px] text-[#F0B90B]">
                        查看详情 →
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
