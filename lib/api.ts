const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ACCESS_TOKEN_KEY = "access_token";

type JwtPayload = {
  id: number;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  password_changed?: boolean;
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

/** Presence flag for proxy.ts, which runs on the server and can't read web storage. */
function setSessionCookie(token: string, remember: boolean) {
  const exp = decodeJwtExp(token);
  // Mirrors the storage choice: "keep me signed in" lasts until the token expires, otherwise it ends with the browser session.
  const maxAge = remember && exp ? `; max-age=${Math.max(0, Math.floor((exp - Date.now()) / 1000))}` : "";
  document.cookie = `session=1; path=/; SameSite=Lax${maxAge}`;
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
  setSessionCookie(token, remember);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  document.cookie = "session=; path=/; max-age=0";
}

export type SessionUser = {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  /** False only for a user still on the generated password from add-user. */
  password_changed: boolean;
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
    // Tokens issued before this claim existed shouldn't force the first-login flow.
    password_changed: payload.password_changed ?? true,
  };
}

export function isAdmin(): boolean {
  return getSessionUser()?.role === "admin";
}

function onUnauthorized() {
  clearToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unauthorized"));
    window.location.href = "/";
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

export type TaxonomyRef = { id: string; name: string };

export type LeadTemperature = "HOT" | "WARM" | "COLD";

export type LeadTab = "all" | "new" | "recommended" | "watchlist";

export type DueWindow = "overdue" | "today" | "tomorrow" | "week";

export type Lead = {
  id: string;
  /** The short lead ID shown to users; `id` stays the key for requests. */
  lead_no: number;
  sub_source: string | null;
  is_starred: boolean;
  /** The most recently logged follow-up, if any. */
  last_task: {
    text: string;
    task_type: string | null;
    sub_task: string | null;
    due_date: string;
    completed: boolean;
    /** When it was done, or logged if it is still open. */
    at: string;
  } | null;
  project_id: string | null;
  project: TaxonomyRef | null;
  /** The unit this lead is interested in. */
  unit_id: string | null;
  unit: { id: string; unit_number: string; status: UnitStatus } | null;
  /** Leads linked to the same customer, this one included. */
  client_lead_count: number;
  /** Null only on leads that predate the customer link, or were imported with an unknown number. */
  customer_id: string | null;
  customer: { id: string; customer_no: number; customer_name: string; gender: Gender | null } | null;
  // Copied from the customer by the server.
  client_name: string;
  client_number: string;
  // *_id is what forms bind to; the sibling object carries the name so nothing
  // has to fetch a lookup list just to decode an id.
  interest_id: string | null;
  interest: TaxonomyRef | null;
  category_id: string | null;
  category: TaxonomyRef | null;
  city: string | null;
  area: string | null;
  budget: number | null;
  source_id: string | null;
  source: TaxonomyRef | null;
  temperature: LeadTemperature;
  stage: string;
  /** When the stage became `sold`. */
  sold_at: string | null;
  assigned_to: { id: number; first_name: string; last_name: string; team: string | null } | null;
  created_by: { id: number; first_name: string; last_name: string } | null;
  created_at: string;
  updated_at: string;
};

export type LeadsResponse = {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  tab_counts: Record<LeadTab, number>;
};

export type LeadsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  search_by?: "lead_id" | "name" | "number" | "city";
  project_id?: string;
  /** Leads with an open task due in this window. */
  task_due?: DueWindow;
  /** Leads whose most recent task is of this type. */
  last_task?: string;
  starred?: "true";
  tab?: LeadTab;
  sort?: "asc" | "desc";
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
export type PipelineLead = Lead & {
  /** The soonest unfinished task on the lead. */
  next_task: { text: string; task_type: string | null; due_date: string; due_time: string } | null;
};

export type PipelineStage = {
  id: "inquiry" | "prospect" | "mature" | "pre_closure" | "sold";
  count: number;
  total: number;
  /** The first `per_stage` deals, not all `count` of them. */
  leads: PipelineLead[];
};

export type PipelineQuery = {
  project_id?: string;
  assigned_to_id?: number;
  /** The month the lead came in, as YYYY-MM. */
  period?: string;
  region?: string;
  mine?: "true";
  starred?: "true";
  sort?: "recent" | "value";
  per_stage?: number;
};

export type PipelineResponse = {
  stages: PipelineStage[];
  active_count: number;
  active_value: number;
  regions: string[];
};

export const getPipeline = (params: PipelineQuery = {}) =>
  apiFetch<PipelineResponse>(`/leads/pipeline${buildQueryString(params)}`);

export const getActiveLeads = (limit = 5) => apiFetch<Lead[]>(`/leads/active${buildQueryString({ limit })}`);

export const getLead = (id: string) => apiFetch<Lead>(`/leads/${id}`);

export type CreateLeadInput = {
  /** The lead's client — the server takes the name and number from this customer. */
  customer_id: string;
  interest_id?: string;
  category_id?: string;
  city?: string;
  area?: string;
  budget?: number;
  source_id?: string;
  sub_source?: string;
  temperature?: LeadTemperature;
  assigned_to_id?: number;
};

export const createLead = (dto: CreateLeadInput) =>
  apiFetch<Lead>("/leads", { method: "POST", body: JSON.stringify(dto) });

export type UpdateLeadInput = Partial<Omit<CreateLeadInput, "customer_id">> & { stage?: string };

/** Returns the updated lead, so callers can refresh their copy without a follow-up GET. */
export const updateLead = (id: string, dto: UpdateLeadInput) =>
  apiFetch<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(dto) });

