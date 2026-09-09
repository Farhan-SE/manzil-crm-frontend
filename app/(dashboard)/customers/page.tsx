"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ViewTransition } from "react";
import { PlusIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import { ImportCustomersModal } from "@/components/customers/ImportCustomersModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCustomers, type Customer } from "@/lib/api";
import { useIsAdmin } from "@/lib/session";

const CUSTOMER_TYPES = [
  { id: "buyer", label: "Buyer", className: "bg-cold/15 text-cold" },
  { id: "seller", label: "Seller", className: "bg-stage-site-visit/10 text-stage-site-visit" },
  { id: "investor", label: "Investor", className: "bg-warm/20 text-warm" },
];

const COLS = {
  customer: "col-span-3",
  contact: "col-span-3",
  type: "col-span-2",
  since: "col-span-2",
  agent: "col-span-2",
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

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-8 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1
          className="font-serif text-[34px] font-semibold text-dash-ink"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Customers
        </h1>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
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
                className="rounded-lg border border-dash-border px-4 py-2.5 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
              >
                Import
              </button>
              <Link
                href="/customers/new"
                className="flex items-center gap-2 rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
              >
                <PlusIcon className="size-3" />
                Add customer
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
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
        <div className="grid grid-cols-12 gap-4 border-b border-dash-border bg-dash-bg/50 px-6 py-4">
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
              className={`grid grid-cols-12 items-center gap-4 bg-white px-6 py-4 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <div className={`${COLS.customer} flex items-center gap-3`}>
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className={`${COLS.contact} h-4 w-28`} />
              <Skeleton className={`${COLS.type} h-4 w-16`} />
              <Skeleton className={`${COLS.since} h-4 w-20`} />
              <Skeleton className={`${COLS.agent} h-4 w-24`} />
            </div>
          ))}

        {!isLoading && customers.length === 0 && (
          <p className="bg-white px-6 py-10 text-center text-sm text-dash-placeholder">
            {debouncedSearch || typeFilter !== "all"
              ? "No customers match those filters."
              : "No customers yet."}
          </p>
        )}

        {!isLoading &&
          customers.map((customer, i) => {
            const type = CUSTOMER_TYPES.find((t) => t.id === customer.relation_type);
            return (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className={`grid grid-cols-12 items-center gap-4 bg-white px-6 py-4 transition-colors hover:bg-dash-bg/40 ${
                  i > 0 ? "border-t border-dash-border" : ""
                }`}
              >
                <div className={`${COLS.customer} flex min-w-0 items-center gap-3`}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-avatar/30 text-xs font-bold text-dash-ink">
                    {initials(customer.customer_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-dash-ink">
                      {customer.customer_name}
                    </p>
                    <p className="truncate text-[11px] text-dash-muted">{customer.cnic_number}</p>
                  </div>
                </div>

                <div className={`${COLS.contact} min-w-0`}>
                  <p className="truncate text-sm text-dash-ink">{customer.contact_number}</p>
                  <p className="truncate text-[11px] text-dash-muted">{customer.city ?? ""}</p>
                </div>

                <div className={COLS.type}>
                  {type && (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.45px] ${type.className}`}
                    >
                      {type.label}
                    </span>
                  )}
                </div>

                <p className={`${COLS.since} text-sm text-dash-muted`}>
                  {formatSince(customer.customer_since)}
                </p>

                <p className={`${COLS.agent} truncate text-sm text-dash-muted`}>
                  {customer.assigned_to
                    ? `${customer.assigned_to.first_name} ${customer.assigned_to.last_name}`
                    : "Unassigned"}
                </p>
              </Link>
            );
          })}
      </div>

      {!isLoading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-dash-muted">
            Page {page} of {lastPage} · {total} customer{total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-dash-border px-4 py-2 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-dash-border px-4 py-2 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>

    {isImportOpen && (
      <ImportCustomersModal
        onClose={() => setIsImportOpen(false)}
        // Parses and previews only — there's no bulk-import endpoint to POST to yet.
        onImport={() => 0}
      />
    )}
    </ViewTransition>
  );
}
