"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ViewTransition } from "react";
import {
  FilterIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  TasksIcon,
  WhatsAppIcon,
} from "@/components/icons/DashboardIcons";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { LogTaskModal } from "@/components/LogTaskModal";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  LeadsFilterPanel,
  type LeadFilters,
} from "@/components/LeadsFilterPanel";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { NewLeadModal } from "@/components/NewLeadModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, type SelectOption } from "@/components/ui/Select";
import {
  getAgents,
  getCategories,
  getInterests,
  getLeads,
  getSessionUser,
  getSources,
  setLeadStarred,
  type Lead,
  type LeadTab,
} from "@/lib/api";
import { whatsappUrl } from "@/lib/customers";
import { useIsAdmin } from "@/lib/session";
import { taskLabel } from "@/lib/tasks";

const PAGE_SIZE = 10;

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  contacted: "Contacted",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  booked: "Booked",
  sold: "Sold",
  lost: "Lost",
};

const TEMP_BADGES: Record<string, string> = {
  HOT: "bg-hot/10 text-hot",
  WARM: "bg-warm/20 text-warm",
  COLD: "bg-cold/15 text-cold",
};

const TABS: { id: LeadTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "watchlist", label: "Watchlist" },
];

const SORT_OPTIONS: SelectOption[] = [
  { id: "desc", name: "Lead ID descending" },
  { id: "asc", name: "Lead ID ascending" },
];

const headerCell = "text-xs font-bold uppercase tracking-[0.6px] text-dash-muted";

const actionButton =
  "flex size-8 items-center justify-center rounded-lg border border-dash-border transition-colors hover:bg-dash-bg";

function formatCreated(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatDue(date: string) {
  return formatCreated(`${date}T00:00:00`);
}

function formatCount(count: number) {
  return count >= 1000 ? `${(count / 1000).toFixed(1)} K` : String(count);
}

/** Page numbers around the current page, with an ellipsis before the last one when it's far. */
function pageNumbers(current: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = Math.min(Math.max(current - 1, 1), totalPages - 3);
  const window = [start, start + 1, start + 2];
  return window[2] === totalPages - 1 ? [...window, totalPages] : [...window, "...", totalPages];
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsDirectory />
    </Suspense>
  );
}

