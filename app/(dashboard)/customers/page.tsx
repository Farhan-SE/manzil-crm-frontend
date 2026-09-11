"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ViewTransition } from "react";
import { PlusIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCustomers, type Customer } from "@/lib/api";
import { useIsAdmin } from "@/lib/session";

const CUSTOMER_TYPES = [
  { id: "buyer", label: "Buyer", className: "bg-cold/15 text-cold" },
  { id: "seller", label: "Seller", className: "bg-stage-site-visit/10 text-stage-site-visit" },
  { id: "investor", label: "Investor", className: "bg-warm/20 text-warm" },
];

// Spans only apply to the md grid; below md each row collapses into a card.
const COLS = {
  customer: "md:col-span-3",
  contact: "md:col-span-3",
  type: "md:col-span-2",
  since: "md:col-span-2",
  agent: "md:col-span-2",
};

const headerCell = "text-xs font-bold uppercase tracking-[0.6px] text-dash-muted";

const PAGE_SIZE = 20;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatSince(date: string | null) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCustomers({
        search: debouncedSearch || undefined,
        relation_type: typeFilter === "all" ? undefined : typeFilter,
        page,
        limit: PAGE_SIZE,
      });
      setCustomers(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers.");
      setCustomers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, typeFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

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
              placeholder="Search name, CNIC, number..."
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

      <div className="flex flex-wrap gap-2">
        {[["all", "All"], ...CUSTOMER_TYPES.map((t) => [t.id, t.label])].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTypeFilter(id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === id
                ? "border-dash-ink bg-dash-ink text-white"
                : "border-dash-border text-dash-muted hover:text-dash-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-dash-border">
        <div className="hidden gap-4 border-b border-dash-border bg-dash-bg/50 px-6 py-4 md:grid md:grid-cols-12">
          <p className={`${COLS.customer} ${headerCell}`}>Customer</p>
          <p className={`${COLS.contact} ${headerCell}`}>Contact</p>
          <p className={`${COLS.type} ${headerCell}`}>Type</p>
          <p className={`${COLS.since} ${headerCell}`}>Customer since</p>
          <p className={`${COLS.agent} ${headerCell}`}>Agent</p>
        </div>

        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 bg-white px-4 py-4 md:grid md:grid-cols-12 md:gap-4 md:px-6 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <div className={`${COLS.customer} flex min-w-0 flex-1 items-center gap-3`}>
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className={`${COLS.contact} hidden h-4 w-28 md:block`} />
              <Skeleton className={`${COLS.type} h-4 w-16 shrink-0`} />
              <Skeleton className={`${COLS.since} hidden h-4 w-20 md:block`} />
              <Skeleton className={`${COLS.agent} hidden h-4 w-24 md:block`} />
            </div>
          ))}

        {!isLoading && customers.length === 0 && (
          <p className="bg-white px-4 py-10 text-center text-sm text-dash-placeholder md:px-6">
            {debouncedSearch || typeFilter !== "all"
              ? "No customers match those filters."
              : "No customers yet."}
          </p>
        )}

        {!isLoading &&
          customers.map((customer, i) => {
            const type = CUSTOMER_TYPES.find((t) => t.id === customer.relation_type);
            const agentName = customer.assigned_to
              ? `${customer.assigned_to.first_name} ${customer.assigned_to.last_name}`
              : "Unassigned";
            return (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className={`flex flex-col gap-1.5 bg-white px-4 py-4 transition-colors hover:bg-dash-bg/40 md:grid md:grid-cols-12 md:items-center md:gap-4 md:px-6 ${
                  i > 0 ? "border-t border-dash-border" : ""
                }`}
              >
                <div className={`${COLS.customer} flex min-w-0 items-center gap-3`}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-avatar/30 text-xs font-bold text-dash-ink">
                    {initials(customer.customer_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-dash-ink">
                      {customer.customer_name}
                    </p>
                    <p className="truncate text-[11px] text-dash-muted">{customer.cnic_number}</p>
                  </div>
                  {type && (
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.45px] md:hidden ${type.className}`}
                    >
                      {type.label}
                    </span>
                  )}
                </div>

                {/* Below md the contact and agent columns fold into one line under the name. */}
                <p className="truncate pl-12 text-xs text-dash-muted md:hidden">
                  {[customer.contact_number, customer.city, agentName].filter(Boolean).join(" · ")}
                </p>

                <div className={`${COLS.contact} hidden min-w-0 md:block`}>
                  <p className="truncate text-sm text-dash-ink">{customer.contact_number}</p>
                  <p className="truncate text-[11px] text-dash-muted">{customer.city ?? ""}</p>
                </div>

                <div className={`${COLS.type} hidden md:block`}>
                  {type && (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.45px] ${type.className}`}
                    >
                      {type.label}
                    </span>
                  )}
                </div>

                <p className={`${COLS.since} hidden text-sm text-dash-muted md:block`}>
                  {formatSince(customer.customer_since)}
                </p>

                <p className={`${COLS.agent} hidden truncate text-sm text-dash-muted md:block`}>
                  {agentName}
                </p>
              </Link>
            );
          })}

        <div className="flex flex-col items-center gap-3 border-t border-dash-border bg-dash-bg/50 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
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
