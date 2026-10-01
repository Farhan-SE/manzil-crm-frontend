"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ViewTransition } from "react";
import {
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  WhatsAppIcon,
} from "@/components/icons/DashboardIcons";
import { StageSelect } from "@/components/customers/StageSelect";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getCustomers,
  getSessionUser,
  setCustomerStarred,
  updateCustomer,
  type Customer,
  type CustomerStage,
} from "@/lib/api";
import { CUSTOMER_STAGES, flagUrl, whatsappUrl } from "@/lib/customers";
import { useIsAdmin } from "@/lib/session";

// Spans only apply to the lg grid; below lg each row collapses into a card.
const COLS = {
  id: "lg:col-span-2",
  name: "lg:col-span-2",
  location: "lg:col-span-2",
  source: "lg:col-span-2",
  allocation: "lg:col-span-2",
  stage: "lg:col-span-2",
  actions: "lg:col-span-1",
};

const SORT_OPTIONS: SelectOption[] = [
  { id: "desc", name: "Customer ID descending" },
  { id: "asc", name: "Customer ID ascending" },
];

const headerCell = "text-xs font-bold uppercase tracking-[0.6px] text-dash-muted";

const actionButton =
  "flex size-8 items-center justify-center rounded-lg border border-dash-border transition-colors hover:bg-dash-bg";

const PAGE_SIZE = 20;