function LeadsDirectory() {
  const admin = useIsAdmin();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  // Seeded from ?search= so the dashboard's quick search can land here on a lead.
  const initialSearch = useSearchParams().get("search") ?? "";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<LeadTab, number> | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<LeadTab>("all");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [taskLead, setTaskLead] = useState<Lead | null>(null);

  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([getInterests(), getCategories(), getSources()])
      .then(([interestList, categoryList, sourceList]) => {
        setInterests(interestList);
        setCategories(categoryList);
        setSources(sourceList);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!admin) return;
    getAgents()
      .then((list) =>
        setAgents(list.map((a) => ({ id: String(a.id), name: `${a.first_name} ${a.last_name}` }))),
      )
      .catch(() => {});
  }, [admin]);

  const load = useCallback(() => {
    getLeads({
      page,
      limit: PAGE_SIZE,
      tab,
      sort,
      search: debouncedSearch,
      stage: filters.stage || undefined,
      temperature: filters.temperature || undefined,
      category_id: filters.category_id || undefined,
      interest_id: filters.interest_id || undefined,
      source_id: filters.source_id || undefined,
      assigned_to_id: filters.assigned_to_id ? Number(filters.assigned_to_id) : undefined,
      budget_min: filters.budget_min ? Number(filters.budget_min) : undefined,
      budget_max: filters.budget_max ? Number(filters.budget_max) : undefined,
    })
      .then((res) => {
        // Deleting the last row on a page would otherwise strand you on an empty one.
        if (res.data.length === 0 && page > 1) setPage((p) => p - 1);
        setLeads(res.data);
        setTotal(res.total);
        setTabCounts(res.tab_counts);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [page, tab, sort, debouncedSearch, filters]);

  useEffect(() => {
    load();
    window.addEventListener("leads:changed", load);
    return () => window.removeEventListener("leads:changed", load);
  }, [load]);

  async function handleStarToggle(lead: Lead) {
    const next = !lead.is_starred;
    const apply = (value: boolean) =>
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, is_starred: value } : l)));
    apply(next);
    try {
      await setLeadStarred(lead.id, next);
      // Refreshes the Watchlist count, and drops the row when unstarring inside that tab.
      load();
    } catch {
      apply(!next);
    }
  }

  const sessionUserId = getSessionUser()?.id;
  const activeFilterCount = countActiveFilters(filters);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1
          className="font-serif text-[28px] font-semibold text-dash-ink sm:text-[34px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Leads Directory
        </h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, ID, number, city..."
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-3 text-sm text-dash-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              aria-expanded={isFilterOpen}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-dash-border bg-sidebar px-3 py-2.5"
              aria-label="Filter leads"
            >
              <FilterIcon className="h-3 w-[18px] text-dash-ink" />
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-dash-ink text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <LeadsFilterPanel
                value={filters}
                onApply={(next) => {
                  setFilters(next);
                  setPage(1);
                  setIsFilterOpen(false);
                }}
                onClear={() => {
                  setFilters(EMPTY_FILTERS);
                  setPage(1);
                  setIsFilterOpen(false);
                }}
                interests={interests}
                categories={categories}
                sources={sources}
                agents={agents}
                showAssignee={admin}
              />
            )}
          </div>

          {admin && (
            <>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="shrink-0 rounded-lg border border-dash-border px-4 py-2.5 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
              >
                Import
              </button>
              <button
                type="button"
                onClick={() => setIsNewLeadOpen(true)}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
              >
                <PlusIcon className="size-3" />
                Add new lead
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-dash-border md:flex-row md:items-end md:justify-between">
        <div className="-mb-px flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setTab(entry.id);
                setPage(1);
              }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                tab === entry.id
                  ? "border-dash-ink font-semibold text-dash-ink"
                  : "border-transparent text-dash-muted hover:text-dash-ink"
              }`}
            >
              {entry.label}
              {tabCounts && (
                <span className="ml-1 text-xs font-normal text-dash-muted">
                  ({formatCount(tabCounts[entry.id])})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-2">
          <label htmlFor="lead-sort" className="shrink-0 text-xs text-dash-muted">
            Sort by
          </label>
          <div className="w-52">
            <Select
              id="lead-sort"
              value={sort}
              onChange={(v) => {
                setSort(v as "asc" | "desc");
                setPage(1);
              }}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-dash-border">
        <div className="hidden gap-4 border-b border-dash-border bg-dash-bg/50 px-6 py-4 lg:grid lg:grid-cols-8">
          <p className={`${headerCell} pl-7`}>Lead ID</p>
          <p className={headerCell}>Client</p>
          <p className={headerCell}>Last task</p>
          <p className={headerCell}>Interest</p>
          <p className={headerCell}>Source</p>
          <p className={headerCell}>Allocated to</p>
          <p className={headerCell}>Status</p>
          <p className={headerCell}>Actions</p>
        </div>

        {isLoading &&
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-3 bg-white px-4 py-4 sm:px-6 lg:grid lg:grid-cols-8 lg:gap-4 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="hidden h-4 w-20 lg:block" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="hidden h-8 w-16 lg:block" />
            </div>
          ))}

        {!isLoading && leads.length === 0 && (
          <p className="bg-white px-6 py-8 text-center text-sm text-dash-placeholder">
            {debouncedSearch || activeFilterCount > 0 || tab !== "all"
              ? "No leads match those filters."
              : "No leads yet."}
          </p>
        )}

        {leads.map((lead, i) => {
          const location = [lead.area, lead.city].filter(Boolean).join(", ");
          const interestLine = [lead.interest?.name, lead.category?.name].filter(Boolean).join(" · ");
          const agentName = lead.assigned_to
            ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`
            : "Unassigned";

          return (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 bg-white px-4 py-4 hover:bg-dash-bg/40 sm:px-6 lg:grid lg:grid-cols-8 lg:gap-4 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleStarToggle(lead);
                  }}
                  aria-label={lead.is_starred ? "Remove from watchlist" : "Add to watchlist"}
                  aria-pressed={lead.is_starred}
                  className={`shrink-0 transition-colors ${
                    lead.is_starred ? "text-warm" : "text-dash-muted hover:text-dash-ink"
                  }`}
                >
                  <StarIcon className="size-4" filled={lead.is_starred} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stage-inquiry">{lead.lead_no}</p>
                  <p className="hidden truncate text-[11px] text-dash-muted lg:block">
                    {formatCreated(lead.created_at)}
                  </p>
                </div>
              </div>

              <div className="min-w-0 flex-1 lg:flex-none">
                <p className="truncate text-sm font-semibold text-dash-ink">{lead.client_name}</p>
                <p className="truncate text-[11px] text-dash-muted">
                  {lead.customer ? `Customer #${lead.customer.customer_no} · ` : ""}
                  {lead.client_lead_count} Lead{lead.client_lead_count === 1 ? "" : "s"}
                </p>
              </div>

              <div className="hidden min-w-0 lg:block">
                {lead.last_task ? (
                  <>
                    <p className="truncate text-sm text-dash-ink" title={taskLabel(lead.last_task)}>
                      {taskLabel(lead.last_task)}
                    </p>
                    <p className="truncate text-[11px] text-dash-muted">
                      {formatDue(lead.last_task.due_date)}
                      {lead.last_task.completed ? " · Done" : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-dash-muted">—</p>
                )}
              </div>

              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm text-dash-ink">{location || "—"}</p>
                {interestLine && <p className="truncate text-[11px] text-dash-muted">{interestLine}</p>}
              </div>

              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm text-dash-ink">{lead.source?.name ?? "—"}</p>
                {lead.sub_source && (
                  <p className="truncate text-[11px] text-dash-muted">{lead.sub_source}</p>
                )}
              </div>

              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm text-dash-ink">{agentName}</p>
                {lead.assigned_to?.team && (
                  <p className="truncate text-[11px] text-dash-muted">{lead.assigned_to.team}</p>
                )}
              </div>

              {/* Below lg the desktop-only columns fold into one summary line. */}
              <p className="w-full truncate text-xs text-dash-muted lg:hidden">
                {[interestLine, location, lead.source?.name, agentName].filter(Boolean).join(" · ")}
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.45px] ${
                    TEMP_BADGES[lead.temperature] ?? "bg-badge-neutral text-dash-muted"
                  }`}
                >
                  {lead.temperature}
                </span>
                <span className="rounded bg-badge-neutral px-1.5 py-0.5 text-[9px] uppercase tracking-[0.45px] text-dash-muted">
                  {STAGE_LABELS[lead.stage] ?? lead.stage}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
                {/* Mirrors the server rule: admins for any lead, agents only for their own. */}
                {(admin || lead.assigned_to?.id === sessionUserId) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaskLead(lead);
                    }}
                    aria-label={`Add task for ${lead.client_name}`}
                    title="Add task"
                    className={`${actionButton} text-stage-inquiry`}
                  >
                    <TasksIcon className="size-4" />
                  </button>
                )}
                <a
                  href={whatsappUrl(lead.client_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`WhatsApp ${lead.client_name}`}
                  className={`${actionButton} text-stage-sold`}
                >
                  <WhatsAppIcon className="size-4" />
                </a>
                <a
                  href={`tel:${lead.client_number}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Call ${lead.client_name}`}
                  className={`${actionButton} text-dash-muted`}
                >
                  <PhoneIcon className="size-3.5" />
                </a>
              </div>
            </div>
          );
        })}

        <div className="flex flex-col items-center gap-3 border-t border-dash-border bg-white px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <p className="text-xs text-dash-muted">
            Showing {firstRow}–{lastRow} of {total} leads
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="rounded-md px-3 py-1.5 text-sm text-dash-ink disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-1 text-sm text-dash-muted sm:hidden">
              {page} / {totalPages}
            </span>
            <div className="hidden items-center gap-1 sm:flex">
              {pageNumbers(page, totalPages).map((entry, i) =>
                typeof entry === "number" ? (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setPage(entry)}
                    className={`flex size-8 items-center justify-center rounded-md text-sm text-dash-ink ${
                      entry === page ? "bg-badge-neutral" : ""
                    }`}
                  >
                    {entry}
                  </button>
                ) : (
                  <span key={`gap-${i}`} className="px-1 text-base text-dash-muted">
                    …
                  </span>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="rounded-md px-3 py-1.5 text-sm text-dash-ink disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
    <LeadDetailModal
      key={selectedLead?.id}
      lead={selectedLead}
      onClose={() => setSelectedLead(null)}
      onChanged={load}
    />
    {isImportOpen && (
      <ImportCsvModal kind="leads" onClose={() => setIsImportOpen(false)} onImported={load} />
    )}
    <NewLeadModal isOpen={isNewLeadOpen} onClose={() => setIsNewLeadOpen(false)} />
    {taskLead && (
      <LogTaskModal key={taskLead.id} lead={taskLead} onClose={() => setTaskLead(null)} onSaved={load} />
    )}
    </ViewTransition>
  );
}
