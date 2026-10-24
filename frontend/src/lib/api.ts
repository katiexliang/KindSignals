// Typed fetch client for the KindSignals backend.
// Base URL comes from VITE_API_BASE_URL (default http://localhost:8000).
//
// Auth: a session token (from login/signup) is stored in localStorage and sent
// as an Authorization: Bearer header on every request. The token carries only
// a signed user id — never the password.

import type {
  AuthResponse,
  BuddyResponse,
  ConnectedSources,
  LoginRequest,
  OnboardingRequest,
  ProvidersResponse,
  SignupRequest,
  UserOut,
  UserUpdate,
  HealthStatus,
  DayInsightsResponse,
  InsightsResponse,
  SignalsSummary,
  JournalEntry,
  JournalEntryInput,
  MetricsSummary,
  MetricsTrends,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

const TOKEN_KEY = "kindsignals.token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage failures */
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
    );
  }
  if (!res.ok) {
    // Surface the backend's detail message when available.
    let detail = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  baseUrl: API_BASE_URL,
  getToken,
  setToken,

  // --- Auth ---
  signup: async (payload: SignupRequest) => {
    const res = await request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(res.token);
    return res;
  },
  login: async (payload: LoginRequest) => {
    const res = await request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(res.token);
    return res;
  },
  me: () => request<UserOut>("/api/auth/me"),
  completeOnboarding: (payload: OnboardingRequest) =>
    request<UserOut>("/api/auth/onboarding", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () => setToken(null),

  // --- Health ---
  getHealth: () => request<HealthStatus>("/api/health"),

  // --- Data (all require auth) ---
  getMetricsSummary: () => request<MetricsSummary>("/api/metrics/summary"),
  getMetricsTrends: () => request<MetricsTrends>("/api/metrics/trends"),
  getJournal: () => request<JournalEntry[]>("/api/journal"),
  createJournalEntry: (entry: JournalEntryInput) =>
    request<JournalEntry>("/api/journal", {
      method: "POST",
      body: JSON.stringify(entry),
    }),
  getInsights: () => request<InsightsResponse>("/api/insights"),
  getDayInsights: () => request<DayInsightsResponse>("/api/insights/days"),
  getSignalsSummary: () =>
    request<SignalsSummary>("/api/insights/signals-summary"),
  askBuddy: (
    question: string,
    history: { role: string; text: string }[] = [],
  ) =>
    request<BuddyResponse>("/api/buddy/ask", {
      method: "POST",
      body: JSON.stringify({ question, history }),
    }),

  // --- Profile + connections ---
  getUser: () => request<UserOut>("/api/user"),
  updateUser: (patch: UserUpdate) =>
    request<UserOut>("/api/user", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  getConnectedSources: () => request<ConnectedSources>("/api/user/connected"),
  deleteAccount: async (): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/user`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      let detail = "Could not delete account";
      try {
        const body = await res.json();
        if (body?.detail) detail = String(body.detail);
      } catch {
        /* ignore */
      }
      throw new ApiError(detail, res.status);
    }
    setToken(null);
  },
  getProviders: () => request<ProvidersResponse>("/api/connections"),
  connectProvider: (provider: string) =>
    request<ProvidersResponse>(`/api/connections/${provider}/connect`, {
      method: "POST",
    }),
  disconnectProvider: (provider: string) =>
    request<ProvidersResponse>(`/api/connections/${provider}/disconnect`, {
      method: "POST",
    }),

  // --- Summary PDF (auth-protected -> fetch as blob, then download) ---
  downloadSummaryPdf: async (): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/summary/pdf`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new ApiError("Could not download PDF", res.status);
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? "kindsignals-summary.pdf";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
