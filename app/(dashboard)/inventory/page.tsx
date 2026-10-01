"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ViewTransition } from "react";
import {
  LockIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons/DashboardIcons";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { ListingDetailModal } from "@/components/inventory/ListingDetailModal";
import { ListingFormModal, type ListingDraft } from "@/components/inventory/ListingFormModal";
import { UnitFormModal } from "@/components/inventory/UnitFormModal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createListing,
  createUnit,
  deleteListing,
  deleteUnit,
  getAgents,
  getCategories,
  getInterests,
  getListings,
  getPartnerProjects,
  getUnits,
  updateListing,
  updateUnit,
  type Listing,
  type Unit,
  type UnitInput,
  type UnitStatus,
} from "@/lib/api";
import { UNIT_STATUSES } from "@/lib/inventory";
import { useIsAdmin } from "@/lib/session";

type View = "units" | "resale";

const PAGE_SIZE = 20;

// Spans only apply to the lg grid; below lg each row collapses into a card.
const COLS = {
  unit: "lg:col-span-2",
  project: "lg:col-span-2",
  features: "lg:col-span-1",
  type: "lg:col-span-2",
  floor: "lg:col-span-1",
  beds: "lg:col-span-1",
  price: "lg:col-span-2",
  area: "lg:col-span-1",
  status: "lg:col-span-2",
  actions: "lg:col-span-1",
};

const SORT_OPTIONS: SelectOption[] = [
  { id: "desc", name: "Date created descending" },
  { id: "asc", name: "Date created ascending" },
];

const ALL: SelectOption = { id: "", name: "All" };

const headerCell = "text-xs font-bold uppercase tracking-[0.6px] text-dash-muted";

const actionButton =
  "flex size-7 items-center justify-center rounded-lg border border-dash-border text-dash-muted transition-colors hover:bg-dash-bg";

const cardClass =
  "flex cursor-pointer flex-col gap-3 rounded-lg border border-dash-border bg-white p-4 text-left shadow-sm transition-colors hover:border-dash-muted/40 hover:bg-dash-bg/40";

function formatPrice(price: number | null) {
  return price == null ? "—" : `PKR ${price.toLocaleString()}`;
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

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <Inventory />
    </Suspense>
  );
}

