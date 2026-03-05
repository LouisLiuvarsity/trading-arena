import { useT } from "@/lib/i18n";
import { useNotificationsQuery, useMarkNotifRead, useMarkAllRead } from "@/hooks/useCompetitionData";
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

const TYPE_ICONS: Record<string, string> = {
  competition_selected: "\uD83D\uDFE2",
  competition_end: "\uD83C\uDFC1",
  competition_start: "\uD83D\uDE80",
  prize_awarded: "\uD83D\uDCB0",
  rank_change: "\uD83D\uDCCA",
  achievement: "\uD83C\uDFC6",
  system: "\uD83D\uDD14",
};

export default function NotificationsPage() {
  const { t } = useT();
  const [, navigate] = useLocation();

  const { data: notifData, isLoading: loading, error: queryError } = useNotificationsQuery(50);
  const markReadMutation = useMarkNotifRead();
  const markAllReadMutation = useMarkAllRead();

  const notifications: NotificationItem[] = (notifData as any)?.items ?? [];
  const unreadCount: number = (notifData as any)?.unreadCount ?? 0;

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return t('notifpage.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('notifpage.minutesAgo', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifpage.hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    return t('notifpage.daysAgo', { n: days });
  }

  async function handleMarkAllRead() {
    try {
      await markAllReadMutation.mutateAsync();
    } catch {
      // silently ignore
    }
  }

  async function handleNotificationClick(n: NotificationItem) {
    if (!n.isRead) {
      try {
        await markReadMutation.mutateAsync(n.id);
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

  if (queryError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
          <p className="text-[#F6465D] text-sm mb-2">{t('common.loadFailed')}</p>
          <p className="text-[#848E9C] text-xs">{(queryError as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">{t('notifpage.title')}</h1>
          {unreadCount > 0 && (
            <p className="text-[#848E9C] text-[10px] mt-0.5">
              {t('notifpage.unread', { n: unreadCount })}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors border border-[rgba(255,255,255,0.08)]"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t('notifpage.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl p-12 text-center">
          <BellOff className="w-8 h-8 text-[#848E9C]/40 mx-auto mb-3" />
          <p className="text-[#848E9C] text-sm">{t('notifpage.empty')}</p>
          <p className="text-[#848E9C]/60 text-xs mt-1">{t('notifpage.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const icon = TYPE_ICONS[n.type] ?? "\uD83D\uDD14";
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
                  <div className="mt-0.5 shrink-0">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        !n.isRead
                          ? "bg-[#0ECB81]"
                          : "border border-[#848E9C]/30"
                      }`}
                    />
                  </div>

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
                        {t('common.viewDetails')}
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