export const setLeadStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/leads/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

export const deleteLead = (id: string) =>
  apiFetch<{ message: string }>(`/leads/${id}`, { method: "DELETE" });

// ── Interests, Sources & Categories ───────────────────────────────────────────

export type Interest = { id: string; name: string; created_at: string; updated_at: string };
export type Source = { id: string; name: string; created_at: string; updated_at: string };
export type Category = { id: string; name: string; created_at: string; updated_at: string };

export const getInterests = () => apiFetch<Interest[]>("/interests");
export const getSources = () => apiFetch<Source[]>("/sources");
export const getCategories = () => apiFetch<Category[]>("/categories");

/** Create/rename/delete are admin-only server-side; the three lists share one shape. */
export type TaxonomyKind = "interests" | "sources" | "categories";

export const createTaxonomyItem = (kind: TaxonomyKind, name: string) =>
  apiFetch<Interest>(`/${kind}`, { method: "POST", body: JSON.stringify({ name }) });

export const renameTaxonomyItem = (kind: TaxonomyKind, id: string, name: string) =>
  apiFetch<Interest>(`/${kind}/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });

export const deleteTaxonomyItem = (kind: TaxonomyKind, id: string) =>
  apiFetch<{ status: string; message: string }>(`/${kind}/${id}`, { method: "DELETE" });

// ── Agents ────────────────────────────────────────────────────────────────────

export type Agent = { id: number; first_name: string; last_name: string };

export const getAgents = () => apiFetch<Agent[]>("/auth/agents");

// ── Team ──────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_role: string;
  team_id: string | null;
  /** The linked team's name, shown under the agent's name, e.g. "Sales - Lahore". */
  team: string | null;
  designation: string | null;
  department: string | null;
  region: string | null;
  office: string | null;
  /** The line manager this member reports to. */
  manager_id: number | null;
  /** When they joined, as YYYY-MM-DD. Unset falls back to `created_at`. */
  joined_on: string | null;
  blocked: boolean;
  /** A temporary lock-out; they stay on the register but can't sign in. */
  suspended: boolean;
  is_starred: boolean;
  password_changed: boolean;
  created_at: string;
  updated_at: string;
};

/** A row of the staff register: the member plus their manager and their lead and project load. */
export type StaffMember = TeamMember & {
  manager: { id: number; first_name: string; last_name: string } | null;
  allocated_leads: number;
  /** Allocated leads the member brought in themselves. */
  direct_leads: number;
  projects_allocated: number;
};

export type StaffTab = "active" | "suspended" | "blocked";

export type StaffQuery = {
  search?: string;
  search_by?: "employee_id" | "name";
  department?: string;
  designation?: string;
  region?: string;
  manager_id?: number;
  team_id?: string;
  status?: StaffTab;
  starred?: "true";
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type StaffResponse = {
  data: StaffMember[];
  total: number;
  page: number;
  limit: number;
  status_counts: Record<StaffTab, number>;
  /** Every value in use — the options for those filters. */
  departments: string[];
  designations: string[];
  regions: string[];
};

export const getStaff = (params: StaffQuery = {}) =>
  apiFetch<StaffResponse>(`/auth/staff${buildQueryString(params)}`);

/** An empty string clears a text field; `null` clears the manager or the joining date. */
export type StaffProfileInput = {
  designation?: string;
  department?: string;
  region?: string;
  office?: string;
  manager_id?: number | null;
  joined_on?: string | null;
};

export const updateStaffProfile = (id: number, dto: StaffProfileInput) =>
  apiFetch<TeamMember>(`/auth/users/${id}/profile`, { method: "PATCH", body: JSON.stringify(dto) });

export const setUserSuspended = (id: number, suspended: boolean) =>
  apiFetch<TeamMember>(`/auth/users/${id}/suspend`, {
    method: "PATCH",
    body: JSON.stringify({ suspended }),
  });

export const setUserStarred = (id: number, isStarred: boolean) =>
  apiFetch<{ id: number; is_starred: boolean }>(`/auth/users/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

export type AddUserInput = {
  first_name: string;
  last_name: string;
  email: string;
  user_role: "admin" | "agent";
  team_id?: string;
};

/** `null` takes the member out of their team. */
export const setUserTeam = (id: number, teamId: string | null) =>
  apiFetch<TeamMember>(`/auth/users/${id}/team`, {
    method: "PATCH",
    body: JSON.stringify({ team_id: teamId }),
  });

export type Team = {
  id: string;
  /** The short team ID, shown as TEAM-01. */
  team_no: number;
  name: string;
  lead_id: number | null;
  lead: { id: number; first_name: string; last_name: string; designation: string | null } | null;
  department: string | null;
  region: string | null;
  office: string | null;
  is_active: boolean;
  is_starred: boolean;
  member_count: number;
  /** Leads held by the team's members, and the projects those leads span. */
  allocated_leads: number;
  project_assignments: number;
  created_at: string;
};

export const getTeams = () => apiFetch<Team[]>("/teams");

export type TeamTab = "active" | "inactive" | "all";

export type TeamsQuery = {
  search?: string;
  department?: string;
  region?: string;
  lead_id?: number;
  status?: TeamTab;
  starred?: "true";
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TeamsResponse = {
  data: Team[];
  total: number;
  page: number;
  limit: number;
  status_counts: Record<TeamTab, number>;
  departments: string[];
  regions: string[];
};

export const getTeamsOverview = (params: TeamsQuery = {}) =>
  apiFetch<TeamsResponse>(`/teams/overview${buildQueryString(params)}`);

/** An empty string clears a text field; `lead_id: null` leaves the team without a lead. */
export type TeamDetails = {
  lead_id?: number | null;
  department?: string;
  region?: string;
  office?: string;
  is_active?: boolean;
};

/** `memberIds` becomes the team's whole membership; members already in another team are moved. */
export const createTeam = (name: string, memberIds: number[], details: TeamDetails = {}) =>
  apiFetch<Team>("/teams", { method: "POST", body: JSON.stringify({ name, member_ids: memberIds, ...details }) });

export const updateTeam = (id: string, name: string, memberIds: number[], details: TeamDetails = {}) =>
  apiFetch<Team>(`/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, member_ids: memberIds, ...details }),
  });

export const setTeamActive = (id: string, isActive: boolean) =>
  apiFetch<{ id: string; is_active: boolean }>(`/teams/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });

export const setTeamStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/teams/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

/** Members are kept — they just end up without a team. */
export const deleteTeam = (id: string) => apiFetch<{ message: string }>(`/teams/${id}`, { method: "DELETE" });

export const getUsers = () => apiFetch<TeamMember[]>("/auth/users");

/** The generated password comes back once, in this response — it is never retrievable again. */
export const addUser = (dto: AddUserInput) =>
  apiFetch<{ user: TeamMember; password: string }>("/auth/add-user", {
    method: "POST",
    body: JSON.stringify(dto),
  });

export const setUserBlocked = (id: number, blocked: boolean) =>
  apiFetch<TeamMember>(`/auth/users/${id}/block`, {
    method: "PATCH",
    body: JSON.stringify({ blocked }),
  });

export const setUserRole = (id: number, userRole: "admin" | "agent") =>
  apiFetch<TeamMember>(`/auth/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ user_role: userRole }),
  });

/** The new password only takes effect on the next login — the current token keeps working. */
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<{ status: string; message: string }>("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

// ── Inventory ─────────────────────────────────────────────────────────────────

/** `client_name`/`client_number` come back null unless `can_see_contact` — the server masks them. */
export type Listing = {
  id: string;
  area_name: string;
  category_id: string | null;
  interest_id: string | null;
  city: string | null;
  location: string | null;
  price: number | null;
  description: string | null;
  can_see_contact: boolean;
  client_name: string | null;
  client_number: string | null;
  assigned_to: { id: number; first_name: string; last_name: string } | null;
  created_at: string;
  updated_at: string;
};

export type InventoryQuery = {
  search?: string;
  category_id?: string;
  interest_id?: string;
  assigned_to_id?: number;
  city?: string;
  price_min?: number;
  price_max?: number;
  limit?: number;
};

export type ListingInput = {
  area_name: string;
  client_name: string;
  client_number: string;
  category_id?: string;
  interest_id?: string;
  city?: string;
  location?: string;
  price?: number;
  description?: string;
  assigned_to_id?: number;
};

export const getListings = (params: InventoryQuery = {}) =>
  apiFetch<Listing[]>(`/listings${buildQueryString(params)}`);

export const createListing = (dto: ListingInput) =>
  apiFetch<Listing>("/listings", { method: "POST", body: JSON.stringify(dto) });

export const updateListing = (id: string, dto: Partial<ListingInput>) =>
  apiFetch<Listing>(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(dto) });

export const deleteListing = (id: string) =>
  apiFetch<{ message: string }>(`/listings/${id}`, { method: "DELETE" });

export type PartnerProject = {
  id: string;
  project_name: string;
  developer: string | null;
  category_id: string | null;
  interest_id: string | null;
  city: string | null;
  location: string | null;
  price: number | null;
  description: string | null;
  project_type: string;
  is_active: boolean;
  is_starred: boolean;
  grade: string | null;
  token_amount: number | null;
  pdp_percent: number | null;
  cdp_percent: number | null;
  // Added up from the project's units by the server.
  unit_types: string[];
  total_units: number;
  available_units: number;
  price_min: number | null;
  price_max: number | null;
  created_at: string;
  updated_at: string;
};

export type PartnerProjectInput = {
  project_name: string;
  developer?: string;
  category_id?: string;
  interest_id?: string;
  city?: string;
  location?: string;
  price?: number;
  description?: string;
  project_type?: string;
  is_active?: boolean;
  grade?: string;
  token_amount?: number;
  pdp_percent?: number;
  cdp_percent?: number;
};

export const getPartnerProjects = (params: InventoryQuery = {}) =>
  apiFetch<PartnerProject[]>(`/partner-projects${buildQueryString(params)}`);

export const createPartnerProject = (dto: PartnerProjectInput) =>
  apiFetch<PartnerProject>("/partner-projects", { method: "POST", body: JSON.stringify(dto) });

export const updatePartnerProject = (id: string, dto: Partial<PartnerProjectInput>) =>
  apiFetch<PartnerProject>(`/partner-projects/${id}`, { method: "PATCH", body: JSON.stringify(dto) });

export const deletePartnerProject = (id: string) =>
  apiFetch<{ message: string }>(`/partner-projects/${id}`, { method: "DELETE" });

export const setProjectStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/partner-projects/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

// ── Units ─────────────────────────────────────────────────────────────────────

/** In sale order: token, partial down payment, complete down payment, sold (closed won). */
export type UnitStatus = "available" | "token" | "pdp" | "cdp" | "sold";

export type Unit = {
  id: string;
  project_id: string;
  project: TaxonomyRef | null;
  unit_number: string;
  unit_type: string | null;
  features: string | null;
  floor: string | null;
  beds: number | null;
  price: number | null;
  area_sqft: number | null;
  status: UnitStatus;
  is_starred: boolean;
  /** The lead that has paid towards this unit; null while it's available. */
  lead: { id: string; lead_no: number; client_name: string } | null;
  created_at: string;
  updated_at: string;
};

export type UnitsResponse = {
  data: Unit[];
  total: number;
  page: number;
  limit: number;
  status_counts: Record<UnitStatus, number>;
  /** Every unit type in use, for the filter. */
  unit_types: string[];
};

export type UnitsQuery = {
  project_id?: string;
  unit_type?: string;
  search?: string;
  status?: UnitStatus;
  starred?: "true";
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type UnitInput = {
  project_id: string;
  unit_number: string;
  unit_type?: string;
  features?: string;
  floor?: string;
  beds?: number;
  price?: number;
  area_sqft?: number;
  status?: UnitStatus;
};

export const getUnits = (params: UnitsQuery = {}) =>
  apiFetch<UnitsResponse>(`/units${buildQueryString(params)}`);

export const createUnit = (dto: UnitInput) =>
  apiFetch<Unit>("/units", { method: "POST", body: JSON.stringify(dto) });

export const updateUnit = (id: string, dto: Partial<UnitInput>) =>
  apiFetch<Unit>(`/units/${id}`, { method: "PATCH", body: JSON.stringify(dto) });

export const deleteUnit = (id: string) =>
  apiFetch<{ message: string }>(`/units/${id}`, { method: "DELETE" });

export const setUnitStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/units/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

// ── Sales disputes ────────────────────────────────────────────────────────────

export type DisputeStatus = "open" | "under_review" | "awaiting_evidence" | "escalated" | "resolved";

type DisputePerson = {
  id: number;
  first_name: string;
  last_name: string;
  team: string | null;
  department: string | null;
};

export type SalesDispute = {
  id: string;
  /** The short case ID, shown as DSP-024. */
  case_no: number;
  category: string;
  subject: string;
  description: string | null;
  requested_resolution: string | null;
  status: DisputeStatus;
  /** YYYY-MM-DD. */
  resolution_due: string | null;
  resolved_at: string | null;
  is_starred: boolean;
  lead: { id: string; lead_no: number; client_name: string; project: TaxonomyRef | null };
  raised_by: DisputePerson | null;
  review_owner: DisputePerson | null;
  created_at: string;
  updated_at: string;
};

/** A case waiting on evidence counts as under review, so it has no tab of its own. */
export type DisputeTab = "all" | "open" | "under_review" | "escalated" | "resolved";

export type SalesDisputesQuery = {
  search?: string;
  review_owner_id?: number;
  status?: DisputeStatus;
  created_from?: string;
  created_to?: string;
  tab?: DisputeTab;
  starred?: "true";
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type SalesDisputesResponse = {
  data: SalesDispute[];
  total: number;
  page: number;
  limit: number;
  tab_counts: Record<DisputeTab, number>;
};

export const getSalesDisputes = (params: SalesDisputesQuery = {}) =>
  apiFetch<SalesDisputesResponse>(`/sales-disputes${buildQueryString(params)}`);

export type SalesDisputeInput = {
  lead_id: string;
  category: string;
  subject: string;
  description?: string;
  requested_resolution?: string;
  review_owner_id?: number;
  resolution_due?: string;
};

export const createSalesDispute = (dto: SalesDisputeInput) =>
  apiFetch<SalesDispute>("/sales-disputes", { method: "POST", body: JSON.stringify(dto) });

/** Only an admin or the case's review owner may do this. */
export const setDisputeStatus = (id: string, status: DisputeStatus) =>
  apiFetch<SalesDispute>(`/sales-disputes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const setDisputeStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/sales-disputes/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

// ── Approvals & management ────────────────────────────────────────────────────

/** `returned` sends a request back for more information; `rejected` closes it. */
export type ApprovalDecision = "approved" | "returned" | "rejected";

type ApprovalPerson = { id: number; first_name: string; last_name: string };

export type Approval = {
  id: string;
  /** The short request ID, shown as APR-048. */
  request_no: number;
  type: string;
  summary: string;
  priority: "normal" | "high";
  status: "pending" | ApprovalDecision;
  due_date: string | null;
  review_comment: string | null;
  decided_at: string | null;
  is_starred: boolean;
  lead: { id: string; lead_no: number; client_name: string; project: TaxonomyRef | null };
  submitted_by: ApprovalPerson | null;
  reviewer: ApprovalPerson | null;
  created_at: string;
  updated_at: string;
};

/** The `approved` tab also lists rejected requests: both are decided and closed. */
export type ApprovalTab = "pending" | "approved" | "returned";

export type ApprovalsQuery = {
  tab?: ApprovalTab;
  starred?: "true";
  /** `asc` = oldest request first. */
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type ApprovalsResponse = {
  data: Approval[];
  total: number;
  page: number;
  limit: number;
  tab_counts: Record<ApprovalTab, number>;
};

/** Admins get every request; an agent only the ones they raised. */
export const getApprovals = (params: ApprovalsQuery = {}) =>
  apiFetch<ApprovalsResponse>(`/approvals${buildQueryString(params)}`);

export type ApprovalInput = {
  type: string;
  lead_id: string;
  summary: string;
  priority?: string;
  due_date?: string;
};

export const createApproval = (dto: ApprovalInput) =>
  apiFetch<Approval>("/approvals", { method: "POST", body: JSON.stringify(dto) });

/** Admin-only. */
export const decideApproval = (id: string, decision: ApprovalDecision, comment?: string) =>
  apiFetch<Approval>(`/approvals/${id}/decision`, {
    method: "PATCH",
    body: JSON.stringify({ decision, comment }),
  });

export const setApprovalStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/approvals/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

export type ManagementOverview = {
  pending_approvals: number;
  pending_by_type: Record<string, number>;
  due_today: number;
  active_staff: number;
  escalated_cases: number;
  /** The members with the most unfinished tasks, busiest first. */
  staff_workload: { id: number; first_name: string; last_name: string; open_tasks: number; overdue_tasks: number }[];
  payment_verifications_pending: number;
};

/** Admin-only. */
export const getManagementOverview = () => apiFetch<ManagementOverview>("/approvals/overview");

// ── Payments (accounts) ───────────────────────────────────────────────────────

export type PaymentStatus = "unverified" | "received" | "overdue" | "part_paid" | "pending";

export type Payment = {
  id: string;
  /** The short reference, shown as PAY-1036. */
  payment_no: number;
  payment_type: string;
  /** YYYY-MM-DD. */
  due_date: string;
  amount: number;
  received_amount: number;
  balance: number;
  status: PaymentStatus;
  received_at: string | null;
  method: string | null;
  reference: string | null;
  note: string | null;
  /** Recorded money only counts as received once Accounts has confirmed the receipt. */
  verified: boolean;
  is_starred: boolean;
  lead: { id: string; lead_no: number; client_name: string; project: TaxonomyRef | null };
  created_at: string;
  updated_at: string;
};

/** A part-paid payment still has money owing, so it is listed under `pending`. */
export type PaymentTab = "all" | "received" | "pending" | "overdue" | "unverified";

export type PaymentsQuery = {
  search?: string;
  project_id?: string;
  payment_type?: string;
  /** The month the payment falls due, as YYYY-MM. */
  period?: string;
  tab?: PaymentTab;
  starred?: "true";
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type PaymentsResponse = {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  tab_counts: Record<PaymentTab, number>;
};

export const getPayments = (params: PaymentsQuery = {}) =>
  apiFetch<PaymentsResponse>(`/payments${buildQueryString(params)}`);

export type PaymentsSummary = {
  collections_month: number;
  /** Null until an admin sets this month's collections target. */
  collections_target: number | null;
  outstanding: number;
  open_count: number;
  overdue_balance: number;
  overdue_count: number;
  unverified_count: number;
  unverified_amount: number;
};

export const getPaymentsSummary = () => apiFetch<PaymentsSummary>("/payments/summary");

/** Admin-only. */
export const createPayment = (dto: { lead_id: string; payment_type: string; due_date: string; amount: number }) =>
  apiFetch<Payment>("/payments", { method: "POST", body: JSON.stringify(dto) });

/** Adds money against the payment; it stays unverified until an admin confirms the receipt. */
export const recordPayment = (
  id: string,
  dto: { amount: number; method?: string; reference?: string; note?: string },
) => apiFetch<Payment>(`/payments/${id}/record`, { method: "PATCH", body: JSON.stringify(dto) });

/** Admin-only. */
export const verifyPayment = (id: string) => apiFetch<Payment>(`/payments/${id}/verify`, { method: "PATCH" });

export const setPaymentStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/payments/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

// ── Reports (admin-only) ──────────────────────────────────────────────────────

export type ReportCategory = "sales" | "inventory" | "collections" | "staff";

export type Report = {
  key: string;
  name: string;
  description: string;
  category: ReportCategory;
  format: string;
  /** The month the last run covered, as YYYY-MM. */
  last_period: string | null;
  last_generated_at: string | null;
};

export const getReports = () => apiFetch<Report[]>("/reports");

export type ReportFilters = { period?: string; project_id?: string; region?: string };

/** Runs the report. `rows` are in the order of `columns`. */
export const generateReport = (key: string, filters: ReportFilters = {}) =>
  apiFetch<{ key: string; name: string; period: string; columns: string[]; rows: (string | number | null)[][] }>(
    `/reports/${key}/data${buildQueryString(filters)}`,
  );

export type TargetMetric = "booked_sales" | "site_visits" | "collections";

/** `target` is null while nothing has been set for the month. */
export type TargetProgress = { metric: TargetMetric; target: number | null; actual: number };

export const getTargets = (period?: string) =>
  apiFetch<TargetProgress[]>(`/reports/targets${buildQueryString({ period })}`);

export const setTarget = (period: string, metric: TargetMetric, value: number) =>
  apiFetch<TargetProgress[]>("/reports/targets", { method: "PUT", body: JSON.stringify({ period, metric, value }) });

// ── Locations ─────────────────────────────────────────────────────────────────

export type Location = {
  id: string;
  /** The short location ID, shown as LOC-001. */
  location_no: number;
  name: string;
  city: string | null;
  region: string | null;
  department: string | null;
  is_active: boolean;
  is_starred: boolean;
  project_count: number;
  available_units: number;
  /** The location's biggest project, and the unit types it sells. */
  coverage_project: string | null;
  coverage_unit_types: string | null;
  created_at: string;
  updated_at: string;
};

export type LocationTab = "all" | "active" | "inactive";

export type LocationsQuery = {
  search?: string;
  city?: string;
  project_id?: string;
  region?: string;
  status?: LocationTab;
  starred?: "true";
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type LocationsResponse = {
  data: Location[];
  total: number;
  page: number;
  limit: number;
  status_counts: Record<LocationTab, number>;
  /** Every city and region any location uses — the options for those filters. */
  cities: string[];
  regions: string[];
};

export const getLocations = (params: LocationsQuery = {}) =>
  apiFetch<LocationsResponse>(`/locations${buildQueryString(params)}`);

export const updateLocation = (id: string, dto: { is_active?: boolean }) =>
  apiFetch<Location>(`/locations/${id}`, { method: "PATCH", body: JSON.stringify(dto) });

export const setLocationStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/locations/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

// ── Notifications ─────────────────────────────────────────────────────────────

export type AppNotification = {
  id: string;
  title: string;
  body: string | null;
  /** Where in the app it leads, e.g. "/tasks". */
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export const getNotifications = (unreadOnly = false) =>
  apiFetch<{ data: AppNotification[]; unread_count: number }>(
    `/notifications${buildQueryString({ unread: unreadOnly ? "true" : undefined })}`,
  );

export const markNotificationRead = (id: string) =>
  apiFetch<{ message: string }>(`/notifications/${id}/read`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  apiFetch<{ message: string }>("/notifications/read-all", { method: "PATCH" });

// ── Follow-ups ────────────────────────────────────────────────────────────────

export type TaskStatus = "open" | "in_progress" | "scheduled" | "overdue" | "completed";

export type FollowUp = {
  id: string;
  /** The short task ID, shown as TSK-<n>. */
  task_no: number;
  text: string;
  /** Null on follow-ups written before tasks had a type. */
  task_type: string | null;
  sub_task: string | null;
  due_date: string;
  due_time: string;
  completed: boolean;
  completed_at: string | null;
  overdue: boolean;
  /** Done and late win over the stored status. */
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  is_starred: boolean;
  /** The lead's most recently finished task. Only the todos list fills this in. */
  last_task: { text: string; task_type: string | null; sub_task: string | null; at: string | null } | null;
  lead: {
    id: string;
    lead_no: number;
    client_name: string;
    client_number: string;
    gender: Gender | null;
    stage: string;
    city: string | null;
    area: string | null;
    project: TaxonomyRef | null;
    interest: TaxonomyRef | null;
    assigned_to: { id: number; first_name: string; last_name: string; team: string | null } | null;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
};

export type FollowUpStatus = "upcoming" | "overdue" | "completed";

export type FollowUpsQuery = {
  lead_id?: string;
  status?: FollowUpStatus;
  search?: string;
  assigned_to_id?: number;
  limit?: number;
};

export const getFollowUps = (params: FollowUpsQuery = {}) =>
  apiFetch<FollowUp[]>(`/follow-ups${buildQueryString(params)}`);

/** Everything due today, scoped to the caller's leads for agents. Filters mirror the leads list. */
export const getTodayFollowUps = (params: Omit<LeadsQuery, "page" | "limit"> = {}) =>
  apiFetch<FollowUp[]>(`/follow-ups/today${buildQueryString(params)}`);

export type TodoWindow = DueWindow | "all";

export type TodosQuery = {
  page?: number;
  limit?: number;
  window?: TodoWindow;
  search?: string;
  search_by?: "lead_id" | "client" | "todo";
  assigned_to_id?: number;
  task_type?: string;
  /** Only todos due on this day, as YYYY-MM-DD. */
  due_date?: string;
  starred?: "true";
  sort?: "asc" | "desc";
};

export type TodosResponse = {
  data: FollowUp[];
  total: number;
  page: number;
  limit: number;
  window_counts: Record<TodoWindow, number>;
};

/** Open follow-ups, paged, with a count per due window. */
export const getTodos = (params: TodosQuery = {}) =>
  apiFetch<TodosResponse>(`/follow-ups/todos${buildQueryString(params)}`);

export type TaskTab = "all" | "open" | "in_progress" | "overdue" | "completed";

export type TasksQuery = {
  page?: number;
  limit?: number;
  status?: TaskTab;
  search?: string;
  assigned_to_id?: number;
  task_type?: string;
  due_from?: string;
  due_to?: string;
  starred?: "true";
  sort?: "asc" | "desc";
};

export type TasksResponse = {
  data: FollowUp[];
  total: number;
  page: number;
  limit: number;
  status_counts: Record<TaskTab, number>;
};

/** Every follow-up, open or done, paged, with a count per status tab. */
export const getTasks = (params: TasksQuery = {}) =>
  apiFetch<TasksResponse>(`/follow-ups/tasks${buildQueryString(params)}`);

/** `completed` ticks the task off; any other status reopens it at that stage. */
export const setTaskStatus = (id: string, status: "open" | "in_progress" | "scheduled" | "completed") =>
  apiFetch<{ message: string }>(`/follow-ups/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const setFollowUpStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/follow-ups/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

export type CreateFollowUpInput = { lead_id: string; text: string; due_date: string; due_time: string };

export const createFollowUp = (dto: CreateFollowUpInput) =>
  apiFetch<{ message: string }>("/follow-ups", { method: "POST", body: JSON.stringify(dto) });

export type LogTaskInput = {
  lead_id: string;
  task_type: string;
  sub_task: string;
  completed_date: string;
  completed_time: string;
  comment: string;
  next_task: string;
  /** Omitted for next tasks that schedule nothing ("Do Nothing", "Closed (Won)"). */
  deadline_date?: string;
  deadline_time?: string;
  project_id?: string;
  unit_id?: string;
  temperature: LeadTemperature;
};

/** Records the task just done, schedules the next one and updates the lead in one request. */
export const logTask = (dto: LogTaskInput) =>
  apiFetch<{ message: string }>("/follow-ups/log", { method: "POST", body: JSON.stringify(dto) });

/** Open tasks due on each of the 7 days from `from` (YYYY-MM-DD); days with none are left out. */
export const getWeekLoad = (from: string) =>
  apiFetch<{ date: string; count: number }[]>(`/follow-ups/week-load${buildQueryString({ from })}`);

export const setFollowUpCompleted = (id: string, completed: boolean) =>
  apiFetch<{ message: string }>(`/follow-ups/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });

// ── Customers ─────────────────────────────────────────────────────────────────

export type CustomerStage = "inquiry" | "prospect" | "mature" | "pre_closure" | "sold";

export type Gender = "male" | "female";

export type Customer = {
  id: string;
  /** The short client ID shown to users; `id` stays the key for URLs. */
  customer_no: number;
  stage: CustomerStage;
  sub_source: string | null;
  /** ISO 3166-1 alpha-2, e.g. "PK". */
  country: string;
  is_starred: boolean;
  /** Leads linked to this customer. */
  lead_count: number;
  customer_name: string;
  cnic_number: string;
  contact_number: string;
  gender: Gender | null;
  alternate_contact_number: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  relation_type: string | null;
  source_id: string | null;
  source: TaxonomyRef | null;
  customer_since: string | null;
  notes: string | null;
  assigned_to: { id: number; first_name: string; last_name: string; team: string | null } | null;
  created_at: string;
  updated_at: string;
};

export type CustomersResponse = {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  stage_counts: Record<CustomerStage, number>;
};

export type CustomersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  search_by?: "cell" | "name" | "client_id" | "cnic";
  /** The day the client was added, as YYYY-MM-DD. */
  created_date?: string;
  /** Clients with at least one lead on this project. */
  project_id?: string;
  starred?: "true";
  stage?: CustomerStage;
  sort?: "asc" | "desc";
  relation_type?: string;
  source_id?: string;
  city?: string;
  assigned_to_id?: number;
};

export type CustomerInput = {
  customer_name: string;
  cnic_number: string;
  contact_number: string;
  gender?: Gender;
  alternate_contact_number?: string;
  email?: string;
  address?: string;
  city?: string;
  relation_type: string;
  source_id?: string;
  sub_source?: string;
  country?: string;
  stage?: CustomerStage;
  customer_since?: string;
  notes?: string;
  assigned_to_id?: number;
};

export const getCustomers = (params: CustomersQuery = {}) =>
  apiFetch<CustomersResponse>(`/customers${buildQueryString(params)}`);

export const getCustomer = (id: string) => apiFetch<Customer>(`/customers/${id}`);

export const createCustomer = (dto: CustomerInput) =>
  apiFetch<Customer>("/customers", { method: "POST", body: JSON.stringify(dto) });

export const updateCustomer = (id: string, dto: Partial<CustomerInput>) =>
  apiFetch<Customer>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(dto) });

export const setCustomerStarred = (id: string, isStarred: boolean) =>
  apiFetch<{ id: string; is_starred: boolean }>(`/customers/${id}/star`, {
    method: "PATCH",
    body: JSON.stringify({ is_starred: isStarred }),
  });

export const deleteCustomer = (id: string) =>
  apiFetch<{ message: string }>(`/customers/${id}`, { method: "DELETE" });

// ── Stats ─────────────────────────────────────────────────────────────────────

/** `scope` is "system" for admins, "own" for agents — the server decides, not the client. */
export type DashboardStats = {
  scope: "system" | "own";
  open_leads: number;
  pipeline_value: number;
  closed_volume: number;
  overdue_follow_ups: number;
  customers: number;
  leads_won: number;
  /** Leads created this calendar month, and how that compares with the month before. */
  new_inquiries: number;
  new_inquiries_change: number;
  closed_sales_month: number;
  closed_value_month: number;
  tasks_due_today: number;
};

export const getDashboardStats = () => apiFetch<DashboardStats>("/stats/dashboard");

/** `month` is "YYYY-MM". Six entries, oldest first, with empty months included as zero. */
export type SalesMonth = { month: string; total: number; count: number };

export type Activity = {
  id: string;
  kind: "completed" | "scheduled";
  text: string;
  task_type: string | null;
  sub_task: string | null;
  at: string;
  client_name: string;
  project: string | null;
};

/** The latest things done or scheduled on leads, newest first. */
export const getRecentActivity = () => apiFetch<Activity[]>("/stats/recent-activity");

export const getSalesPerformance = () => apiFetch<SalesMonth[]>("/stats/sales-performance");

// ── CSV import ────────────────────────────────────────────────────────────────

export type ImportResult = {
  total: number;
  added: number;
  skipped: number;
  errors: { row: number; reason: string }[];
};

/** Multipart upload — no Content-Type header, the browser sets the boundary itself. */
async function uploadCsv(path: string, file: File): Promise<ImportResult> {
  const token = getValidToken();
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (res.status === 401) {
    onUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const msg = payload?.message ?? res.statusText;
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  return res.json() as Promise<ImportResult>;
}

export const importCustomersCsv = (file: File) => uploadCsv("/customers/import", file);
export const importLeadsCsv = (file: File) => uploadCsv("/leads/import", file);
export const importUnitsCsv = (file: File, projectId: string) =>
  uploadCsv(`/units/import${buildQueryString({ project_id: projectId })}`, file);

// ── Help Center ───────────────────────────────────────────────────────────────

export type HelpTopicId =
  | "clients_leads"
  | "tasks"
  | "projects_inventory"
  | "staff_teams"
  | "accounts_payments"
  | "reports_management";

export type HelpArticleSummary = {
  slug: string;
  topic: HelpTopicId;
  title: string;
  /** The subject in a few words, e.g. "Lead allocation". */
  short_title: string;
  read_minutes: number;
};

export type HelpOverview = {
  topics: { id: HelpTopicId; article_count: number }[];
  featured: HelpArticleSummary[];
  /** Null unless a search or topic was asked for. */
  results: HelpArticleSummary[] | null;
};

export const getHelpOverview = (filters: { search?: string; topic?: string } = {}) =>
  apiFetch<HelpOverview>(`/help${buildQueryString(filters)}`);

export const getHelpArticles = () => apiFetch<(HelpArticleSummary & { intro: string })[]>("/help/articles");

export type HelpArticle = HelpArticleSummary & {
  body: string;
  updated_at: string;
  related: HelpArticleSummary[];
  /** The caller's own answer to "Was this article helpful?". */
  my_feedback: boolean | null;
};

export const getHelpArticle = (slug: string) => apiFetch<HelpArticle>(`/help/articles/${slug}`);

export const sendHelpArticleFeedback = (slug: string, helpful: boolean) =>
  apiFetch<{ my_feedback: boolean }>(`/help/articles/${slug}/feedback`, {
    method: "PUT",
    body: JSON.stringify({ helpful }),
  });

export type SupportTicketInput = {
  category: HelpTopicId;
  topic: string;
  contact_name: string;
  reply_email: string;
  subject: string;
  details: string;
  related_record?: string;
  steps?: string;
  impact?: string;
  preferred_contact?: string;
};

export type SupportTicketReceipt = { id: string; ticket_no: number; status: string; attachment_count: number };

/** Multipart, like the CSV imports — the attachments travel with the fields. */
export async function createSupportTicket(input: SupportTicketInput, attachments: File[]) {
  const token = getValidToken();
  const body = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (value) body.append(key, value);
  }
  for (const file of attachments) body.append("attachments", file);

  const res = await fetch(`${API_URL}/help/tickets`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (res.status === 401) {
    onUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const msg = payload?.message ?? res.statusText;
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  return res.json() as Promise<SupportTicketReceipt>;
}
