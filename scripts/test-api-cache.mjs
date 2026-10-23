import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual TypeScript API client with browser storage and HTTP mocked.
// No real account, database, or running server is needed.
function fixture() {
  const calls = [];
  const listeners = new Map();
  const storage = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  };
  const localStorage = storage(), sessionStorage = storage();
  const jwt = (id) => `header.${Buffer.from(JSON.stringify({ id, email: `${id}@example.com`, role: "agent" })).toString("base64")}.signature`;
  localStorage.setItem("access_token", jwt(1));
  let now = Date.now();
  let handler = () => Response.json({ data: [], total: 0 });
  const modules = new Map();
  const sandbox = {
    URLSearchParams, structuredClone, atob,
    Date: class extends Date { static now() { return now; } },
    process: { env: { NEXT_PUBLIC_API_URL: "https://crm.test" } },
    localStorage, sessionStorage, document: { cookie: "" },
    window: { addEventListener: (name, fn) => listeners.set(name, fn), dispatchEvent() {}, location: { href: "/customers" } },
    CustomEvent: class { constructor(type) { this.type = type; } },
    fetch: async (url, init) => {
      const call = { path: url.replace("https://crm.test", ""), method: init?.method ?? "GET", init };
      calls.push(call);
      return handler(call);
    },
  };
  function load(name) {
    name = name.replace(/^\.\//, "");
    if (modules.has(name)) return modules.get(name);
    const code = ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const loadedModule = { exports: {} };
    modules.set(name, loadedModule.exports);
    vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, sandbox)(load, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return {
    api: load("api"), cache: load("api-cache"), state: load("navigation-state-store"), calls, jwt,
    respond: (fn) => { handler = fn; }, advance: (ms) => { now += ms; },
    storageEvent: (event) => listeners.get("storage")(event),
  };
}

test("returning to an unchanged list or detail reuses cached data", async () => {
  const { api, calls } = fixture();
  await api.getCustomers({ page: 2, limit: 10, search: "Ahmed" });
  await api.getCustomer("customer-1");
  await api.getCustomers({ page: 2, limit: 10, search: "Ahmed" });
  await api.getCustomer("customer-1");
  assert.equal(calls.length, 2);
});

test("parallel reads deduplicate; different filters and pages remain separate", async () => {
  const { api, calls } = fixture();
  await Promise.all([api.getCustomers({ page: 1 }), api.getCustomers({ page: 1 })]);
  await api.getCustomers({ page: 2 });
  await api.getCustomers({ page: 1, search: "Hina" });
  assert.equal(calls.length, 3);
});

test("customer changes refresh customers, leads, tasks and stats, keeping unrelated roles cached", async () => {
  const { api, calls } = fixture();
  const read = () => Promise.all([api.getCustomers(), api.getLeads(), api.getTasks(), api.getDashboardStats(), api.getRoles()]);
  await read();
  await api.updateCustomer("customer-1", { city: "Lahore" });
  await read();
  assert.equal(calls.length, 10); // five initial reads, one write, four refreshed reads
  assert.equal(calls.filter((c) => c.path === "/roles").length, 1);
});

test("task writes invalidate joined lead and customer data", async () => {
  const { api, calls } = fixture();
  await Promise.all([api.getCustomers(), api.getLeads(), api.getTasks()]);
  await api.setTaskStatus("task-1", "in_progress");
  await Promise.all([api.getCustomers(), api.getLeads(), api.getTasks()]);
  assert.equal(calls.length, 7);
});

test("failed writes keep valid cache; failed reads are retried", async () => {
  const f = fixture();
  await f.api.getCustomers();
  f.respond(() => Response.json({ message: "Rejected" }, { status: 400 }));
  await assert.rejects(f.api.updateCustomer("customer-1", { city: "Lahore" }), /Rejected/);
  await f.api.getCustomers();
  assert.equal(f.calls.length, 2);
  await assert.rejects(f.api.getCustomer("missing"), /Rejected/);
  await assert.rejects(f.api.getCustomer("missing"), /Rejected/);
  assert.equal(f.calls.length, 4);
});

test("expired cache refetches; cached objects cannot be changed by consumers", async () => {
  const f = fixture();
  f.respond(() => Response.json({ data: [{ customer_name: "Ahmed" }] }));
  const first = await f.api.getCustomers();
  first.data[0].customer_name = "Changed locally";
  assert.equal((await f.api.getCustomers()).data[0].customer_name, "Ahmed");
  f.advance(5 * 60_000 + 1);
  await f.api.getCustomers();
  assert.equal(f.calls.length, 2);
});

test("logout/account changes discard cached responses and retained list state", async () => {
  const f = fixture();
  await f.api.getCustomers();
  f.state.navigationState.set("/customers:page", 4);
  f.api.setToken(f.jwt(2), true);
  assert.equal(f.state.navigationState.size, 0);
  await f.api.getCustomers();
  f.api.clearToken();
  f.api.setToken(f.jwt(1), false);
  await f.api.getCustomers();
  assert.equal(f.calls.length, 3);
});

test("notifications, import polling and phone availability always reach server", async () => {
  const f = fixture();
  const poll = () => Promise.all([f.api.getNotifications(), f.api.getCustomerImport("import-1"), f.api.checkCustomerPhone("03008456959")]);
  await poll(); await poll();
  assert.equal(f.calls.length, 6);
});

test("project mutations refresh the shared dropdown cache", async () => {
  const f = fixture();
  await f.api.getProjectOptions(); await f.api.getProjectOptions();
  await f.api.updatePartnerProject("project-1", { project_name: "Updated" });
  await f.api.getProjectOptions();
  assert.equal(f.calls.length, 3);
});

test("cross-tab writes and completed imports invalidate cached lists", async () => {
  const f = fixture();
  await f.api.getCustomers();
  f.storageEvent({ key: "crm:data-changed", newValue: JSON.stringify({ path: "/leads" }) });
  await f.api.getCustomers();
  f.api.invalidateApiCache("/customers");
  await f.api.getCustomers();
  assert.equal(f.calls.length, 3);
});

test("a read finishing after invalidation cannot repopulate cache", async () => {
  const f = fixture();
  const cache = new f.cache.ApiCache();
  let resolveOld;
  const old = cache.read("/customers", () => new Promise((resolve) => { resolveOld = resolve; }));
  cache.invalidate(new Set(["customers"]));
  assert.equal(await cache.read("/customers", async () => "new"), "new");
  resolveOld("old"); await old;
  assert.equal(await cache.read("/customers", async () => "unexpected"), "new");
});

test("equivalent query parameter order shares a cache entry", async () => {
  const f = fixture();
  const cache = new f.cache.ApiCache();
  assert.equal(await cache.read("/customers?page=2&limit=10", async () => "first"), "first");
  assert.equal(await cache.read("/customers?limit=10&page=2", async () => "second"), "first");
});
