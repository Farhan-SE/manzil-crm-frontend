"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "@/components/icons/DashboardIcons";
import { getCustomers, type Customer } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-border bg-white py-2 pl-10 pr-4 text-sm text-ink placeholder:text-placeholder focus:outline-none";

export function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[] | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (!term) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      // The customers search already matches name, customer ID and phone.
      getCustomers({ search: term, limit: 8 })
        .then((res) => !cancelled && setResults(res.data))
        .catch(() => !cancelled && setResults([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {value.customer_name}
            <span className="ml-2 font-normal text-stage-inquiry">#{value.customer_no}</span>
          </p>
          <p className="truncate text-xs text-muted">
            {[value.contact_number, value.alternate_contact_number, value.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setSearch("");
            setResults(null);
          }}
          className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-ink"
        >
          Change
        </button>
      </div>
    );
  }

  const showResults = search.trim() !== "" && results !== null;

  return (
    <div className="relative">
      <SearchIcon className="absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
      <input
        id="lead-customer"
        type="text"
        autoComplete="off"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by customer ID or name"
        className={inputClass}
      />

      {showResults && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-56 overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          {results.length === 0 && (
            <p className="px-4 py-2 text-sm text-placeholder">
              No customer found.{" "}
              <Link href="/customers/new" className="font-semibold text-ink underline">
                Add a customer
              </Link>{" "}
              first.
            </p>
          )}
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onChange(customer)}
              className="block w-full px-4 py-2 text-left hover:bg-dash-bg"
            >
              <p className="truncate text-sm text-ink">
                <span className="mr-2 font-semibold text-stage-inquiry">#{customer.customer_no}</span>
                {customer.customer_name}
              </p>
              <p className="truncate text-xs text-muted">
                {[customer.contact_number, customer.city].filter(Boolean).join(" · ")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
