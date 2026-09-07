"use client";

import { useState } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";

export type LeadFilters = {
  stage: string;
  temperature: string;
  category_id: string;
  interest_id: string;
  source_id: string;
  assigned_to_id: string;
  budget_min: string;
  budget_max: string;
};

export const EMPTY_FILTERS: LeadFilters = {
  stage: "",
  temperature: "",
  category_id: "",
  interest_id: "",
  source_id: "",
  assigned_to_id: "",
  budget_min: "",
  budget_max: "",
};

export function countActiveFilters(filters: LeadFilters) {
  return Object.values(filters).filter(Boolean).length;
}

const STAGE_OPTIONS: SelectOption[] = [
  { id: "", name: "All stages" },
  { id: "inquiry", name: "Inquiry" },
  { id: "contacted", name: "Contacted" },
  { id: "site_visit", name: "Site Visit" },
  { id: "negotiation", name: "Negotiation" },
  { id: "booked", name: "Booked" },
  { id: "sold", name: "Sold" },
  { id: "lost", name: "Lost" },
];

const TEMPERATURE_OPTIONS: SelectOption[] = [
  { id: "", name: "All" },
  { id: "HOT", name: "Hot" },
  { id: "WARM", name: "Warm" },
  { id: "COLD", name: "Cold" },
];

const numberInputClass =
  "w-full min-w-0 rounded-xl border border-dash-border bg-white px-3 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

function withAllOption(options: SelectOption[], label: string): SelectOption[] {
  return [{ id: "", name: label }, ...options];
}

type LeadsFilterPanelProps = {
  value: LeadFilters;
  onApply: (filters: LeadFilters) => void;
  onClear: () => void;
  interests: SelectOption[];
  categories: SelectOption[];
  sources: SelectOption[];
  agents: SelectOption[];
  showAssignee: boolean;
};

export function LeadsFilterPanel({
  value,
  onApply,
  onClear,
  interests,
  categories,
  sources,
  agents,
  showAssignee,
}: LeadsFilterPanelProps) {
  const [draft, setDraft] = useState(value);

  function set(key: keyof LeadFilters, next: string) {
    setDraft((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[420px] rounded-xl border border-dash-border bg-sidebar p-4 shadow-lg">
      <div className="flex items-center justify-between pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">Filters</p>
        <button type="button" onClick={onClear} className="text-xs font-medium text-dash-muted underline">
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-stage" className="text-xs text-dash-muted">
            Stage
          </label>
          <Select
            id="filter-stage"
            value={draft.stage}
            onChange={(v) => set("stage", v)}
            options={STAGE_OPTIONS}
            placeholder="All stages"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-temperature" className="text-xs text-dash-muted">
            Temperature
          </label>
          <Select
            id="filter-temperature"
            value={draft.temperature}
            onChange={(v) => set("temperature", v)}
            options={TEMPERATURE_OPTIONS}
            placeholder="All"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-category" className="text-xs text-dash-muted">
            Category
          </label>
          <Select
            id="filter-category"
            value={draft.category_id}
            onChange={(v) => set("category_id", v)}
            options={withAllOption(categories, "All categories")}
            placeholder="All categories"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-interest" className="text-xs text-dash-muted">
            Interest
          </label>
          <Select
            id="filter-interest"
            value={draft.interest_id}
            onChange={(v) => set("interest_id", v)}
            options={withAllOption(interests, "All interests")}
            placeholder="All interests"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-source" className="text-xs text-dash-muted">
            Source
          </label>
          <Select
            id="filter-source"
            value={draft.source_id}
            onChange={(v) => set("source_id", v)}
            options={withAllOption(sources, "All sources")}
            placeholder="All sources"
          />
        </div>
        {showAssignee && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-assignee" className="text-xs text-dash-muted">
              Assigned to
            </label>
            <Select
              id="filter-assignee"
              value={draft.assigned_to_id}
              onChange={(v) => set("assigned_to_id", v)}
              options={withAllOption(agents, "All agents")}
              placeholder="All agents"
            />
          </div>
        )}

        <div className="col-span-2 flex flex-col gap-1.5">
          <p className="text-xs text-dash-muted">Budget (PKR)</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              value={draft.budget_min}
              onChange={(e) => set("budget_min", e.target.value)}
              placeholder="Min"
              className={numberInputClass}
            />
            <input
              type="number"
              min="0"
              value={draft.budget_max}
              onChange={(e) => set("budget_max", e.target.value)}
              placeholder="Max"
              className={numberInputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={() => onApply(draft)}
          className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}
