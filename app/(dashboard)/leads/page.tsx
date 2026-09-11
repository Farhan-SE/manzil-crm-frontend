"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ViewTransition } from "react";
import { FilterIcon, PhoneIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  LeadsFilterPanel,
  type LeadFilters,
} from "@/components/LeadsFilterPanel";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SelectOption } from "@/components/ui/Select";
import {
  getAgents,
  getCategories,
  getInterests,
  getLeads,
  getSources,
  isAdmin,
  type Lead,
} from "@/lib/api";

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

// Spans only apply to the lg grid; below lg each row collapses into a card.
const COLUMN_CLASSES = {
  client: "lg:col-span-3",
  category: "lg:col-span-1",
  interest: "lg:col-span-2",
  location: "lg:col-span-2",
  budget: "lg:col-span-1",
  status: "lg:col-span-2",
  actions: "lg:col-span-1",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function toNameMap(items: { id: string; name: string }[]) {
  return Object.fromEntries(items.map((item) => [item.id, item.name]));
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
  const admin = isAdmin();
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Seeded from ?search= so the dashboard's quick search can land here on a lead.
  const initialSearch = useSearchParams().get("search") ?? "";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);

  const interestNames = useMemo(() => toNameMap(interests), [interests]);
  const categoryNames = useMemo(() => toNameMap(categories), [categories]);
  const sourceNames = useMemo(() => toNameMap(sources), [sources]);

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
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [page, debouncedSearch, filters]);

  useEffect(() => {
    load();
    window.addEventListener("leads:changed", load);
    return () => window.removeEventListener("leads:changed", load);
  }, [load]);

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
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, number, city..."
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
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="shrink-0 rounded-lg border border-dash-border px-4 py-2.5 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
            >
              Import
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-dash-border">
        <div className="hidden gap-4 border-b border-dash-border bg-dash-bg/50 px-6 py-4 lg:grid lg:grid-cols-12">
          <p className={`${COLUMN_CLASSES.client} text-xs font-bold uppercase tracking-[0.6px] text-dash-muted`}>
            Client &amp; Source
          </p>
          <p className={`${COLUMN_CLASSES.category} text-xs font-bold uppercase tracking-[0.6px] text-dash-muted`}>
            Category
          </p>
          <p className={`${COLUMN_CLASSES.interest} text-xs font-bold uppercase tracking-[0.6px] text-dash-muted`}>
            Interest
          </p>
          <p className={`${COLUMN_CLASSES.location} text-xs font-bold uppercase tracking-[0.6px] text-dash-muted`}>
            Location
          </p>
          <p className={`${COLUMN_CLASSES.budget} text-xs font-bold uppercase tracking-[0.6px] text-dash-muted`}>
            Budget
          </p>
          <p className={`${COLUMN_CLASSES.status} text-xs font-bold uppercase tracking-[0.6px] text-dash-muted`}>
            Status
          </p>
          <p className={`${COLUMN_CLASSES.actions} text-right text-xs font-bold uppercase tracking-[0.6px] text-dash-muted`}>
            Actions
          </p>
        </div>

        {isLoading &&
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className={`flex flex-col gap-2 bg-white px-4 py-4 sm:px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-4 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <div className={`${COLUMN_CLASSES.client} flex items-center gap-3`}>
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className={`${COLUMN_CLASSES.category} hidden h-3 w-12 lg:block`} />
              <Skeleton className={`${COLUMN_CLASSES.interest} hidden h-3 w-16 lg:block`} />
              <Skeleton className={`${COLUMN_CLASSES.location} hidden h-3 w-28 lg:block`} />
              <div className={`${COLUMN_CLASSES.budget} hidden flex-col gap-1.5 lg:flex`}>
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-2.5 w-14" />
              </div>
              <div className={`${COLUMN_CLASSES.status} flex gap-1.5 pl-11 lg:pl-0`}>
                <Skeleton className="h-4 w-11" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className={`${COLUMN_CLASSES.actions} hidden justify-end lg:flex`}>
                <Skeleton className="size-5" />
              </div>
            </div>
          ))}

        {!isLoading && leads.length === 0 && (
          <p className="bg-white px-6 py-8 text-center text-sm text-dash-placeholder">
            {debouncedSearch || activeFilterCount > 0
              ? "No leads match those filters."
              : "No leads yet."}
          </p>
        )}

        {leads.map((lead, i) => (
          <div
            key={lead.id}
            onClick={() => setSelectedLead(lead)}
            className={`flex cursor-pointer flex-col gap-2 bg-white px-4 py-4 hover:bg-dash-bg/40 sm:px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-4 ${
              i > 0 ? "border-t border-dash-border" : ""
            }`}
          >
            <div className={`${COLUMN_CLASSES.client} flex min-w-0 items-center gap-3`}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dash-border bg-avatar/20 text-xs text-dash-ink">
                {initials(lead.client_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-dash-ink">{lead.client_name}</p>
                <p className="truncate text-[11px] text-dash-muted">
                  {(lead.source_id && sourceNames[lead.source_id]) || lead.client_number}
                </p>
              </div>
              <a
                href={`tel:${lead.client_number}`}
                onClick={(e) => e.stopPropagation()}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dash-border text-dash-muted lg:hidden"
                aria-label={`Call ${lead.client_name}`}
              >
                <PhoneIcon className="size-3.5" />
              </a>
            </div>
            <p className={`${COLUMN_CLASSES.category} hidden truncate text-sm text-dash-ink lg:block`}>
              {(lead.category_id && categoryNames[lead.category_id]) || "—"}
            </p>
            <p className={`${COLUMN_CLASSES.interest} hidden truncate text-sm text-dash-ink lg:block`}>
              {(lead.interest_id && interestNames[lead.interest_id]) || "—"}
            </p>
            <p className={`${COLUMN_CLASSES.location} hidden truncate text-sm text-dash-ink lg:block`}>
              {[lead.area, lead.city].filter(Boolean).join(", ") || "—"}
            </p>
            {/* Below lg the four desktop columns fold into one summary line under the name. */}
            <p className="truncate pl-11 text-xs text-dash-muted lg:hidden">
              {[
                lead.category_id && categoryNames[lead.category_id],
                lead.interest_id && interestNames[lead.interest_id],
                [lead.area, lead.city].filter(Boolean).join(", "),
                lead.budget != null && `PKR ${lead.budget.toLocaleString()}`,
              ]
                .filter(Boolean)
                .join(" · ") || "No details yet"}
            </p>
            <div className={`${COLUMN_CLASSES.budget} hidden lg:block`}>
              {lead.budget == null ? (
                <p className="text-[11.5px] text-dash-muted">—</p>
              ) : (
                <>
                  <p className="text-[11.5px] text-dash-ink">PKR</p>
                  <p className="text-[11.5px] font-medium text-dash-ink">
                    {lead.budget.toLocaleString()}
                  </p>
                </>
              )}
            </div>
            <div className={`${COLUMN_CLASSES.status} flex flex-wrap items-center gap-1.5 pl-11 lg:pl-0`}>
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
            <div className={`${COLUMN_CLASSES.actions} hidden items-center justify-end gap-1 opacity-70 lg:flex`}>
              <a
                href={`tel:${lead.client_number}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center rounded p-1 text-dash-muted"
                aria-label={`Call ${lead.client_name}`}
              >
                <PhoneIcon className="size-3" />
              </a>
            </div>
          </div>
        ))}

        <div className="flex flex-col items-center gap-3 border-t border-dash-border bg-dash-bg/50 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
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
    </ViewTransition>
  );
}
