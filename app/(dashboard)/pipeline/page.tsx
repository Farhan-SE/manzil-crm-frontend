"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { FilterBar, FilterField, FilterSelect } from "@/components/list/FilterBar";
import { FavouritesButton, StatusTabs } from "@/components/list/StatusTabs";
import { headCellClass, headRowClass, rowClass, tableClass } from "@/components/list/tableStyles";
import { PipelineBoard } from "@/components/PipelineBoard";
import { Icon } from "@/components/ui/Icon";
import {
  getAgents,
  getPartnerProjects,
  getPipeline,
  type Agent,
  type Lead,
  type PartnerProject,
  type PipelineQuery,
  type PipelineResponse,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { PIPELINE_STAGES } from "@/lib/leads";
import { formatMoney } from "@/lib/money";
import { useIsAdmin } from "@/lib/session";
import { formatClock } from "@/lib/time";

type View = "board" | "summary" | "mine";
type Filters = { projectId: string; assignedToId: string; period: string; region: string };

const EMPTY_FILTERS: Filters = { projectId: "", assignedToId: "", period: "", region: "" };

const TABS: { id: View; label: string }[] = [
  { id: "board", label: "Board view" },
  { id: "summary", label: "Stage summary" },
  { id: "mine", label: "My opportunities" },
];

const PREVIEW_PER_STAGE = 3;
const ALL_PER_STAGE = 500;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

/** The last twelve months, newest first, as { id: "2026-10", name: "October 2026" }. */
function recentMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      id: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      name: month.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  });
}

export default function PipelinePage() {
  const admin = useIsAdmin();
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<View>("board");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"recent" | "value">("recent");
  const [showAll, setShowAll] = useState(false);

  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [months] = useState(recentMonths);

  useEffect(() => {
    getPartnerProjects({ limit: 500 }).then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!admin) return;
    getAgents().then(setAgents).catch(() => {});
  }, [admin]);

  const buildQuery = useCallback(
    (): PipelineQuery => ({
      project_id: filters.projectId || undefined,
      assigned_to_id: filters.assignedToId ? Number(filters.assignedToId) : undefined,
      period: filters.period || undefined,
      region: filters.region || undefined,
      mine: view === "mine" ? "true" : undefined,
      starred: favouritesOnly ? "true" : undefined,
      sort,
    }),
    [filters, view, favouritesOnly, sort],
  );

  const load = useCallback(() => {
    getPipeline({ ...buildQuery(), per_stage: showAll ? ALL_PER_STAGE : PREVIEW_PER_STAGE })
      .then((res) => {
        setPipeline(res);
        setUpdatedAt(new Date());
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load the pipeline."));
  }, [buildQuery, showAll]);

  useEffect(() => {
    load();
    window.addEventListener("leads:changed", load);
    return () => window.removeEventListener("leads:changed", load);
  }, [load]);

  async function exportPipeline() {
    try {
      const res = await getPipeline({ ...buildQuery(), per_stage: ALL_PER_STAGE });
      downloadCsv(`sales-pipeline-${new Date().toLocaleDateString("en-CA")}.csv`, [
        ["Stage", "Lead", "Client", "Project", "Value (PKR)", "Allocated to"],
        ...res.stages.flatMap((stage) =>
          stage.leads.map((lead) => [
            PIPELINE_STAGES.find((meta) => meta.id === stage.id)?.label ?? stage.id,
            String(lead.lead_no),
            lead.client_name,
            lead.project?.name ?? "",
            lead.budget != null ? String(lead.budget) : "",
            lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : "",
          ]),
        ),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export the pipeline.");
    }
  }

  const totalValue = pipeline?.stages.reduce((sum, stage) => sum + stage.total, 0) ?? 0;

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-ink" style={headingStyle}>
              Sales pipeline
            </h1>
            <p className="text-[10px] text-muted">
              {pipeline
                ? `${pipeline.active_count} active opportunities · ${formatMoney(pipeline.active_value)}`
                : " "}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void exportPipeline()}
            disabled={!pipeline}
            className="flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60"
          >
            <Icon name="download" className="size-4" />
            Export
          </button>
        </div>

        <FilterBar onSearch={() => setFilters(draft)}>
          <FilterField label="Project">
            <FilterSelect
              value={draft.projectId}
              onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
              placeholder="All Projects"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          {admin && (
            <FilterField label="Allocated To">
              <FilterSelect
                value={draft.assignedToId}
                onChange={(e) => setDraft({ ...draft, assignedToId: e.target.value })}
                placeholder="All Staff"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.first_name} {agent.last_name}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>
          )}
          <FilterField label="Period">
            <FilterSelect
              value={draft.period}
              onChange={(e) => setDraft({ ...draft, period: e.target.value })}
              placeholder="All Periods"
            >
              {months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Region">
            <FilterSelect
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              placeholder="All Regions"
            >
              {(pipeline?.regions ?? []).map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
        </FilterBar>

        <StatusTabs tabs={TABS} active={view} onChange={setView}>
          <FavouritesButton active={favouritesOnly} onChange={setFavouritesOnly} />
          {updatedAt && (
            <p className="shrink-0 text-xs leading-[1.4] text-nav-idle">Last updated: {formatClock(updatedAt)}</p>
          )}
          <button
            type="button"
            onClick={() => setSort(sort === "recent" ? "value" : "recent")}
            aria-label={`Sorted by ${sort === "recent" ? "newest lead" : "highest value"}. Switch.`}
            title={sort === "recent" ? "Newest first" : "Highest value first"}
            className="shrink-0 text-ink"
          >
            <Icon name="sort" className="block size-4" />
          </button>
        </StatusTabs>

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        {view === "summary" ? (
          <div className="px-4 pb-8 sm:px-8">
            <table className={tableClass}>
              <thead>
                <tr className={headRowClass}>
                  <th className={headCellClass}>Stage</th>
                  <th className={`${headCellClass} w-[20%]`}>Deals</th>
                  <th className={`${headCellClass} w-[25%]`}>Value</th>
                  <th className={`${headCellClass} w-[20%]`}>Share of value</th>
                </tr>
              </thead>
              <tbody>
                {PIPELINE_STAGES.map((meta) => {
                  const stage = pipeline?.stages.find((entry) => entry.id === meta.id);
                  return (
                    <tr key={meta.id} className={`${rowClass} !h-[62px]`}>
                      <td className="pr-3 font-bold">{meta.label}</td>
                      <td className="pr-3">{stage?.count ?? "—"}</td>
                      <td className="pr-3">{stage ? formatMoney(stage.total) : "—"}</td>
                      <td className="pr-3">
                        {stage && totalValue > 0 ? `${((stage.total / totalValue) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <PipelineBoard
            stages={pipeline?.stages ?? []}
            isLoading={!pipeline}
            canDrag
            onOpenLead={setSelectedLead}
            onMoved={load}
            onViewAll={() => setShowAll(true)}
            onError={setError}
          />
        )}
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