function Inventory() {
  const admin = useIsAdmin();
  // Seeded from ?project= so the projects page can link straight to one project's units.
  const initialProject = useSearchParams().get("project") ?? "";

  const [view, setView] = useState<View>("units");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [units, setUnits] = useState<Unit[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<UnitStatus, number> | null>(null);
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<UnitStatus | "all">("all");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [projectId, setProjectId] = useState(initialProject);
  const [unitType, setUnitType] = useState("");
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  const [projects, setProjects] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [openListing, setOpenListing] = useState<Listing | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isListingFormOpen, setIsListingFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categoryNames = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const interestNames = useMemo(() => Object.fromEntries(interests.map((i) => [i.id, i.name])), [interests]);

  function categoryNameFor(id: string | null) {
    return (id && categoryNames[id]) || "Uncategorised";
  }

  function interestNameFor(id: string | null) {
    return (id && interestNames[id]) || "Any type";
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    Promise.all([getCategories(), getInterests(), getPartnerProjects({ limit: 500 })])
      .then(([categoryList, interestList, projectList]) => {
        setCategories(categoryList);
        setInterests(interestList);
        setProjects(projectList.map((p) => ({ id: p.id, name: p.project_name })));
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

  const isUnitsView = view === "units";

  // The one search box drives whichever view is showing: unit number here, area/city in resale.
  const loadUnits = useCallback(() => {
    getUnits({
      project_id: projectId || undefined,
      unit_type: unitType || undefined,
      search: isUnitsView ? debouncedSearch || undefined : undefined,
      status: status === "all" ? undefined : status,
      sort,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        // Deleting the last row on a page would otherwise strand you on an empty one.
        if (res.data.length === 0 && page > 1) setPage((p) => p - 1);
        setUnits(res.data);
        setTotal(res.total);
        setStatusCounts(res.status_counts);
        setUnitTypes(res.unit_types);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load units."))
      .finally(() => setIsLoadingUnits(false));
  }, [projectId, unitType, isUnitsView, debouncedSearch, status, sort, page]);

  const loadListings = useCallback(() => {
    getListings({ search: isUnitsView ? undefined : debouncedSearch || undefined })
      .then(setListings)
      .catch(() => {})
      .finally(() => setIsLoadingListings(false));
  }, [isUnitsView, debouncedSearch]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  async function handleUnitSubmit(draft: UnitInput) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, draft);
      } else {
        await createUnit(draft);
      }
      setIsUnitFormOpen(false);
      setEditingUnit(null);
      loadUnits();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that unit.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUnit(unit: Unit) {
    if (!window.confirm(`Delete unit ${unit.unit_number}? This can't be undone.`)) return;
    try {
      await deleteUnit(unit.id);
      loadUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that unit.");
    }
  }

  async function handleListingSubmit(draft: ListingDraft) {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingListing) {
        await updateListing(editingListing.id, draft);
      } else {
        await createListing(draft);
      }
      setIsListingFormOpen(false);
      setEditingListing(null);
      setOpenListing(null);
      loadListings();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that listing.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteListing(listing: Listing) {
    try {
      await deleteListing(listing.id);
      setOpenListing(null);
      loadListings();
    } catch {
      /* the detail modal stays open so the row isn't silently lost */
    }
  }

  const allCount = statusCounts ? Object.values(statusCounts).reduce((sum, n) => sum + n, 0) : null;
  const tabs: { id: UnitStatus | "all"; label: string; count: number | null }[] = [
    { id: "all", label: "All", count: allCount },
    ...UNIT_STATUSES.map((s) => ({ id: s.id, label: s.tab, count: statusCounts?.[s.id] ?? null })),
  ];

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);
  const selectedProjectName = projects.find((p) => p.id === projectId)?.name;

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="font-serif text-[28px] font-semibold text-dash-ink sm:text-[34px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Inventory
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isUnitsView ? "Search unit number..." : "Search area, city..."}
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-3 text-sm text-dash-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          {admin && isUnitsView && (
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              disabled={!projectId}
              title={projectId ? undefined : "Select a project in the filter first"}
              className="shrink-0 rounded-lg border border-dash-border px-4 py-2.5 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import
            </button>
          )}
          {admin && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                if (isUnitsView) {
                  setEditingUnit(null);
                  setIsUnitFormOpen(true);
                } else {
                  setEditingListing(null);
                  setIsListingFormOpen(true);
                }
              }}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
            >
              <PlusIcon className="size-3" />
              {isUnitsView ? "Add unit" : "Seller lead"}
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative grid w-full grid-cols-2 rounded-xl bg-badge-neutral p-1 sm:w-auto">
          {/* Sliding thumb: same width as one cell, so translate-x-full lands it exactly on the other. */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out ${
              isUnitsView ? "translate-x-0" : "translate-x-full"
            }`}
          />
          {([
            ["units", "Project Units"],
            ["resale", "Resale (Client Listings)"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`relative z-10 whitespace-nowrap px-3 py-1.5 text-sm font-semibold transition-colors sm:px-5 ${
                view === id ? "text-dash-ink" : "text-dash-muted hover:text-dash-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isUnitsView ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="unit-filter-project" className="text-xs text-dash-muted">
                Project
              </label>
              <Select
                id="unit-filter-project"
                value={projectId}
                onChange={(v) => {
                  setProjectId(v);
                  setPage(1);
                }}
                options={[ALL, ...projects]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="unit-filter-type" className="text-xs text-dash-muted">
                Unit type
              </label>
              <Select
                id="unit-filter-type"
                value={unitType}
                onChange={(v) => {
                  setUnitType(v);
                  setPage(1);
                }}
                options={[ALL, ...unitTypes.map((t) => ({ id: t, name: t }))]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="unit-sort" className="text-xs text-dash-muted">
                Sort by
              </label>
              <Select
                id="unit-sort"
                value={sort}
                onChange={(v) => {
                  setSort(v as "asc" | "desc");
                  setPage(1);
                }}
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          <div className="border-b border-dash-border">
            <div className="-mb-px flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatus(tab.id);
                    setPage(1);
                  }}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                    status === tab.id
                      ? "border-dash-ink font-semibold text-dash-ink"
                      : "border-transparent text-dash-muted hover:text-dash-ink"
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className="ml-1 text-xs font-normal text-dash-muted">({formatCount(tab.count)})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

          <div className="overflow-hidden rounded-lg border border-dash-border">
            <div className="hidden gap-3 border-b border-dash-border bg-dash-bg/50 px-6 py-4 lg:grid lg:grid-cols-15">
              <p className={`${COLS.unit} ${headerCell}`}>Unit</p>
              <p className={`${COLS.project} ${headerCell}`}>Project</p>
              <p className={`${COLS.features} ${headerCell}`}>Feat</p>
              <p className={`${COLS.type} ${headerCell}`}>Type</p>
              <p className={`${COLS.floor} ${headerCell}`}>Location</p>
              <p className={`${COLS.beds} ${headerCell}`}>Beds</p>
              <p className={`${COLS.price} ${headerCell}`}>Price (PKR)</p>
              <p className={`${COLS.area} ${headerCell}`}>Area (sqft)</p>
              <p className={`${COLS.status} ${headerCell}`}>Status</p>
              {admin && <p className={`${COLS.actions} ${headerCell}`}>Actions</p>}
            </div>

            {isLoadingUnits &&
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex flex-wrap items-center gap-3 bg-white px-4 py-4 lg:grid lg:grid-cols-15 lg:px-6 ${
                    i > 0 ? "border-t border-dash-border" : ""
                  }`}
                >
                  <Skeleton className={`${COLS.unit} h-4 w-20`} />
                  <Skeleton className={`${COLS.project} h-4 w-28`} />
                  <Skeleton className={`${COLS.features} hidden h-4 w-10 lg:block`} />
                  <Skeleton className={`${COLS.type} hidden h-4 w-20 lg:block`} />
                  <Skeleton className={`${COLS.floor} hidden h-4 w-12 lg:block`} />
                  <Skeleton className={`${COLS.beds} hidden h-4 w-6 lg:block`} />
                  <Skeleton className={`${COLS.price} h-4 w-24`} />
                  <Skeleton className={`${COLS.area} hidden h-4 w-10 lg:block`} />
                  <Skeleton className={`${COLS.status} h-5 w-20`} />
                </div>
              ))}

            {!isLoadingUnits && units.length === 0 && (
              <p className="bg-white px-4 py-10 text-center text-sm text-dash-placeholder lg:px-6">
                {debouncedSearch || projectId || unitType || status !== "all"
                  ? "No units match those filters."
                  : "No units yet. Add a unit, or pick a project and import a CSV."}
              </p>
            )}

            {!isLoadingUnits &&
              units.map((unit, i) => {
                const unitStatus = UNIT_STATUSES.find((s) => s.id === unit.status);
                return (
                  <div
                    key={unit.id}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 bg-white px-4 py-4 transition-colors hover:bg-dash-bg/40 lg:grid lg:grid-cols-15 lg:px-6 ${
                      i > 0 ? "border-t border-dash-border" : ""
                    }`}
                  >
                    <p className={`${COLS.unit} truncate text-sm font-semibold text-stage-inquiry`}>
                      {unit.unit_number}
                    </p>
                    <p className={`${COLS.project} min-w-0 flex-1 truncate text-sm text-dash-ink lg:flex-none`}>
                      {unit.project?.name ?? "—"}
                    </p>
                    <p
                      className={`${COLS.features} hidden truncate text-sm text-dash-ink lg:block`}
                      title={unit.features ?? undefined}
                    >
                      {unit.features || "—"}
                    </p>
                    <p className={`${COLS.type} hidden truncate text-sm text-dash-ink lg:block`}>
                      {unit.unit_type || "—"}
                    </p>
                    <p
                      className={`${COLS.floor} hidden truncate text-sm text-dash-ink lg:block`}
                      title={unit.floor ?? undefined}
                    >
                      {unit.floor || "—"}
                    </p>
                    <p className={`${COLS.beds} hidden text-sm text-dash-ink lg:block`}>{unit.beds ?? "—"}</p>
                    <p className={`${COLS.price} truncate text-sm text-dash-ink`}>
                      {unit.price != null ? unit.price.toLocaleString() : "—"}
                    </p>
                    <p className={`${COLS.area} hidden text-sm text-dash-ink lg:block`}>
                      {unit.area_sqft != null ? unit.area_sqft.toLocaleString() : "—"}
                    </p>

                    {/* Below lg the desktop-only columns fold into one summary line. */}
                    <p className="w-full truncate text-xs text-dash-muted lg:hidden">
                      {[
                        unit.unit_type,
                        unit.floor,
                        unit.beds != null && `${unit.beds} beds`,
                        unit.area_sqft != null && `${unit.area_sqft.toLocaleString()} sqft`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No details yet"}
                    </p>

                    <div className={`${COLS.status} min-w-0`}>
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.45px] ${
                          unitStatus?.className ?? "bg-badge-neutral text-dash-muted"
                        }`}
                      >
                        {unitStatus?.label ?? unit.status}
                      </span>
                      {unit.lead && (
                        <p className="mt-1 truncate text-[11px] text-dash-muted">
                          Lead #{unit.lead.lead_no} · {unit.lead.client_name}
                        </p>
                      )}
                    </div>

                    {admin && (
                      <div className={`${COLS.actions} ml-auto flex items-center gap-1 lg:ml-0`}>
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setEditingUnit(unit);
                            setIsUnitFormOpen(true);
                          }}
                          aria-label={`Edit unit ${unit.unit_number}`}
                          title="Edit"
                          className={actionButton}
                        >
                          <PencilIcon className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteUnit(unit)}
                          aria-label={`Delete unit ${unit.unit_number}`}
                          title="Delete"
                          className={`${actionButton} hover:text-red-600`}
                        >
                          <TrashIcon className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

            <div className="flex flex-col items-center gap-3 border-t border-dash-border bg-white px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
              <p className="text-xs text-dash-muted">
                Showing {firstRow}–{lastRow} of {total} unit{total === 1 ? "" : "s"}
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
        </>
      ) : isLoadingListings ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-dash-border bg-white p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-dash-border py-16 text-center text-sm text-dash-placeholder">
          {debouncedSearch ? "No listings match that search." : "No client listings yet."}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {listings.map((listing) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => setOpenListing(listing)}
              className={cardClass}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-dash-ink">
                  {listing.area_name}
                </p>
                <span className="shrink-0 rounded-full bg-badge-neutral px-2 py-0.5 text-[11px] text-dash-ink">
                  {categoryNameFor(listing.category_id)}
                </span>
              </div>

              <p className="truncate text-[13px] text-dash-muted">
                {interestNameFor(listing.interest_id)}
              </p>

              <p className="flex items-center gap-1.5 text-[13px] text-dash-muted">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">
                  {[listing.location, listing.city].filter(Boolean).join(", ") || "—"}
                </span>
              </p>

              <p className="text-[15px] font-bold text-dash-ink">{formatPrice(listing.price)}</p>

              <p className="flex items-center gap-1.5 border-t border-dash-border pt-3 text-xs text-dash-muted">
                {listing.can_see_contact ? (
                  <span className="truncate">{listing.client_name}</span>
                ) : (
                  <>
                    <LockIcon className="size-3 shrink-0" />
                    <span className="truncate">Contact hidden</span>
                  </>
                )}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>

    {isUnitFormOpen && (
      <UnitFormModal
        key={editingUnit?.id ?? "new-unit"}
        initial={editingUnit}
        defaultProjectId={projectId}
        projects={projects}
        unitTypes={unitTypes}
        isSaving={isSaving}
        error={formError}
        onClose={() => {
          setIsUnitFormOpen(false);
          setEditingUnit(null);
        }}
        onSubmit={handleUnitSubmit}
      />
    )}

    {isImportOpen && (
      <ImportCsvModal
        kind="units"
        projectId={projectId}
        projectName={selectedProjectName}
        onClose={() => setIsImportOpen(false)}
        onImported={loadUnits}
      />
    )}

    {isListingFormOpen && (
      <ListingFormModal
        key={editingListing?.id ?? "new-listing"}
        initial={editingListing}
        categories={categories}
        interests={interests}
        agents={agents}
        showAssignee={admin}
        isSaving={isSaving}
        error={formError}
        onClose={() => {
          setIsListingFormOpen(false);
          setEditingListing(null);
        }}
        onSubmit={handleListingSubmit}
      />
    )}

    {openListing && !isListingFormOpen && (
      <ListingDetailModal
        listing={openListing}
        categoryName={categoryNameFor(openListing.category_id)}
        interestName={interestNameFor(openListing.interest_id)}
        canManage={admin}
        onClose={() => setOpenListing(null)}
        onEdit={() => {
          setFormError(null);
          setEditingListing(openListing);
          setIsListingFormOpen(true);
        }}
        onDelete={() => handleDeleteListing(openListing)}
      />
    )}
    </ViewTransition>
  );
}
