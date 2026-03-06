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
    method?: "GET" | "POST" | "PUT" | "DELETE";
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
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

export async function login(email: string, username: string, password: string) {
  return apiRequest<{ token: string; user: { id: number; username: string } }>("/api/auth/login", {
    method: "POST",
    body: { email, username, password },
  });
}

export async function quickLogin(username: string, password: string) {
  return apiRequest<{ token: string; user: { id: number; username: string } }>("/api/auth/quick-login", {
    method: "POST",
    body: { username, password },
  });
}

export async function checkUsername(username: string) {
  return apiRequest<{ available: boolean }>("/api/auth/check-username", {
    method: "POST",
    body: { username },
  });
}
