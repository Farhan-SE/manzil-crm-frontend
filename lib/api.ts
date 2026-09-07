const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ACCESS_TOKEN_KEY = "access_token";

type JwtPayload = {
  id: number;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  exp?: number;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function decodeJwtExp(token: string): number {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === "number" ? payload.exp * 1000 : 0;
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Returns the token only if it exists AND is not expired (with 30s buffer). */
export function getValidToken(): string | null {
  const token = readStoredToken();
  if (!token) return null;
  const exp = decodeJwtExp(token);
  if (exp && exp < Date.now() + 30_000) {
    clearToken();
    return null;
  }
  return token;
}

export function setToken(token: string, remember: boolean) {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export type SessionUser = {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
};

/** Decodes the current access token's payload — the JWT is the only source of the caller's identity on the client. */
export function getSessionUser(): SessionUser | null {
  const token = getValidToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    first_name: payload.first_name ?? "",
    last_name: payload.last_name ?? "",
  };
}

export function isAdmin(): boolean {
  return getSessionUser()?.role === "admin";
}

function onUnauthorized() {
  clearToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unauthorized"));
  }
}

/** For routes that need a Bearer token attached — not used by login/forgotPassword below. */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getValidToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  // 401 means the session itself is invalid — log out. 403 means a valid, logged-in
  // user just lacks permission (e.g. an agent hitting an admin-only route), which
  // should surface as a normal error, not force a logout.
  if (res.status === 401) {
    onUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message ?? res.statusText;
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// login/forgotPassword are public endpoints — a 400/403/404 here is a normal
// validation-style error to show the user, not a "session expired" signal, so
// these use plain fetch() rather than apiFetch's onUnauthorized handling.

export type LoginResponse = { access_token: string };

export async function login(email: string, password: string, remember = false): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message ?? "Invalid email or password.";
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  const data: LoginResponse = await res.json();
  setToken(data.access_token, remember);
  return data;
}

export type ForgotPasswordResponse = { status: string; message: string };

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message ?? "Something went wrong. Please try again.";
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  return res.json();
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export type LeadTemperature = "HOT" | "WARM" | "COLD";

export type Lead = {
  id: string;
  client_name: string;
  client_number: string;
  interest_id: string | null;
  category_id: string | null;
  city: string | null;
  area: string | null;
  budget: number | null;
  source_id: string | null;
  temperature: LeadTemperature;
  stage: string;
  assigned_to: { id: number; first_name: string; last_name: string } | null;
  created_by: { id: number; first_name: string; last_name: string } | null;
  created_at: string;
  updated_at: string;
};

export type LeadsResponse = { data: Lead[]; total: number; page: number; limit: number };

export type LeadsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  temperature?: string;
  interest_id?: string;
  category_id?: string;
  source_id?: string;
  assigned_to_id?: number;
  budget_min?: number;
  budget_max?: number;
};

function buildQueryString(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const q = qs.toString();
  return q ? `?${q}` : "";
}

export const getLeads = (params: LeadsQuery = {}) =>
  apiFetch<LeadsResponse>(`/leads${buildQueryString(params)}`);

/** Latest non-closed leads — scoped to the caller's own leads for agents, all leads for admins. */
export const getActiveLeads = (limit = 5) => apiFetch<Lead[]>(`/leads/active${buildQueryString({ limit })}`);

export const getLead = (id: string) => apiFetch<Lead>(`/leads/${id}`);

export type CreateLeadInput = {
  client_name: string;
  client_number: string;
  interest_id?: string;
  category_id?: string;
  city?: string;
  area?: string;
  budget?: number;
  source_id?: string;
  temperature?: LeadTemperature;
  assigned_to_id?: number;
};

export const createLead = (dto: CreateLeadInput) =>
  apiFetch<Lead>("/leads", { method: "POST", body: JSON.stringify(dto) });

export type UpdateLeadInput = Partial<CreateLeadInput> & { stage?: string };

/** Returns the updated lead, so callers can refresh their copy without a follow-up GET. */
export const updateLead = (id: string, dto: UpdateLeadInput) =>
  apiFetch<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(dto) });

export const deleteLead = (id: string) =>
  apiFetch<{ message: string }>(`/leads/${id}`, { method: "DELETE" });

// ── Interests, Sources & Categories ───────────────────────────────────────────

export type Interest = { id: string; name: string; created_at: string; updated_at: string };
export type Source = { id: string; name: string; created_at: string; updated_at: string };
export type Category = { id: string; name: string; created_at: string; updated_at: string };

export const getInterests = () => apiFetch<Interest[]>("/interests");
export const getSources = () => apiFetch<Source[]>("/sources");
export const getCategories = () => apiFetch<Category[]>("/categories");

// ── Agents ────────────────────────────────────────────────────────────────────

export type Agent = { id: number; first_name: string; last_name: string };

export const getAgents = () => apiFetch<Agent[]>("/auth/agents");

// ── Follow-ups ────────────────────────────────────────────────────────────────

export type FollowUp = {
  id: string;
  text: string;
  due_date: string;
  due_time: string;
  completed: boolean;
  lead: {
    id: string;
    client_name: string;
    client_number: string;
    stage: string;
    city: string | null;
    area: string | null;
    assigned_to: { id: number; first_name: string; last_name: string } | null;
  };
  created_at: string;
  updated_at: string;
};

export const getFollowUps = (params: { lead_id?: string; limit?: number } = {}) =>
  apiFetch<FollowUp[]>(`/follow-ups${buildQueryString(params)}`);

/** Everything due today, scoped to the caller's leads for agents. Filters mirror the leads list. */
export const getTodayFollowUps = (params: Omit<LeadsQuery, "page" | "limit"> = {}) =>
  apiFetch<FollowUp[]>(`/follow-ups/today${buildQueryString(params)}`);

export type CreateFollowUpInput = { lead_id: string; text: string; due_date: string; due_time: string };

export const createFollowUp = (dto: CreateFollowUpInput) =>
  apiFetch<{ message: string }>("/follow-ups", { method: "POST", body: JSON.stringify(dto) });

export const setFollowUpCompleted = (id: string, completed: boolean) =>
  apiFetch<{ message: string }>(`/follow-ups/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
