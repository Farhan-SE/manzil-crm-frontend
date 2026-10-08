"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { NewDisputeModal } from "@/components/disputes/NewDisputeModal";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { FilterBar, FilterDate, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { StatusBadge } from "@/components/list/StatusBadge";
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
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getSalesDisputes,
  getSessionUser,
  getUsers,
  setDisputeStarred,
  setDisputeStatus,
  type DisputeStatus,
  type DisputeTab,
  type SalesDispute,
  type SalesDisputesQuery,
  type TeamMember,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { DISPUTE_STATUSES, disputeCode, resolutionNote } from "@/lib/disputes";
import { useIsAdmin } from "@/lib/session";
import { formatDay } from "@/lib/time";

type Filters = { search: string; ownerId: string; status: string; createdFrom: string; createdTo: string };

const EMPTY_FILTERS: Filters = { search: "", ownerId: "", status: "", createdFrom: "", createdTo: "" };

const TABS: { id: DisputeTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "under_review", label: "Under review" },
  { id: "escalated", label: "Escalated" },
  { id: "resolved", label: "Resolved" },
];

const EXPORT_LIMIT = 1000;

const COLUMN_COUNT = 9;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const headerActionClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60";

function personName(person: SalesDispute["raised_by"]) {
  return person ? `${person.first_name} ${person.last_name}` : "—";
}

