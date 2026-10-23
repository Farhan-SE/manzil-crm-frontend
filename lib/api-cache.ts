const CACHE_TTL = 5 * 60_000;
const MAX_ENTRIES = 200;

export function resourceOf(path: string) {
  return path.split("?")[0].split("/")[1];
}

export function isCacheableRead(path: string) {
  const pathname = path.split("?")[0];
  return resourceOf(path) !== "notifications" &&
    !pathname.startsWith("/customers/imports") && pathname !== "/customers/phone-check";
}

/** A mutation can affect summaries and joined records as well as its own resource. */
export function affectedResources(path: string): Set<string> {
  const root = resourceOf(path);
  const related: Record<string, string[]> = {
    customers: ["leads", "follow-ups", "stats", "reports", "partner-projects", "locations"],
    leads: ["customers", "follow-ups", "units", "partner-projects", "locations", "payments", "stats", "reports"],
    "follow-ups": ["leads", "customers", "units", "partner-projects", "locations", "payments", "stats", "reports"],
    units: ["partner-projects", "locations", "leads", "customers", "follow-ups", "stats", "reports"],
    "partner-projects": ["units", "locations", "leads", "customers", "follow-ups", "stats", "reports"],
    payments: ["leads", "customers", "follow-ups", "units", "partner-projects", "locations", "stats", "reports"],
    approvals: ["leads", "customers", "follow-ups", "units", "partner-projects", "payments", "stats", "reports"],
    "sales-disputes": ["leads", "customers", "follow-ups", "payments", "stats", "reports"],
    teams: ["auth", "leads", "customers", "follow-ups", "stats", "reports"],
    categories: ["partner-projects", "units", "listings", "leads", "customers"],
    interests: ["partner-projects", "units", "listings", "leads", "customers"],
    sources: ["leads", "customers", "follow-ups", "stats", "reports"],
    locations: ["partner-projects"],
  };
  return new Set([root, ...(related[root] ?? [])]);
}

type Entry = { value: unknown; expires: number };

/** Memory only: a browser refresh always starts with fresh server data. */
export class ApiCache {
  private scope: string | null = null;
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<unknown>>();

  setScope(scope: string | null) {
    if (scope !== this.scope) {
      this.clear();
      this.scope = scope;
    }
  }

  clear() {
    this.entries.clear();
    this.pending.clear();
  }

  invalidate(resources: Set<string>) {
    for (const key of this.entries.keys()) {
      if (resources.has(resourceOf(key))) this.entries.delete(key);
    }
    for (const key of this.pending.keys()) {
      if (resources.has(resourceOf(key))) this.pending.delete(key);
    }
  }

  async read<T>(path: string, load: () => Promise<T>): Promise<T> {
    const [pathname, query] = path.split("?");
    const params = new URLSearchParams(query);
    params.sort();
    const key = pathname + (params.size ? `?${params}` : "");
    const cached = this.entries.get(key);
    if (cached && cached.expires > Date.now()) return structuredClone(cached.value) as T;
    if (cached) this.entries.delete(key);

    let request = this.pending.get(key) as Promise<T> | undefined;
    if (!request) {
      request = load().then((value) => {
        // A write, logout, or newer request must not let an old response repopulate the cache.
        if (this.pending.get(key) === request) {
          if (this.entries.size >= MAX_ENTRIES) this.entries.delete(this.entries.keys().next().value!);
          this.entries.set(key, { value: structuredClone(value), expires: Date.now() + CACHE_TTL });
        }
        return value;
      }).finally(() => {
        if (this.pending.get(key) === request) this.pending.delete(key);
      });
      this.pending.set(key, request);
    }
    return structuredClone(await request);
  }
}
