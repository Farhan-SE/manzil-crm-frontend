"use client";

import { useEffect, useRef, useState } from "react";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  LeadsFilterPanel,
  type LeadFilters,
} from "@/components/LeadsFilterPanel";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
import { Icon } from "@/components/ui/Icon";
import type { SelectOption } from "@/components/ui/Select";
import {
  getAgents,
  getCategories,
  getInterests,
  getProjectOptions,
  getSources,
  type DueWindow,
  type LeadsQuery,
} from "@/lib/api";
import { useIsAdmin } from "@/lib/session";
import { NEXT_TASKS, TASK_TYPES } from "@/lib/tasks";

export type LeadListFilters = LeadFilters & {
  search: string;
  search_by: NonNullable<LeadsQuery["search_by"]>;
  task_due: DueWindow | "";
  last_task: string;
  project_id: string;
};

export const EMPTY_LEAD_LIST_FILTERS: LeadListFilters = {
  ...EMPTY_FILTERS,
  search: "",
  search_by: "lead_id",
  task_due: "",
  last_task: "",
  project_id: "",
};

/** A search carried in from another screen is a client name, not the default lead ID. */
export function initialLeadListFilters(search: string): LeadListFilters {
  return { ...EMPTY_LEAD_LIST_FILTERS, search, search_by: search ? "name" : "lead_id" };
}

export function hasLeadListFilters(filters: LeadListFilters) {
  return Object.values({ ...filters, search_by: "" }).some(Boolean);
}

const SEARCH_FIELDS: { id: LeadListFilters["search_by"]; name: string }[] = [
  { id: "lead_id", name: "Lead Id" },
  { id: "name", name: "Client Name" },
  { id: "number", name: "Cell No" },
  { id: "city", name: "City" },
];

const DUE_OPTIONS: { id: DueWindow; name: string }[] = [
  { id: "overdue", name: "Overdue" },
  { id: "today", name: "Due Today" },
  { id: "tomorrow", name: "Due Tomorrow" },
  { id: "week", name: "Due This Week" },
];

// Next tasks reuse some task-type ids; keep the first label for each.
const LAST_TASK_OPTIONS = [...TASK_TYPES, ...NEXT_TASKS].filter(
  (option, i, all) => option.id !== "do_nothing" && all.findIndex((other) => other.id === option.id) === i,
);

/** The Leads list filters. Nothing is applied until Search or the panel's Apply. */
export function LeadFiltersBar({
  initialSearch = "",
  onApply,
}: {
  initialSearch?: string;
  onApply: (filters: LeadListFilters) => void;
}) {
  const admin = useIsAdmin();
  const [draft, setDraft] = useState<LeadListFilters>(() => initialLeadListFilters(initialSearch));
  const [applied, setApplied] = useState<LeadListFilters>(() => initialLeadListFilters(initialSearch));
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [interests, setInterests] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<SelectOption[]>([]);
  const [projects, setProjects] = useState<SelectOption[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false);
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
    getProjectOptions()
      .then((list) => setProjects(list.map((project) => ({ id: project.id, name: project.project_name }))))
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

  function apply(next: LeadListFilters) {
    const trimmed = { ...next, search: next.search.trim() };
    setApplied(trimmed);
    setDraft(trimmed);
    setIsPanelOpen(false);
    onApply(trimmed);
  }

  // The panel and the bar both edit the assignee; the rest of the panel's fields are its own.
  const panelCount = countActiveFilters({
    ...EMPTY_FILTERS,
    stage: applied.stage,
    temperature: applied.temperature,
    category_id: applied.category_id,
    interest_id: applied.interest_id,
    source_id: applied.source_id,
    budget_min: applied.budget_min,
    budget_max: applied.budget_max,
  });

  return (
    <FilterBar onSearch={() => apply(draft)}>
      <FilterField label="Search by">
        <FilterInput
          value={draft.search}
          onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          placeholder="Search"
          aria-label="Search leads"
        />
        <FilterSelect
          value={draft.search_by}
          onChange={(e) => setDraft({ ...draft, search_by: e.target.value as LeadListFilters["search_by"] })}
          aria-label="Search field"
          className="w-[88px] shrink-0"
        >
          {SEARCH_FIELDS.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </FilterSelect>
      </FilterField>
      {admin && (
        <FilterField label="Allocated To">
          <FilterSelect
            value={draft.assigned_to_id}
            onChange={(e) => setDraft({ ...draft, assigned_to_id: e.target.value })}
            placeholder="Search by Allocation"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </FilterSelect>
        </FilterField>
      )}
      <FilterField label="Due Date">
        <FilterSelect
          value={draft.task_due}
          onChange={(e) => setDraft({ ...draft, task_due: e.target.value as DueWindow | "" })}
          placeholder="Task Completion"
        >
          {DUE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </FilterSelect>
      </FilterField>
      <FilterField label="Last Task">
        <FilterSelect
          value={draft.last_task}
          onChange={(e) => setDraft({ ...draft, last_task: e.target.value })}
          placeholder="Search by Task"
        >
          {LAST_TASK_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </FilterSelect>
      </FilterField>
      <FilterField label="Interest">
        <FilterSelect
          value={draft.project_id}
          onChange={(e) => setDraft({ ...draft, project_id: e.target.value })}
          placeholder="Search by Project"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </FilterSelect>
      </FilterField>

      <div ref={panelRef} className="relative flex h-9 shrink-0 items-center">
        <button
          type="button"
          onClick={() => setIsPanelOpen((v) => !v)}
          aria-expanded={isPanelOpen}
          className="flex items-center gap-1 text-xs leading-[1.4] text-primary"
        >
          More Filters
          {panelCount > 0 && ` (${panelCount})`}
          <Icon name="chevron-down" className="size-3.5" />
        </button>

        {isPanelOpen && (
          <LeadsFilterPanel
            value={applied}
            onApply={(panel) => apply({ ...draft, ...panel })}
            onClear={() => apply({ ...draft, ...EMPTY_FILTERS })}
            interests={interests}
            categories={categories}
            sources={sources}
            agents={agents}
            showAssignee={admin}
          />
        )}
      </div>
    </FilterBar>
  );
}
