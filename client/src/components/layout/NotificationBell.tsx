import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";

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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { unreadCount, notifications, markAsRead, markAllRead, refresh } = useNotifications();

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#F6465D] text-white text-[9px] font-bold rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1C2030] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <span className="text-[#D1D4DC] text-xs font-display font-bold">通知</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-[#F0B90B] hover:underline"
              >
                全部已读
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[#848E9C] text-xs">暂无通知</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-white/[0.03] transition-colors ${
                    !n.isRead ? "bg-[#F0B90B]/[0.03]" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      !n.isRead ? "bg-[#0ECB81]" : "bg-transparent border border-[#848E9C]/40"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-medium truncate ${
                          !n.isRead ? "text-[#D1D4DC]" : "text-[#848E9C]"
                        }`}>
                          {n.title}
                        </span>
                        <span className="text-[9px] text-[#848E9C] whitespace-nowrap shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {n.message && (
                        <p className="text-[10px] text-[#848E9C] mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[rgba(255,255,255,0.08)]">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="text-[10px] text-[#F0B90B] hover:underline w-full text-center"
            >
              查看全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
