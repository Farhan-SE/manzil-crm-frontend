"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { NewApprovalModal, ReviewApprovalModal } from "@/components/approvals/ApprovalModals";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { RowMenu } from "@/components/list/RowMenu";
import { StatusBadge } from "@/components/list/StatusBadge";
import { FavouritesButton, StatusTabs } from "@/components/list/StatusTabs";
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
  getApprovals,
  getManagementOverview,
  setApprovalStarred,
  type Approval,
  type ApprovalTab,
  type ManagementOverview,
} from "@/lib/api";
import { APPROVAL_TYPES, approvalCode, approvalTypeLabel } from "@/lib/approvals";
import { downloadCsv } from "@/lib/csv";
import { useIsAdmin } from "@/lib/session";
import { formatClock } from "@/lib/time";

const TABS: { id: ApprovalTab; label: string }[] = [
  { id: "pending", label: "Pending approvals" },
  { id: "approved", label: "Approved" },
  { id: "returned", label: "Returned" },
];

const EXPORT_LIMIT = 1000;

const COLUMN_COUNT = 8;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const panelClass = "rounded-[4px] border border-dash-border bg-white p-4";

const headerActionClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-dash-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60";

function submittedAt(approval: Approval) {
  const at = new Date(approval.created_at);
  return `${at.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}, ${formatClock(at)}`;
}

