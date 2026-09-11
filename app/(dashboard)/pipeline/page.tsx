"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ViewTransition } from "react";
import { FilterIcon } from "@/components/icons/DashboardIcons";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  LeadsFilterPanel,
  type LeadFilters,
} from "@/components/LeadsFilterPanel";
import { PipelineBoard } from "@/components/PipelineBoard";
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

const BOARD_LIMIT = 200;

export default function PipelinePage() {
  const admin = isAdmin();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);

  const interestNames = useMemo(
    () => Object.fromEntries(interests.map((i) => [i.id, i.name])),
    [interests],
  );

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
      limit: BOARD_LIMIT,
      stage: filters.stage || undefined,
      temperature: filters.temperature || undefined,
      category_id: filters.category_id || undefined,
      interest_id: filters.interest_id || undefined,
      source_id: filters.source_id || undefined,
      assigned_to_id: filters.assigned_to_id ? Number(filters.assigned_to_id) : undefined,
      budget_min: filters.budget_min ? Number(filters.budget_min) : undefined,
      budget_max: filters.budget_max ? Number(filters.budget_max) : undefined,
    })
      .then((res) => setLeads(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
    window.addEventListener("leads:changed", load);
    return () => window.removeEventListener("leads:changed", load);
  }, [load]);

  const activeFilterCount = countActiveFilters(filters);

  return (
    <ViewTransition>
    {/* Below lg the 3.5rem mobile top bar sits above this, so a full h-dvh would overflow the screen. */}
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-[1280px] flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-8 sm:py-8 lg:h-dvh">
      <div className="flex shrink-0 items-center justify-between">
        <h1
          className="font-serif text-[28px] font-semibold text-dash-ink sm:text-[34px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Pipeline
        </h1>

        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={() => setIsFilterOpen((v) => !v)}
            aria-expanded={isFilterOpen}
            className="flex items-center gap-2 rounded-lg border border-dash-border px-4 py-2.5 text-sm font-bold text-dash-ink"
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

      {error && <p className="shrink-0 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1">
        <PipelineBoard
          leads={leads}
          isLoading={isLoading}
          canDrag
          interestNames={interestNames}
          onOpenLead={setSelectedLead}
          onError={setError}
        />
      </div>
    </div>
    <LeadDetailModal
      key={selectedLead?.id}
      lead={selectedLead}
      onClose={() => setSelectedLead(null)}
      onChanged={load}
    />
    </ViewTransition>
  );
}
