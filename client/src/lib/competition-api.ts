/**
 * Client-side API functions for the competition system
 */

import { apiRequest } from "./api";
import type {
  CompetitionSummary,
  HubData,
  MatchResultSummary,
  NotificationItem,
  AgentCenterData,
} from "@shared/competitionTypes";

// ─── Competitions ───────────────────────────────────────────

export async function getCompetitions(token?: string | null) {
  return apiRequest<{ items: CompetitionSummary[]; total: number }>(
    "/api/competitions",
    { token: token ?? undefined },
  );
}

export async function getCompetitionDetail(slug: string, token?: string | null) {
  return apiRequest<any>(`/api/competitions/${slug}`, {
    token: token ?? undefined,
  });
}

export async function getCompetitionLeaderboard(slug: string, token?: string | null) {
  return apiRequest<any[]>(`/api/competitions/${slug}/leaderboard`, {
    token: token ?? undefined,
  });
}

export async function getCompetitionResults(identifier: string, token?: string | null) {
  return apiRequest<any>(`/api/competitions/${identifier}/results`, {
    token: token ?? undefined,
  });
}

export async function registerForCompetition(slug: string, token: string) {
  return apiRequest<{ ok: true }>(`/api/competitions/${slug}/register`, {
    method: "POST",
    token,
  });
}

export async function withdrawFromCompetition(slug: string, token: string) {
  return apiRequest<{ ok: true }>(`/api/competitions/${slug}/withdraw`, {
    method: "POST",
    token,
  });
}

// ─── Hub ────────────────────────────────────────────────────

export async function getHubData(token: string) {
  return apiRequest<HubData>("/api/hub", { token });
}

// Agent Center

export async function getAgentCenterData(token: string) {
  return apiRequest<AgentCenterData>("/api/me/agents", { token });
}

export async function createAgent(
  body: { username: string; name: string; description?: string },
  token: string,
) {
  return apiRequest<{ id: number; username: string; name: string; description: string | null }>(
    "/api/me/agents",
    { method: "POST", token, body },
  );
}

export async function updateAgent(
  agentId: number,
  body: { name?: string; description?: string | null; status?: "active" | "inactive" },
  token: string,
) {
  return apiRequest<{ ok: true }>(`/api/me/agents/${agentId}`, {
    method: "PUT",
    token,
    body,
  });
}

export async function rotateAgentApiKey(token: string) {
  return apiRequest<{ plainKey: string; keyPrefix: string; createdAt: number }>(
    "/api/me/agent-api-key/rotate",
    { method: "POST", token },
  );
}

export async function revokeAgentApiKey(token: string) {
  return apiRequest<{ ok: true }>("/api/me/agent-api-key", {
    method: "DELETE",
    token,
  });
}

// ─── History ────────────────────────────────────────────────

export async function getMatchHistory(token: string, limit?: number) {
  const q = limit ? `?limit=${limit}` : "";
  return apiRequest<MatchResultSummary[]>(`/api/me/history${q}`, { token });
}

// ─── Notifications ──────────────────────────────────────────

export async function getNotifications(token: string, limit?: number) {
  const q = limit ? `?limit=${limit}` : "";
  return apiRequest<{ items: NotificationItem[]; unreadCount: number }>(
    `/api/me/notifications${q}`,
    { token },
  );
}

export async function getUnreadNotificationCount(token: string) {
  return apiRequest<{ count: number }>("/api/me/notifications/unread-count", { token });
}

export async function markNotificationRead(id: number, token: string) {
  return apiRequest<{ ok: true }>(`/api/me/notifications/${id}/read`, {
    method: "POST",
    token,
  });
}

export async function markAllNotificationsRead(token: string) {
  return apiRequest<{ ok: true }>("/api/me/notifications/read-all", {
    method: "POST",
    token,
  });
}

// ─── Seasons ────────────────────────────────────────────────

export async function getSeasons() {
  return apiRequest<any[]>("/api/seasons");
}

// ─── Admin ──────────────────────────────────────────────────

export async function adminCreateSeason(data: any, token: string) {
  return apiRequest<{ id: number }>("/api/admin/seasons", {
    method: "POST",
    token,
    body: data,
  });
}

export async function adminCreateCompetition(data: any, token: string) {
  return apiRequest<{ id: number }>("/api/admin/competitions", {
    method: "POST",
    token,
    body: data,
  });
}

export async function adminUpdateCompetition(id: number, data: any, token: string) {
  return apiRequest<{ ok: true }>(`/api/admin/competitions/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function adminTransitionCompetition(id: number, status: string, token: string) {
  return apiRequest<{ ok: true }>(`/api/admin/competitions/${id}/transition`, {
    method: "POST",
    token,
    body: { status },
  });
}

export async function adminGetRegistrations(competitionId: number, token: string, status?: string) {
  const q = status ? `?status=${status}` : "";
  return apiRequest<any[]>(`/api/admin/competitions/${competitionId}/registrations${q}`, { token });
}

export async function adminReviewRegistration(id: number, decision: string, token: string) {
  return apiRequest<{ ok: true }>(`/api/admin/registrations/${id}/review`, {
    method: "POST",
    token,
    body: { decision },
  });
}

export async function adminBatchReview(competitionId: number, ids: number[], action: string, token: string) {
  return apiRequest<{ ok: true; processed: number }>(
    `/api/admin/competitions/${competitionId}/registrations/batch`,
    { method: "POST", token, body: { action, ids } },
  );
}

export async function adminDuplicateCompetition(id: number, token: string) {
  return apiRequest<{ id: number }>(`/api/admin/competitions/${id}/duplicate`, {
    method: "POST",
    token,
  });
}
