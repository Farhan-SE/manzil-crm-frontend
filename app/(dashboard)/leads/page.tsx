"use client";

import { useNavigationScroll, useNavigationState } from "@/lib/use-navigation-state";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ViewTransition } from "react";
import { PlusIcon, StarIcon } from "@/components/icons/DashboardIcons";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { LogTaskModal } from "@/components/LogTaskModal";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import {
  hasLeadListFilters,
  initialLeadListFilters,
  LeadFiltersBar,
  type LeadListFilters,
} from "@/components/list/LeadFiltersBar";
import { SortButton, StatusTabs } from "@/components/list/StatusTabs";
import { BulkBar } from "@/components/list/BulkBar";
import { TablePagination } from "@/components/list/TablePagination";
import {
  checkboxClass,
  headCellClass,
  headRowClass,
  rowClass,
  subTextClass,
  tableClass,
} from "@/components/list/tableStyles";
import { NewLeadModal } from "@/components/NewLeadModal";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { SpanCell } from "@/components/list/SpanCell";
import { bulkAssignLeads, getLeads, getSessionUser, setLeadStarred, type Lead, type LeadTab } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { leadStageLabel } from "@/lib/leads";
import { whatsappUrl } from "@/lib/customers";
import { reaches, useCan, useScope } from "@/lib/session";
import { taskLabel } from "@/lib/tasks";
import { formatDay, timeAgo } from "@/lib/time";

const TABS: { id: LeadTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "favourites", label: "Favourites" },
];

const COLUMN_COUNT = 9;

const actionClass = "size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-badge-neutral hover:text-ink";

const headerActionClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar";

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsDirectory />
    </Suspense>
  );
}