function formatAdded(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
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

export default function CustomersPage() {
  const admin = useIsAdmin();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<CustomerStage | "all">("all");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<CustomerStage, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stageFilter, sort]);

  // `silent` refreshes rows and tab counts in place, without flashing the skeleton.
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const res = await getCustomers({
          search: debouncedSearch || undefined,
          stage: stageFilter === "all" ? undefined : stageFilter,
          sort,
          page,
          limit: PAGE_SIZE,
        });
        setCustomers(res.data);
        setTotal(res.total);
        setStageCounts(res.stage_counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customers.");
        if (!silent) {
          setCustomers([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, stageFilter, sort, page],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStarToggle(customer: Customer) {
    const next = !customer.is_starred;
    const apply = (value: boolean) =>
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, is_starred: value } : c)));
    apply(next);
    try {
      await setCustomerStarred(customer.id, next);
    } catch (err) {
      apply(!next);
      setError(err instanceof Error ? err.message : "Couldn't update that customer.");
    }
  }

  async function handleStageChange(customer: Customer, stage: CustomerStage) {
    if (stage === customer.stage) return;
    try {
      await updateCustomer(customer.id, { stage });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change that stage.");
    }
  }

  const sessionUserId = getSessionUser()?.id;
  const allCount = stageCounts ? Object.values(stageCounts).reduce((sum, n) => sum + n, 0) : null;
  const tabs: { id: CustomerStage | "all"; label: string; count: number | null }[] = [
    { id: "all", label: "All", count: allCount },
    ...CUSTOMER_STAGES.map((s) => ({ id: s.id, label: s.label, count: stageCounts?.[s.id] ?? null })),
  ];

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="font-serif text-[28px] font-semibold text-dash-ink sm:text-[34px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Customers
        </h1>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, CNIC, number..."
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-3 text-sm text-dash-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          {admin && (
            <>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="flex-1 rounded-lg border border-dash-border px-4 py-2.5 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg sm:flex-none"
              >
                Import
              </button>
              <Link
                href="/customers/new"
                className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 sm:flex-none"
              >
                <PlusIcon className="size-3" />
                Add customer
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-dash-border md:flex-row md:items-end md:justify-between">
        <div className="-mb-px flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStageFilter(tab.id)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                stageFilter === tab.id
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

        <div className="flex items-center gap-2 pb-2">
          <label htmlFor="customer-sort" className="shrink-0 text-xs text-dash-muted">
            Sort by
          </label>
          <div className="w-56">
            <Select
              id="customer-sort"
              value={sort}
              onChange={(v) => setSort(v as "asc" | "desc")}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-dash-border">
        <div className="hidden gap-4 border-b border-dash-border bg-dash-bg/50 px-6 py-4 lg:grid lg:grid-cols-13">
          <p className={`${COLS.id} ${headerCell} pl-7`}>Customer ID</p>
          <p className={`${COLS.name} ${headerCell}`}>Full name</p>
          <p className={`${COLS.location} ${headerCell}`}>Location</p>
          <p className={`${COLS.source} ${headerCell}`}>Source</p>
          <p className={`${COLS.allocation} ${headerCell}`}>Allocation</p>
          <p className={`${COLS.stage} ${headerCell}`}>Stage</p>
          <p className={`${COLS.actions} ${headerCell}`}>Actions</p>
        </div>

        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-3 bg-white px-4 py-4 lg:grid lg:grid-cols-13 lg:gap-4 lg:px-6 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <Skeleton className={`${COLS.id} h-4 w-20`} />
              <Skeleton className={`${COLS.name} h-4 w-32`} />
              <Skeleton className={`${COLS.location} hidden h-4 w-20 lg:block`} />
              <Skeleton className={`${COLS.source} hidden h-4 w-24 lg:block`} />
              <Skeleton className={`${COLS.allocation} hidden h-4 w-24 lg:block`} />
              <Skeleton className={`${COLS.stage} h-5 w-16`} />
              <Skeleton className={`${COLS.actions} hidden h-8 w-16 lg:block`} />
            </div>
          ))}

        {!isLoading && customers.length === 0 && (
          <p className="bg-white px-4 py-10 text-center text-sm text-dash-placeholder lg:px-6">
            {debouncedSearch || stageFilter !== "all"
              ? "No customers match those filters."
              : "No customers yet."}
          </p>
        )}

        {!isLoading &&
          customers.map((customer, i) => {
            const stage = CUSTOMER_STAGES.find((s) => s.id === customer.stage);
            const agentName = customer.assigned_to
              ? `${customer.assigned_to.first_name} ${customer.assigned_to.last_name}`
              : "Unassigned";
            // Mirrors the server rule: admins edit anyone, agents only their own customers.
            const canEdit = admin || customer.assigned_to?.id === sessionUserId;
            const stageClass = `rounded-full px-3 py-1 text-[11px] font-bold ${
              stage?.className ?? "bg-badge-neutral text-dash-muted"
            }`;
            const href = `/customers/${customer.id}`;

            return (
              <div
                key={customer.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 bg-white px-4 py-4 transition-colors hover:bg-dash-bg/40 lg:grid lg:grid-cols-13 lg:gap-4 lg:px-6 ${
                  i > 0 ? "border-t border-dash-border" : ""
                }`}
              >
                <div className={`${COLS.id} flex min-w-0 items-center gap-3`}>
                  <button
                    type="button"
                    onClick={() => void handleStarToggle(customer)}
                    aria-label={customer.is_starred ? "Remove star" : "Add star"}
                    aria-pressed={customer.is_starred}
                    className={`shrink-0 transition-colors ${
                      customer.is_starred ? "text-warm" : "text-dash-muted hover:text-dash-ink"
                    }`}
                  >
                    <StarIcon className="size-4" filled={customer.is_starred} />
                  </button>
                  <div className="min-w-0">
                    <Link href={href} className="text-sm font-semibold text-stage-inquiry hover:underline">
                      {customer.customer_no}
                    </Link>
                    <p className="hidden truncate text-[11px] text-dash-muted lg:block">
                      {formatAdded(customer.created_at)}
                    </p>
                  </div>
                </div>

                <div className={`${COLS.name} min-w-0 flex-1 lg:flex-none`}>
                  <Link
                    href={href}
                    className="block truncate text-sm font-semibold text-dash-ink hover:underline"
                  >
                    {customer.customer_name}
                  </Link>
                  <p className="truncate text-[11px] text-dash-muted">
                    {customer.lead_count} Lead{customer.lead_count === 1 ? "" : "s"}
                  </p>
                </div>

                <div className={`${COLS.location} hidden min-w-0 items-center gap-2 lg:flex`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flagUrl(customer.country)}
                    alt={customer.country}
                    width={20}
                    height={15}
                    className="shrink-0 rounded-xs"
                  />
                  <p className="truncate text-sm text-dash-ink">{customer.city || "—"}</p>
                </div>

                <div className={`${COLS.source} hidden min-w-0 lg:block`}>
                  <p className="truncate text-sm text-dash-ink">{customer.source?.name ?? "—"}</p>
                  {customer.sub_source && (
                    <p className="truncate text-[11px] text-dash-muted">{customer.sub_source}</p>
                  )}
                </div>

                <div className={`${COLS.allocation} hidden min-w-0 lg:block`}>
                  <p className="truncate text-sm text-dash-ink">{agentName}</p>
                  {customer.assigned_to?.team && (
                    <p className="truncate text-[11px] text-dash-muted">{customer.assigned_to.team}</p>
                  )}
                </div>

                <div className={`${COLS.stage} shrink-0`}>
                  {canEdit ? (
                    <StageSelect
                      value={customer.stage}
                      onChange={(next) => void handleStageChange(customer, next)}
                      label={`Stage for ${customer.customer_name}`}
                    />
                  ) : (
                    <span className={stageClass}>{stage?.label ?? customer.stage}</span>
                  )}
                </div>

                {/* Below lg the location, source and agent columns fold into one line. */}
                <p className="w-full truncate text-xs text-dash-muted lg:hidden">
                  {[customer.city, customer.source?.name, agentName].filter(Boolean).join(" · ")}
                </p>

                <div className={`${COLS.actions} flex items-center gap-2`}>
                  <a
                    href={whatsappUrl(customer.contact_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp ${customer.customer_name}`}
                    className={`${actionButton} text-stage-sold`}
                  >
                    <WhatsAppIcon className="size-4" />
                  </a>
                  <a
                    href={`tel:${customer.contact_number}`}
                    aria-label={`Call ${customer.customer_name}`}
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
            Showing {firstRow}–{lastRow} of {total} customer{total === 1 ? "" : "s"}
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
              {page} / {lastPage}
            </span>
            <div className="hidden items-center gap-1 sm:flex">
              {pageNumbers(page, lastPage).map((entry, i) =>
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
              onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
              disabled={page >= lastPage}
              className="rounded-md px-3 py-1.5 text-sm text-dash-ink disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    {isImportOpen && (
      <ImportCsvModal
        kind="customers"
        onClose={() => setIsImportOpen(false)}
        onImported={() => void load()}
      />
    )}
    </ViewTransition>
  );
}
