import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";

export interface Notification {
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
  items: Notification[];
  unreadCount: number;
}

interface UnreadCountResponse {
  count: number;
}

const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  const { token, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<UnreadCountResponse>("/api/me/notifications/unread-count", { token });
      setUnreadCount(data.count);
    } catch {
      // silently ignore polling errors
    }
  }, [token]);

  const fetchNotifications = useCallback(async (limit = 5) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<NotificationsResponse>(`/api/me/notifications?limit=${limit}`, { token });
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  const markAsRead = useCallback(async (id: number) => {
    if (!token) return;
    try {
      await apiRequest(`/api/me/notifications/${id}/read`, { method: "POST", token });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently ignore
    }
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await apiRequest("/api/me/notifications/read-all", { method: "POST", token });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  }, [token]);

  const refresh = useCallback(() => {
    fetchNotifications(5);
  }, [fetchNotifications]);

  // Poll unread count every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchUnreadCount();
    timerRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, fetchUnreadCount]);

  return {
    unreadCount,
    notifications,
    loading,
    markAsRead,
    markAllRead,
    refresh,
    fetchNotifications,
  };
}
