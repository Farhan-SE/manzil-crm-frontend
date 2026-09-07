"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ViewTransition } from "react";
import { FilterIcon, PhoneIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  LeadsFilterPanel,
  type LeadFilters,
} from "@/components/LeadsFilterPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SelectOption } from "@/components/ui/Select";
import {
  getAgents,
  getCategories,
  getInterests,
  getSources,
  getTodayFollowUps,
  isAdmin,
  setFollowUpCompleted,
  type FollowUp,
} from "@/lib/api";

const STAGE_BADGES: Record<string, { label: string; className: string }> = {
  inquiry: { label: "Inquiry", className: "bg-stage-inquiry/10 text-stage-inquiry" },
  contacted: { label: "Contacted", className: "bg-stage-contacted/10 text-stage-contacted" },
  site_visit: { label: "Site Visit", className: "bg-stage-site-visit/10 text-stage-site-visit" },
  negotiation: { label: "Negotiation", className: "bg-stage-negotiation/10 text-stage-negotiation" },
  booked: { label: "Booked", className: "bg-stage-booked/10 text-stage-booked" },
  sold: { label: "Sold", className: "bg-stage-sold/10 text-stage-sold" },
  lost: { label: "Lost", className: "bg-stage-lost/10 text-stage-lost" },
};

function formatTime(due: string) {
  const [hours, minutes] = due.split(":");
  const hour = Number(hours);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, "0")}:${minutes} ${suffix}`;
}

function isUpcoming(followUp: FollowUp) {
  return new Date(`${followUp.due_date}T${followUp.due_time}`) >= new Date();
}

export default function TodayPage() {
  const admin = isAdmin();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
    getTodayFollowUps({
      search: debouncedSearch || undefined,
      stage: filters.stage || undefined,
      temperature: filters.temperature || undefined,
      category_id: filters.category_id || undefined,
      interest_id: filters.interest_id || undefined,
      source_id: filters.source_id || undefined,
      assigned_to_id: filters.assigned_to_id ? Number(filters.assigned_to_id) : undefined,
      budget_min: filters.budget_min ? Number(filters.budget_min) : undefined,
      budget_max: filters.budget_max ? Number(filters.budget_max) : undefined,
    })
      .then(setFollowUps)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [debouncedSearch, filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(followUp: FollowUp) {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === followUp.id ? { ...f, completed: !f.completed } : f)),
    );
    try {
      await setFollowUpCompleted(followUp.id, !followUp.completed);
    } catch {
      setFollowUps((prev) =>
        prev.map((f) => (f.id === followUp.id ? { ...f, completed: followUp.completed } : f)),
      );
    }
  }

  const activeFilterCount = countActiveFilters(filters);
  const doneCount = followUps.filter((f) => f.completed).length;

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-8 py-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1
            className="font-serif text-[34px] font-semibold leading-none text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Today
          </h1>
          {!isLoading && followUps.length > 0 && (
            <p className="text-sm text-dash-muted">
              {doneCount} of {followUps.length} done
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks or clients..."
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-4 text-sm text-dash-ink placeholder:text-dash-muted focus:outline-none"
            />
          </div>
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              aria-expanded={isFilterOpen}
              className="flex items-center gap-2 rounded-lg border border-dash-border px-4 py-2.5 text-sm font-semibold text-dash-ink"
            >
              <FilterIcon className="h-[9px] w-[13.5px]" />
              Filter
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
                  setIsFilterOpen(false);
                }}
                onClear={() => {
                  setFilters(EMPTY_FILTERS);
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
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-dash-border bg-sidebar shadow-sm">
        <div className="flex gap-4 border-b border-dash-border bg-dash-bg px-6 py-4">
          <span className="w-10 shrink-0" />
          <p className="w-[100px] shrink-0 text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">
            Time
          </p>
          <p className="flex-1 text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">Task</p>
          <p className="w-[120px] shrink-0 text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">
            Status
          </p>
          <p className="w-[100px] shrink-0 text-right text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">
            Actions
          </p>
        </div>

        <div className="bg-white">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-6 py-3 ${i > 0 ? "border-t border-dash-border" : ""}`}
              >
                <div className="flex w-10 shrink-0 justify-center">
                  <Skeleton className="size-4" />
                </div>
                <Skeleton className="h-3 w-[70px] shrink-0" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="w-[120px] shrink-0">
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex w-[100px] shrink-0 justify-end">
                  <Skeleton className="size-4" />
                </div>
              </div>
            ))}

          {!isLoading && followUps.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-dash-placeholder">
              {debouncedSearch || activeFilterCount > 0
                ? "No follow-ups match those filters."
                : "Nothing scheduled for today."}
            </p>
          )}

          {followUps.map((followUp, i) => {
            const stage = STAGE_BADGES[followUp.lead.stage];
            const location = [followUp.lead.area, followUp.lead.city].filter(Boolean).join(", ");
            return (
              <div
                key={followUp.id}
                className={`flex items-center gap-4 px-6 py-3 ${i > 0 ? "border-t border-dash-border" : ""} ${
                  followUp.completed ? "opacity-60" : ""
                }`}
              >
                <div className="flex w-10 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={followUp.completed}
                    onChange={() => handleToggle(followUp)}
                    aria-label={`Mark "${followUp.text}" done`}
                    className="size-4 accent-warm"
                  />
                </div>
                <p
                  className={`w-[100px] shrink-0 text-[11.5px] ${
                    !followUp.completed && isUpcoming(followUp)
                      ? "text-status-negotiation"
                      : "text-dash-muted"
                  }`}
                >
                  {formatTime(followUp.due_time)}
                </p>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex items-baseline gap-2">
                    <span
                      className="font-serif text-base font-semibold text-dash-ink"
                      style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
                    >
                      {followUp.lead.client_name}
                    </span>
                    <span
                      className={`text-sm text-dash-muted ${followUp.completed ? "line-through" : ""}`}
                    >
                      — {followUp.text}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 text-[13px] text-dash-muted">
                    <span>{location || followUp.lead.client_number}</span>
                    {admin && (
                      <>
                        <span>·</span>
                        <span className="rounded bg-badge-neutral px-1.5 py-0.5 text-[11px] text-dash-ink">
                          {followUp.lead.assigned_to
                            ? `${followUp.lead.assigned_to.first_name} ${followUp.lead.assigned_to.last_name}`
                            : "Unassigned"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-[120px] shrink-0">
                  <span
                    className={`rounded px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.315px] ${
                      stage?.className ?? "bg-badge-neutral text-dash-muted"
                    }`}
                  >
                    {stage?.label ?? followUp.lead.stage}
                  </span>
                </div>
                <div className="flex w-[100px] shrink-0 items-center justify-end gap-3">
                  <a
                    href={`tel:${followUp.lead.client_number}`}
                    className="text-muted"
                    aria-label={`Call ${followUp.lead.client_name}`}
                  >
                    <PhoneIcon className="size-[15px]" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </ViewTransition>
  );
}