function submitterName(approval: Approval) {
  return approval.submitted_by ? `${approval.submitted_by.first_name} ${approval.submitted_by.last_name}` : "—";
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export default function ManagementPage() {
  const admin = useIsAdmin();

  const [overview, setOverview] = useState<ManagementOverview | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<ApprovalTab, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<ApprovalTab>("pending");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<Approval | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getApprovals({
        tab,
        starred: favouritesOnly ? "true" : undefined,
        sort,
        page,
        limit: pageSize,
      });
      setApprovals(res.data);
      setTotal(res.total);
      setTabCounts(res.tab_counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals.");
      setApprovals([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
    // The overview is management-only; an agent just sees their own requests below.
    if (admin) getManagementOverview().then(setOverview).catch(() => {});
  }, [tab, favouritesOnly, sort, page, pageSize, admin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportOverview() {
    try {
      const res = await getApprovals({ tab, sort, page: 1, limit: EXPORT_LIMIT });
      downloadCsv(`approvals-${tab}-${new Date().toLocaleDateString("en-CA")}.csv`, [
        ["Request", "Type", "Summary", "Project", "Client", "Lead", "Submitted by", "Submitted", "Priority", "Status"],
        ...res.data.map((approval) => [
          approvalCode(approval),
          approvalTypeLabel(approval.type),
          approval.summary,
          approval.lead.project?.name ?? "",
          approval.lead.client_name,
          String(approval.lead.lead_no),
          approval.submitted_by ? submitterName(approval) : "",
          approval.created_at,
          approval.priority,
          approval.status,
        ]),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export approvals.");
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

  const allSelected = approvals.length > 0 && approvals.every((approval) => selected.has(approval.id));
  const busiest = Math.max(...(overview?.staff_workload ?? []).map((member) => member.open_tasks), 1);

  const metrics = overview && [
    {
      label: "Pending approvals",
      value: overview.pending_approvals,
      note: APPROVAL_TYPES.map((type) => `${overview.pending_by_type[type.id] ?? 0} ${type.short}`).join(" · "),
    },
    { label: "Due today", value: overview.due_today, note: "Decision needed by end of day" },
    { label: "Active staff", value: overview.active_staff, note: "Can sign in to the workspace" },
    {
      label: "Escalated cases",
      value: overview.escalated_cases,
      note: overview.escalated_cases > 0 ? "Ownership review required" : "No sales disputes escalated",
    },
  ];

  const reminders = overview && [
    {
      title: "Resolve allocation escalations",
      note: `${plural(overview.escalated_cases, "case")} awaiting review`,
    },
    {
      title: "Reconcile unverified receipts",
      note: `${plural(overview.payment_verifications_pending, "payment verification")} awaiting a decision`,
    },
    {
      title: "Review pending approvals",
      note: `${plural(overview.pending_approvals, "request")} in the queue · ${overview.due_today} due today`,
    },
  ];

  return (
    <ViewTransition>
      <div className="flex w-full flex-col pb-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-dash-ink" style={headingStyle}>
              Management overview
            </h1>
            <p className="text-[10px] text-dash-muted">
              {admin ? "Operations" : "Your approval requests"} ·{" "}
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsNewOpen(true)} className={headerActionClass}>
              <PlusIcon className="size-2.5" />
              Request approval
            </button>
            <button
              type="button"
              onClick={() => void exportOverview()}
              disabled={total === 0}
              className={headerActionClass}
            >
              <Icon name="download" className="size-4" />
              Export overview
            </button>
          </div>
        </div>

        {admin && (
          <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:gap-5 sm:px-8 lg:grid-cols-4">
            {!metrics &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex min-w-0 flex-col gap-2.5 ${panelClass}`}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              ))}
            {metrics?.map((metric) => (
              <div key={metric.label} className={`flex min-w-0 flex-col gap-1.5 leading-[1.4] ${panelClass}`}>
                <p className="text-[11px] text-dash-muted">{metric.label}</p>
                <p className="font-serif text-[26px] font-bold text-dash-ink" style={headingStyle}>
                  {metric.value}
                </p>
                <p className="truncate text-[10px] text-primary">{metric.note}</p>
              </div>
            ))}
          </div>
        )}

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
          <button
            type="button"
            onClick={() => {
              setSort(sort === "asc" ? "desc" : "asc");
              setPage(1);
            }}
            className="flex shrink-0 items-center gap-1.5 text-xs leading-[1.4] text-nav-idle transition-colors hover:text-dash-ink"
          >
            {sort === "asc" ? "Oldest first" : "Newest first"}
            <Icon name="sort" className={`size-4 text-ink ${sort === "asc" ? "" : "-scale-y-100"}`} />
          </button>
        </StatusTabs>

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th className="hidden w-8 lg:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all requests"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(approvals.map((approval) => approval.id)))
                    }
                    className={checkboxClass}
                  />
                </th>
                <th className={headCellClass}>Request</th>
                <th className={`${headCellClass} hidden w-[21%] lg:table-cell`}>Project / Client</th>
                <th className={`${headCellClass} hidden w-[17%] lg:table-cell`}>Submitted by</th>
                <th className={`${headCellClass} hidden w-[13%] sm:table-cell`}>Submitted</th>
                <th className={`${headCellClass} w-[84px] lg:w-[11%]`}>Priority</th>
                <th className={`${headCellClass} w-[76px] lg:w-[10%]`}>Review</th>
                <th className={`${headCellClass} w-[40px] text-[9px] lg:w-[5%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[61px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <Skeleton className="h-3 w-1/3" />
                    </td>
                  </tr>
                ))}

              {!isLoading && approvals.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {tab === "pending" ? "Nothing is waiting for approval." : "No requests here."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                approvals.map((approval) => (
                  <tr key={approval.id} className={`${rowClass} !h-[61px]`}>
                    <td className="hidden lg:table-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${approvalCode(approval)}`}
                        checked={selected.has(approval.id)}
                        onChange={() => toggleSelected(approval.id)}
                        className={checkboxClass}
                      />
                    </td>
                    <td className="pr-3">
                      <p className="truncate">
                        {approvalCode(approval)} · {approvalTypeLabel(approval.type)}
                      </p>
                      <p className={subTextClass}>{approval.summary}</p>
                    </td>
                    <td className="hidden pr-3 lg:table-cell">
                      <p className="truncate">{approval.lead.project?.name ?? "—"}</p>
                      <p className={subTextClass}>{approval.lead.client_name}</p>
                    </td>
                    <td className="hidden truncate pr-3 lg:table-cell">{submitterName(approval)}</td>
                    <td className="hidden truncate pr-3 sm:table-cell">{submittedAt(approval)}</td>
                    <td className="pr-3">
                      <StatusBadge tone={approval.priority === "high" ? "warning" : "neutral"}>
                        {approval.priority === "high" ? "High" : "Normal"}
                      </StatusBadge>
                    </td>
                    <td className="pr-3">
                      <button type="button" onClick={() => setReviewing(approval)} className="hover:underline">
                        Review →
                      </button>
                    </td>
                    <td>
                      <RowMenu
                        label={`More actions for ${approvalCode(approval)}`}
                        items={[
                          { label: "Review request", onClick: () => setReviewing(approval) },
                          {
                            label: approval.is_starred ? "Remove from favourites" : "Add to favourites",
                            onClick: () =>
                              void setApprovalStarred(approval.id, !approval.is_starred)
                                .catch(() => setError("Couldn't update that request."))
                                .then(() => load()),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          noun="requests"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        {admin && overview && (
          <div className="flex flex-col gap-6 px-4 sm:px-8 lg:flex-row lg:items-start">
            <div className={`flex min-w-0 flex-col gap-4 lg:flex-1 ${panelClass}`}>
              <div className="flex items-center justify-between leading-[1.4]">
                <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
                  Staff workload
                </h2>
                <p className="text-[10px] text-dash-muted">Open tasks</p>
              </div>
              {overview.staff_workload.length === 0 && (
                <p className="text-xs text-dash-placeholder">No open tasks.</p>
              )}
              {overview.staff_workload.map((member) => (
                <div key={member.id} className="flex flex-col gap-2 leading-[1.4]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs text-dash-ink">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="shrink-0 text-[11px] text-dash-muted">
                      {member.open_tasks} open · {member.overdue_tasks} overdue
                    </p>
                  </div>
                  <div className="h-1 rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(member.open_tasks / busiest) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className={`flex min-w-0 flex-col gap-4 lg:flex-1 ${panelClass}`}>
              <div className="flex items-center justify-between leading-[1.4]">
                <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
                  Operational reminders
                </h2>
                <p className="text-[10px] text-dash-muted">Right now</p>
              </div>
              {reminders?.map((reminder) => (
                <div key={reminder.title} className="leading-[1.4]">
                  <p className="text-xs text-dash-ink">{reminder.title}</p>
                  <p className="mt-[5px] text-[10px] text-dash-muted">{reminder.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isNewOpen && <NewApprovalModal onClose={() => setIsNewOpen(false)} onCreated={() => void load()} />}
      {reviewing && (
        <ReviewApprovalModal
          approval={reviewing}
          canDecide={admin}
          onClose={() => setReviewing(null)}
          onDecided={() => void load()}
        />
      )}
    </ViewTransition>
  );
}
