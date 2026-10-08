"use client";

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
import { RowMenu } from "@/components/list/RowMenu";
import { FavouritesButton, SortButton, StatusTabs } from "@/components/list/StatusTabs";
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
import { getLeads, getSessionUser, setLeadStarred, type Lead, type LeadTab } from "@/lib/api";
import { whatsappUrl } from "@/lib/customers";
import { useIsAdmin } from "@/lib/session";
import { taskLabel } from "@/lib/tasks";
import { formatDay, genderLabel, timeAgo } from "@/lib/time";

const TABS: { id: LeadTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "recommended", label: "Recommended" },
  { id: "watchlist", label: "Watchlist" },
];

const COLUMN_COUNT = 8;

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
  const admin = useIsAdmin();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  // Seeded from ?search= so other screens can land here on a lead.
  const initialSearch = useSearchParams().get("search") ?? "";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<LeadTab, number> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tab, setTab] = useState<LeadTab>("all");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [filters, setFilters] = useState<LeadListFilters>(() => initialLeadListFilters(initialSearch));
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [taskLead, setTaskLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    getLeads({
      page,
      limit: pageSize,
      tab,
      sort,
      starred: favouritesOnly ? "true" : undefined,
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
  }, [page, pageSize, tab, sort, favouritesOnly, filters]);

  useEffect(() => {
    load();
    window.addEventListener("leads:changed", load);
    return () => window.removeEventListener("leads:changed", load);
  }, [load]);

  async function handleStarToggle(lead: Lead) {
    const next = !lead.is_starred;
    const apply = (value: boolean) =>
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, is_starred: value } : l)));
    apply(next);
    try {
      await setLeadStarred(lead.id, next);
      // Refreshes the Watchlist count, and drops the row when unstarring inside that tab.
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
  const isFiltered = hasLeadListFilters(filters) || favouritesOnly || tab !== "all";

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
          {admin && (
            <>
              <button type="button" onClick={() => setIsImportOpen(true)} className={headerActionClass}>
                Import
              </button>
              <button type="button" onClick={() => setIsNewLeadOpen(true)} className={headerActionClass}>
                <PlusIcon className="size-2.5" />
                Add lead
              </button>
            </>
          )}
          <FavouritesButton
            active={favouritesOnly}
            onChange={(next) => {
              setFavouritesOnly(next);
              resetPaging();
            }}
          />
          <SortButton
            sort={sort}
            onChange={(next) => {
              setSort(next);
              setPage(1);
            }}
          />
        </StatusTabs>

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
                <th scope="col" className={`${headCellClass} w-[112px] pl-10 lg:w-[12%]`}>Lead ID</th>
                <th scope="col" className={headCellClass}>Client</th>
                <th scope="col" className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Last task</th>
                <th scope="col" className={`${headCellClass} hidden w-[19%] lg:table-cell`}>Interest</th>
                <th scope="col" className={`${headCellClass} hidden w-[10%] lg:table-cell`}>Source</th>
                <th scope="col" className={`${headCellClass} hidden w-[16%] lg:table-cell`}>Allocated to</th>
                <th scope="col" className={`${headCellClass} w-[44px] lg:w-[14%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && leads.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-placeholder">
                    {isFiltered ? "No leads match those filters." : "No leads yet."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                leads.map((lead) => {
                  const interestLine = [lead.interest?.name, lead.category?.name].filter(Boolean).join(" · ");
                  const location = [lead.area, lead.city].filter(Boolean).join(", ");
                  const agentName = lead.assigned_to
                    ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`
                    : "Unassigned";
                  // Mirrors the server rule: admins for any lead, agents only for their own.
                  const canAddTask = admin || lead.assigned_to?.id === sessionUserId;

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
                            aria-label={lead.is_starred ? "Remove from watchlist" : "Add to watchlist"}
                            aria-pressed={lead.is_starred}
                            className="shrink-0 text-warm-ink"
                          >
                            <StarIcon className="size-4" filled={lead.is_starred} />
                          </button>
                          <div className="min-w-0">
                            <p className="text-primary">{lead.lead_no}</p>
                            <p className={subTextClass}>▣&nbsp; {formatDay(lead.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="pr-3">
                        <p className="truncate">{lead.client_name}</p>
                        <p className={subTextClass}>▣&nbsp; {genderLabel(lead.customer?.gender)}</p>
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
                          {interestLine || location || "—"}
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
                        <div className="flex items-center gap-2 text-primary lg:gap-[19px]">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            aria-label={`Open lead ${lead.lead_no}`}
                            className="hidden lg:block"
                          >
                            <Icon name="link" className="block size-4" />
                          </button>
                          <RowMenu
                            label={`More actions for lead ${lead.lead_no}`}
                            items={[
                              { label: "View lead", onClick: () => setSelectedLead(lead) },
                              ...(canAddTask ? [{ label: "Add task", onClick: () => setTaskLead(lead) }] : []),
                              { label: "WhatsApp client", href: whatsappUrl(lead.client_number), external: true },
                              { label: "Call client", href: `tel:${lead.client_number}`, external: true },
                            ]}
                          />
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