function LeadsDirectory() {
  const canCreate = useCan("leads.create");
  const canImport = useCan("leads.import");
  const canAssign = useCan("leads.assign");
  const editScope = useScope("leads.edit");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  // Seeded from ?search= so other screens can land here on a lead.
  const initialSearch = useSearchParams().get("search") ?? "";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<LeadTab, number> | null>(null);
  const [page, setPage] = useNavigationState("page", 1, initialSearch);
  const [pageSize, setPageSize] = useNavigationState("pageSize", 10, initialSearch);
  const [tab, setTab] = useNavigationState<LeadTab>("tab", "all", initialSearch);
  const [sort, setSort] = useNavigationState<"asc" | "desc">("sort", "desc", initialSearch);
  const [filters, setFilters] = useNavigationState<LeadListFilters>("filters", () => initialLeadListFilters(initialSearch), initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  useNavigationScroll(!isLoading, initialSearch);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [taskLead, setTaskLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    getLeads({
      page,
      limit: pageSize,
      tab,
      sort,
      search: filters.search || undefined,
      search_by: filters.search ? filters.search_by : undefined,
      project_id: filters.project_id || undefined,
      task_due: filters.task_due || undefined,
      last_task: filters.last_task || undefined,
      stage: filters.stage || undefined,
      temperature: filters.temperature || undefined,
      category_id: filters.category_id || undefined,
      interest_id: filters.interest_id || undefined,
      source_id: filters.source_id || undefined,
      assigned_to_id: filters.assigned_to_id ? Number(filters.assigned_to_id) : undefined,
      budget_min: filters.budget_min ? Number(filters.budget_min) : undefined,
      budget_max: filters.budget_max ? Number(filters.budget_max) : undefined,
    })
      .then((res) => {
        // Deleting the last row on a page would otherwise strand you on an empty one.
        if (res.data.length === 0 && page > 1) setPage((p) => p - 1);
        setLeads(res.data);
        setTotal(res.total);
        setTabCounts(res.tab_counts);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [page, pageSize, tab, sort, filters, setPage]);

  useEffect(() => {
    load();
    window.addEventListener("leads:changed", load);
    return () => window.removeEventListener("leads:changed", load);
  }, [load]);

  function exportSelected(rows: Lead[]) {
    downloadCsv(`leads-${new Date().toLocaleDateString("en-CA")}.csv`, [
      ["Lead ID", "Client", "Phone", "City", "Area", "Project", "Interest", "Stage", "Temperature", "Source", "Allocated to", "Created"],
      ...rows.map((lead) => [
        String(lead.lead_no),
        lead.client_name,
        lead.client_number,
        lead.city ?? "",
        lead.area ?? "",
        lead.project?.name ?? "",
        lead.interest?.name ?? "",
        leadStageLabel(lead.stage),
        lead.temperature,
        lead.source?.name ?? "",
        lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : "",
        lead.created_at.slice(0, 10),
      ]),
    ]);
  }

  async function handleStarToggle(lead: Lead) {
    const next = !lead.is_starred;
    const apply = (value: boolean) =>
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, is_starred: value } : l)));
    apply(next);
    try {
      await setLeadStarred(lead.id, next);
      // Refreshes the Favourites count, and drops the row when unstarring inside that tab.
      load();
    } catch {
      apply(!next);
    }
  }

  function resetPaging() {
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const sessionUserId = getSessionUser()?.id;
  const allSelected = leads.length > 0 && leads.every((lead) => selected.has(lead.id));
  const isFiltered = hasLeadListFilters(filters) || tab !== "all";

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <h1 className="sr-only">Leads</h1>
        <LeadFiltersBar
          initialSearch={initialSearch}
          onApply={(next) => {
            setFilters(next);
            resetPaging();
          }}
        />

        <StatusTabs
          tabs={TABS.map((entry) => ({ ...entry, count: tabCounts?.[entry.id] ?? null }))}
          active={tab}
          onChange={(next) => {
            setTab(next);
            resetPaging();
          }}
        >
          {canImport && (
            <button type="button" onClick={() => setIsImportOpen(true)} className={headerActionClass}>
              Import
            </button>
          )}
          {canCreate && (
            <button type="button" onClick={() => setIsNewLeadOpen(true)} className={headerActionClass}>
              <PlusIcon className="size-2.5" />
              Add lead
            </button>
          )}
          <SortButton
            sort={sort}
            onChange={(next) => {
              setSort(next);
              setPage(1);
            }}
          />
        </StatusTabs>

        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            noun="lead"
            canAssign={canAssign}
            onAssign={async (userId) => {
              await bulkAssignLeads([...selected], userId);
              setSelected(new Set());
              load();
            }}
            onFavourite={async () => {
              await Promise.all(leads.filter((lead) => selected.has(lead.id) && !lead.is_starred).map((lead) => setLeadStarred(lead.id, true)));
              setSelected(new Set());
              load();
            }}
            onExport={() => exportSelected(leads.filter((lead) => selected.has(lead.id)))}
            onClear={() => setSelected(new Set())}
          />
        )}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className="hidden w-8 lg:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all leads"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(leads.map((lead) => lead.id)))}
                    className={checkboxClass}
                  />
                </th>
                <th scope="col" className={`${headCellClass} w-[124px] pl-10 lg:w-[11%]`}>Lead ID</th>
                <th scope="col" className={`${headCellClass} lg:w-[13%]`}>Client</th>
                <th scope="col" className={`${headCellClass} hidden w-[9%] lg:table-cell`}>City</th>
                <th scope="col" className={`${headCellClass} hidden w-[11%] lg:table-cell`}>Last task</th>
                <th scope="col" className={`${headCellClass} hidden w-[14%] lg:table-cell`}>Interest</th>
                <th scope="col" className={`${headCellClass} hidden w-[9%] lg:table-cell`}>Source</th>
                <th scope="col" className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Allocated to</th>
                <th scope="col" className={`${headCellClass} w-[84px] sm:w-[124px] lg:w-[160px]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <SpanCell colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </SpanCell>
                  </tr>
                ))}

              {!isLoading && leads.length === 0 && (
                <tr>
                  <SpanCell colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-placeholder">
                    {isFiltered ? "No leads match those filters." : "No leads yet."}
                  </SpanCell>
                </tr>
              )}

              {!isLoading &&
                leads.map((lead) => {
                  const interestLine = [lead.interest?.name, lead.category?.name].filter(Boolean).join(" · ");
                  const agentName = lead.assigned_to
                    ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`
                    : "Unassigned";
                  const canAddTask = reaches(editScope, lead.assigned_to?.id, sessionUserId);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`${rowClass} cursor-pointer hover:bg-white/60`}
                    >
                      <td className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select lead ${lead.lead_no}`}
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelected(lead.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pr-3">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleStarToggle(lead);
                            }}
                            aria-label={lead.is_starred ? "Remove from favourites" : "Add to favourites"}
                            aria-pressed={lead.is_starred}
                            className="shrink-0 text-warm-ink"
                          >
                            <StarIcon className="size-4" filled={lead.is_starred} />
                          </button>
                          <div className="min-w-0">
                            <p className="text-primary">{lead.lead_no}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted">▣&nbsp; {formatDay(lead.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="pr-3">
                        <p className="truncate">{lead.client_name}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{lead.city || "—"}</p>
                        {lead.area && <p className={subTextClass}>{lead.area}</p>}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        {lead.last_task ? (
                          <>
                            <p className="line-clamp-2" title={taskLabel(lead.last_task)}>
                              {taskLabel(lead.last_task)}
                            </p>
                            <p className={subTextClass}>{timeAgo(lead.last_task.at)}</p>
                          </>
                        ) : (
                          <p className="text-muted">—</p>
                        )}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{lead.project?.name ?? "—"}</p>
                        <p className={`${subTextClass} line-clamp-2 whitespace-normal`}>
                          {interestLine || "—"}
                        </p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{lead.source?.name ?? "—"}</p>
                        {lead.sub_source && <p className={subTextClass}>{lead.sub_source}</p>}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{agentName}</p>
                        {lead.assigned_to?.team && <p className={subTextClass}>{lead.assigned_to.team}</p>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            aria-label={`Open lead ${lead.lead_no}`}
                            title="Open lead"
                            className={`${actionClass} hidden lg:flex`}
                          >
                            <Icon name="link" className="size-3.5" />
                          </button>
                          {canAddTask && (
                            <button
                              type="button"
                              onClick={() => setTaskLead(lead)}
                              aria-label={`Add task to lead ${lead.lead_no}`}
                              title="Add task"
                              className={`${actionClass} hidden sm:flex`}
                            >
                              <Icon name="tasks" className="size-3.5" />
                            </button>
                          )}
                          <a
                            href={whatsappUrl(lead.client_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp ${lead.client_name}`}
                            title="WhatsApp"
                            className={`${actionClass} flex hover:!text-success`}
                          >
                            <Icon name="whatsapp" className="size-3.5" />
                          </a>
                          <a
                            href={`tel:${lead.client_number}`}
                            aria-label={`Call ${lead.client_name}`}
                            title={`Call ${lead.client_number}`}
                            className={`${actionClass} flex`}
                          >
                            <Icon name="phone" className="size-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          noun="leads"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
      <LeadDetailModal
        key={selectedLead?.id}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onChanged={load}
      />
      {isImportOpen && <ImportCsvModal kind="leads" onClose={() => setIsImportOpen(false)} onImported={load} />}
      <NewLeadModal isOpen={isNewLeadOpen} onClose={() => setIsNewLeadOpen(false)} />
      {taskLead && (
        <LogTaskModal key={taskLead.id} lead={taskLead} onClose={() => setTaskLead(null)} onSaved={load} />
      )}
    </ViewTransition>
  );
}
