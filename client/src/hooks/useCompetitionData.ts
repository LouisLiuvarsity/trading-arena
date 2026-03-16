/**
 * React Query hooks for competition data fetching.
 * Replaces raw useEffect + useState patterns with cached, deduplicated queries.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import {
  getCompetitions,
  getCompetitionDetail,
  getCompetitionLeaderboard,
  getCompetitionResults,
  getHubData,
  getAgentCenterData,
  getMatchHistory,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  registerForCompetition,
  withdrawFromCompetition,
  createAgent,
  updateAgent,
  rotateAgentApiKey,
  revokeAgentApiKey,
} from "@/lib/competition-api";
import type { HubData, CompetitionSummary, NotificationItem, AgentCenterData } from "@shared/competitionTypes";

// ─── Query Hooks (Read) ─────────────────────────────────────

export function useHubData() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["hub", token],
    queryFn: () => getHubData(token!),
    enabled: !!token,
  });
}

export function useCompetitions() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["competitions", token],
    queryFn: () => getCompetitions(token),
    enabled: true,
  });
}

export function useCompetitionDetail(slug: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["competition", slug, token],
    queryFn: () => getCompetitionDetail(slug, token),
    enabled: !!slug,
  });
}

export function useCompetitionLeaderboard(slug: string, enabled: boolean) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["competition-leaderboard", slug, token],
    queryFn: () => getCompetitionLeaderboard(slug, token),
    enabled: enabled && !!slug,
  });
}

export function useMatchHistory(limit?: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["match-history", token, limit],
    queryFn: () => getMatchHistory(token!, limit),
    enabled: !!token,
  });
}

export function useNotificationsQuery(limit?: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["notifications", token, limit],
    queryFn: () => getNotifications(token!, limit),
    enabled: !!token,
  });
}

export function useUnreadCount() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["unread-count", token],
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });
}

export function useProfile() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["profile", token],
    queryFn: () => apiRequest<any>("/api/me/profile", { token: token! }),
    enabled: !!token,
  });
}

export function useAchievementsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["achievements", token],
    queryFn: () => apiRequest<any[]>("/api/me/achievements", { token: token! }),
    enabled: !!token,
  });
}

export function useAnalytics() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["analytics", token],
    queryFn: () => apiRequest<any>("/api/me/analytics", { token: token! }),
    enabled: !!token,
  });
}

export function useStatsOverview() {
  return useQuery({
    queryKey: ["stats-overview"],
    queryFn: () => apiRequest<any>("/api/stats/overview"),
  });
}

export function useCountryStats() {
  return useQuery({
    queryKey: ["stats-countries"],
    queryFn: () => apiRequest<any[]>("/api/stats/countries"),
  });
}

export function useInstitutions(limit?: number) {
  return useQuery({
    queryKey: ["stats-institutions", limit],
    queryFn: () => apiRequest<any[]>(`/api/stats/institutions?limit=${limit ?? 50}`),
  });
}

export function useResultsLeaderboard(competitionId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["results-leaderboard", competitionId, token],
    queryFn: () => getCompetitionResults(competitionId, token),
    enabled: !!token && !!competitionId,
  });
}

export function useAgentCenter() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["agent-center", token],
    queryFn: () => getAgentCenterData(token!),
    enabled: !!token,
  });
}

export function useResultsHistory(competitionId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["results-history", token],
    queryFn: () => getMatchHistory(token!),
    enabled: !!token,
    select: (data) => data.find((r) => String(r.competitionId) === String(competitionId)) ?? null,
  });
}

// ─── Mutation Hooks (Write) ──────────────────────────────────

export function useRegister() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: (slug: string) => registerForCompetition(slug, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      qc.invalidateQueries({ queryKey: ["competition"] });
      qc.invalidateQueries({ queryKey: ["hub"] });
    },
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: (body: { username: string; name: string; description?: string }) =>
      createAgent(body, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-center"] });
    },
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: (input: { agentId: number; body: { name?: string; description?: string | null; status?: "active" | "inactive" } }) =>
      updateAgent(input.agentId, input.body, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-center"] });
    },
  });
}

export function useRotateAgentKey() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: () => rotateAgentApiKey(token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-center"] });
    },
  });
}

export function useRevokeAgentKey() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: () => revokeAgentApiKey(token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-center"] });
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: (slug: string) => withdrawFromCompetition(slug, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      qc.invalidateQueries({ queryKey: ["competition"] });
      qc.invalidateQueries({ queryKey: ["hub"] });
    },
  });
}

export function useMarkNotifRead() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest("/api/me/profile", { method: "PUT", token: token!, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
