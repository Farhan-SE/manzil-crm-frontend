"use client";

import { useEffect, useRef, useState } from "react";
import { getLeads, type Lead } from "@/lib/api";

const RESULT_LIMIT = 20;

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder";

function leadLabel(lead: Lead) {
  return `Lead ${lead.lead_no} — ${lead.client_name}${lead.project ? ` · ${lead.project.name}` : ""}`;
}

/**
 * Finds a lead by searching the server as the user types, so every lead can be reached
 * however many there are. The matches are listed in place, under the field.
 */
export function LeadPicker({
  id,
  value,
  onChange,
  onError,
}: {
  id: string;
  value: string;
  onChange: (leadId: string) => void;
  onError?: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lead[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getLeads({ search: query.trim() || undefined, limit: RESULT_LIMIT })
        .then((res) => {
          if (cancelled) return;
          setResults(res.data);
          setActive(0);
        })
        .catch((err) => {
          if (cancelled) return;
          setResults([]);
          onError?.(err instanceof Error ? err.message : "Failed to load leads.");
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen, onError]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(lead: Lead) {
    onChange(lead.id);
    setQuery(leadLabel(lead));
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${id}-results`}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          // Typing again means the earlier choice no longer stands.
          if (value) onChange("");
        }}
        onKeyDown={(e) => {
          if (!isOpen || !results) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((at) => (at + (e.key === "ArrowDown" ? 1 : -1) + results.length) % Math.max(results.length, 1));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            // Closes the list only, not the dialog the field sits in.
            e.preventDefault();
            setIsOpen(false);
          }
        }}
        placeholder="Search by lead number, client or phone"
        className={inputClass}
      />

      {isOpen && (
        <ul
          id={`${id}-results`}
          role="listbox"
          className="max-h-44 overflow-y-auto rounded-xl border border-border bg-white py-1"
        >
          {results === null && <li className="px-4 py-2 text-sm text-placeholder">Searching…</li>}
          {results?.length === 0 && (
            <li className="px-4 py-2 text-sm text-placeholder">No leads match “{query.trim()}”.</li>
          )}
          {results?.map((lead, index) => (
            <li key={lead.id} role="option" aria-selected={lead.id === value}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => choose(lead)}
                onMouseEnter={() => setActive(index)}
                className={`block w-full truncate px-4 py-2 text-left text-sm text-ink ${
                  index === active ? "bg-dash-bg" : ""
                }`}
              >
                {leadLabel(lead)}
              </button>
            </li>
          ))}
          {results?.length === RESULT_LIMIT && (
            <li className="px-4 py-2 text-xs text-placeholder">Showing the first {RESULT_LIMIT}. Type to narrow.</li>
          )}
        </ul>
      )}
    </div>
  );
}
