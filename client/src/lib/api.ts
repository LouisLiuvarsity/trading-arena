const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const raw = await res.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export async function login(inviteCode: string, username: string, password: string) {
  return apiRequest<{ token: string; user: { id: number; username: string } }>("/api/auth/login", {
    method: "POST",
    body: { inviteCode, username, password },
  });
}

export async function quickLogin(username: string, password: string) {
  return apiRequest<{ token: string; user: { id: number; username: string } }>("/api/auth/quick-login", {
    method: "POST",
    body: { username, password },
  });
}