export default function SalesDisputesPage() {
  const admin = useIsAdmin();

  const [disputes, setDisputes] = useState<SalesDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<DisputeTab, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<DisputeTab>("all");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [owners, setOwners] = useState<TeamMember[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);

  const sessionUserId = getSessionUser()?.id;

  useEffect(() => {
    getUsers().then(setOwners).catch(() => {});
  }, []);

  const buildQuery = useCallback(
    (): SalesDisputesQuery => ({
      tab,
      search: filters.search.trim() || undefined,
      review_owner_id: filters.ownerId ? Number(filters.ownerId) : undefined,
      status: (filters.status || undefined) as DisputeStatus | undefined,
      created_from: filters.createdFrom || undefined,
      created_to: filters.createdTo || undefined,
      starred: favouritesOnly ? "true" : undefined,
      sort,
    }),
    [tab, filters, favouritesOnly, sort],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getSalesDisputes({ ...buildQuery(), page, limit: pageSize });
      setDisputes(res.data);
      setTotal(res.total);
      setTabCounts(res.tab_counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cases.");
      setDisputes([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: Promise<unknown>) {
    try {
      await action;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that case.");
    }
    void load();
  }

  async function exportCases() {
    try {
      const res = await getSalesDisputes({ ...buildQuery(), page: 1, limit: EXPORT_LIMIT });
      downloadCsv(`sales-disputes-${new Date().toLocaleDateString("en-CA")}.csv`, [
        ["Case ID", "Created", "Dispute", "Lead", "Client", "Project", "Raised by", "Review owner", "Status", "Resolution due"],
        ...res.data.map((dispute) => [
          disputeCode(dispute),
          dispute.created_at.slice(0, 10),
          dispute.subject,
          String(dispute.lead.lead_no),
          dispute.lead.client_name,
          dispute.lead.project?.name ?? "",
          dispute.raised_by ? personName(dispute.raised_by) : "",
          dispute.review_owner ? personName(dispute.review_owner) : "",
          DISPUTE_STATUSES.find((status) => status.id === dispute.status)?.label ?? dispute.status,
          dispute.resolution_due ?? "",
        ]),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export cases.");
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

  const isFiltered = Object.values(filters).some(Boolean) || favouritesOnly || tab !== "all";
  const allSelected = disputes.length > 0 && disputes.every((dispute) => selected.has(dispute.id));

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-ink" style={headingStyle}>
              Sales Dispute
            </h1>
            <p className="text-[11px] text-muted">Ownership, allocation and commission reviews</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsNewOpen(true)} className={headerActionClass}>
              <PlusIcon className="size-2.5" />
              New case
            </button>
            <button
              type="button"
              onClick={() => void exportCases()}
              disabled={total === 0}
              className={headerActionClass}
            >
              <Icon name="download" className="size-4" />
              Export
            </button>
          </div>
        </div>

        <FilterBar
          onSearch={() => {
            setFilters(draft);
            resetPaging();
          }}
        >
          <FilterField label="Search by">
            <FilterInput
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              placeholder="Case ID or Client"
            />
          </FilterField>
          <FilterField label="Case Owner">
            <FilterSelect
              value={draft.ownerId}
              onChange={(e) => setDraft({ ...draft, ownerId: e.target.value })}
              placeholder="Select Owner"
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.first_name} {owner.last_name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Status">
            <FilterSelect
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              placeholder="All Statuses"
            >
              {DISPUTE_STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Created Date">
            <FilterDate
              value={draft.createdFrom}
              onChange={(e) => setDraft({ ...draft, createdFrom: e.target.value })}
              placeholder="Select Date Range"
              aria-label="Created from"
            />
            <span className="text-xs text-placeholder">–</span>
            <FilterDate
              value={draft.createdTo}
              onChange={(e) => setDraft({ ...draft, createdTo: e.target.value })}
              placeholder="To"
              aria-label="Created to"
            />
          </FilterField>
        </FilterBar>

        <StatusTabs
          tabs={TABS.map((entry) => ({ ...entry, count: tabCounts?.[entry.id] ?? null }))}
          active={tab}
          onChange={(next) => {
            setTab(next);
            resetPaging();
          }}
        >
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

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className="hidden w-8 lg:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all cases"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(disputes.map((dispute) => dispute.id)))
                    }
                    className={checkboxClass}
                  />
                </th>
                <th scope="col" className={`${headCellClass} w-[92px] lg:w-[10%]`}>Case ID</th>
                <th scope="col" className={headCellClass}>Dispute / Client</th>
                <th scope="col" className={`${headCellClass} hidden w-[15%] lg:table-cell`}>Project</th>
                <th scope="col" className={`${headCellClass} hidden w-[13%] lg:table-cell`}>Raised by</th>
                <th scope="col" className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Review owner</th>
                <th scope="col" className={`${headCellClass} w-[120px] lg:w-[13%]`}>Status</th>
                <th scope="col" className={`${headCellClass} hidden w-[13%] sm:table-cell`}>Resolution due</th>
                <th scope="col" className={`${headCellClass} w-[40px] text-[11px] lg:w-[5%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[94px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && disputes.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-placeholder">
                    {isFiltered ? "No cases match those filters." : "No sales disputes yet."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                disputes.map((dispute) => {
                  const status = DISPUTE_STATUSES.find((entry) => entry.id === dispute.status);
                  // Mirrors the server rule: an admin or the case's reviewer moves it along.
                  const canReview = admin || dispute.review_owner?.id === sessionUserId;
                  const note = resolutionNote(dispute);
                  return (
                    <tr key={dispute.id} className={`${rowClass} !h-[94px]`}>
                      <td className="hidden lg:table-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${disputeCode(dispute)}`}
                          checked={selected.has(dispute.id)}
                          onChange={() => toggleSelected(dispute.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pr-3">
                        <p>{disputeCode(dispute)}</p>
                        <p className={subTextClass}>{formatDay(dispute.created_at)}</p>
                      </td>
                      <td className="pr-3">
                        <p className="truncate" title={dispute.description ?? undefined}>
                          {dispute.subject}
                        </p>
                        <p className={subTextClass}>
                          Lead {dispute.lead.lead_no} · {dispute.lead.client_name}
                        </p>
                      </td>
                      <td className="hidden truncate pr-3 lg:table-cell">{dispute.lead.project?.name ?? "—"}</td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{personName(dispute.raised_by)}</p>
                        {dispute.raised_by?.team && <p className={subTextClass}>{dispute.raised_by.team}</p>}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{personName(dispute.review_owner)}</p>
                        {dispute.review_owner?.department && (
                          <p className={subTextClass}>{dispute.review_owner.department}</p>
                        )}
                      </td>
                      <td className="pr-3">
                        <StatusBadge tone={status?.tone}>{status?.label ?? dispute.status}</StatusBadge>
                      </td>
                      <td className="hidden pr-3 sm:table-cell">
                        <p>
                          {dispute.status === "resolved" && dispute.resolved_at
                            ? formatDay(dispute.resolved_at)
                            : dispute.resolution_due
                              ? formatDay(`${dispute.resolution_due}T00:00:00`)
                              : "—"}
                        </p>
                        <p className={`${subTextClass} ${note.endsWith("overdue") ? "text-hot" : ""}`}>{note}</p>
                      </td>
                      <td>
                        <RowMenu
                          label={`More actions for ${disputeCode(dispute)}`}
                          items={[
                            ...(canReview
                              ? DISPUTE_STATUSES.filter((entry) => entry.id !== dispute.status).map((entry) => ({
                                  label: `Mark ${entry.label.toLowerCase()}`,
                                  onClick: () => void run(setDisputeStatus(dispute.id, entry.id)),
                                }))
                              : []),
                            {
                              label: dispute.is_starred ? "Remove from favourites" : "Add to favourites",
                              onClick: () => void run(setDisputeStarred(dispute.id, !dispute.is_starred)),
                            },
                          ]}
                        />
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
          noun="cases"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isNewOpen && <NewDisputeModal onClose={() => setIsNewOpen(false)} onCreated={() => void load()} />}
    </ViewTransition>
  );
}
