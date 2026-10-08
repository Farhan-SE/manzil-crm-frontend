"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { NewPaymentModal, RecordPaymentModal } from "@/components/accounts/PaymentModals";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { FilterBar, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
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
  getPartnerProjects,
  getPayments,
  getPaymentsSummary,
  setPaymentStarred,
  verifyPayment,
  type PartnerProject,
  type Payment,
  type PaymentsQuery,
  type PaymentsSummary,
  type PaymentTab,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatMillions } from "@/lib/money";
import { PAYMENT_STATUSES, PAYMENT_TYPES, paymentCode, paymentTypeLabel, recentMonths } from "@/lib/payments";
import { useIsAdmin } from "@/lib/session";
import { formatDay } from "@/lib/time";

type Filters = { search: string; projectId: string; paymentType: string; period: string };

const EMPTY_FILTERS: Filters = { search: "", projectId: "", paymentType: "", period: "" };

const TABS: { id: PaymentTab; label: string }[] = [
  { id: "all", label: "All transactions" },
  { id: "received", label: "Received" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
  { id: "unverified", label: "Unverified" },
];

const EXPORT_LIMIT = 1000;

const COLUMN_COUNT = 9;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const panelClass = "rounded-[4px] border border-dash-border bg-white p-4";

const headerActionClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-dash-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60";

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function buildMetrics(summary: PaymentsSummary) {
  return [
    {
      label: "Collections this month",
      value: `${formatMillions(summary.collections_month)} M`,
      note: summary.collections_target
        ? `${Math.round((summary.collections_month / summary.collections_target) * 100)}% of monthly target`
        : "No monthly target set",
    },
    {
      label: "Outstanding receivables",
      value: `${formatMillions(summary.outstanding)} M`,
      note: `${plural(summary.open_count, "open instalment")}`,
    },
    {
      label: "Overdue balance",
      value: `${formatMillions(summary.overdue_balance)} M`,
      note: `${plural(summary.overdue_count, "instalment")} past due`,
    },
    {
      label: "Unverified receipts",
      value: String(summary.unverified_count),
      note: `PKR ${formatMillions(summary.unverified_amount)} M awaiting review`,
    },
  ];
}

export default function AccountsPage() {
  const admin = useIsAdmin();

  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<PaymentTab, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<PaymentTab>("all");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [months] = useState(recentMonths);
  const [recording, setRecording] = useState<Payment | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);

  useEffect(() => {
    getPartnerProjects({ limit: 500 }).then(setProjects).catch(() => {});
  }, []);

  const buildQuery = useCallback(
    (): PaymentsQuery => ({
      tab,
      search: filters.search.trim() || undefined,
      project_id: filters.projectId || undefined,
      payment_type: filters.paymentType || undefined,
      period: filters.period || undefined,
      starred: favouritesOnly ? "true" : undefined,
      sort,
    }),
    [tab, filters, favouritesOnly, sort],
  );

  const load = useCallback(async () => {
    setError(null);
    getPaymentsSummary().then(setSummary).catch(() => {});
    try {
      const res = await getPayments({ ...buildQuery(), page, limit: pageSize });
      setPayments(res.data);
      setTotal(res.total);
      setTabCounts(res.tab_counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions.");
      setPayments([]);
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
      setError(err instanceof Error ? err.message : "Couldn't update that transaction.");
    }
    void load();
  }

  async function exportLedger() {
    try {
      const res = await getPayments({ ...buildQuery(), page: 1, limit: EXPORT_LIMIT });
      downloadCsv(`ledger-${new Date().toLocaleDateString("en-CA")}.csv`, [
        ["Reference", "Type", "Client", "Lead", "Project", "Due date", "Amount (PKR)", "Received (PKR)", "Balance (PKR)", "Status"],
        ...res.data.map((payment) => [
          paymentCode(payment),
          paymentTypeLabel(payment.payment_type),
          payment.lead.client_name,
          String(payment.lead.lead_no),
          payment.lead.project?.name ?? "",
          payment.due_date,
          String(payment.amount),
          String(payment.received_amount),
          String(payment.balance),
          PAYMENT_STATUSES[payment.status].label,
        ]),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export the ledger.");
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
  const allSelected = payments.length > 0 && payments.every((payment) => selected.has(payment.id));

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-dash-ink" style={headingStyle}>
              Accounts
            </h1>
            <p className="text-[10px] text-dash-muted">
              All amounts in PKR · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {admin && (
              <button type="button" onClick={() => setIsNewOpen(true)} className={headerActionClass}>
                <PlusIcon className="size-2.5" />
                Add payment
              </button>
            )}
            <button
              type="button"
              onClick={() => void exportLedger()}
              disabled={total === 0}
              className={headerActionClass}
            >
              <Icon name="download" className="size-4" />
              Export ledger
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:gap-5 sm:px-8 lg:grid-cols-4">
          {!summary &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex min-w-0 flex-col gap-2.5 ${panelClass}`}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            ))}
          {summary &&
            buildMetrics(summary).map((metric) => (
              <div key={metric.label} className={`flex min-w-0 flex-col gap-1.5 leading-[1.4] ${panelClass}`}>
                <p className="text-[11px] text-dash-muted">{metric.label}</p>
                <p className="font-serif text-[26px] font-bold text-dash-ink" style={headingStyle}>
                  {metric.value}
                </p>
                <p className="truncate text-[10px] text-primary">{metric.note}</p>
              </div>
            ))}
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
              placeholder="Receipt or Client"
            />
          </FilterField>
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
          <FilterField label="Payment Type">
            <FilterSelect
              value={draft.paymentType}
              onChange={(e) => setDraft({ ...draft, paymentType: e.target.value })}
              placeholder="All Payment Types"
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Date">
            <FilterSelect
              value={draft.period}
              onChange={(e) => setDraft({ ...draft, period: e.target.value })}
              placeholder="All Dates"
            >
              {months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.name}
                </option>
              ))}
            </FilterSelect>
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
                <th className="hidden w-8 lg:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all transactions"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(payments.map((payment) => payment.id)))
                    }
                    className={checkboxClass}
                  />
                </th>
                <th className={`${headCellClass} w-[104px] lg:w-[14%]`}>Reference / Type</th>
                <th className={headCellClass}>Client / Project</th>
                <th className={`${headCellClass} hidden w-[11%] lg:table-cell`}>Due date</th>
                <th className={`${headCellClass} hidden w-[12%] sm:table-cell`}>Amount (PKR)</th>
                <th className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Received (PKR)</th>
                <th className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Balance (PKR)</th>
                <th className={`${headCellClass} w-[96px] lg:w-[10%]`}>Status</th>
                <th className={`${headCellClass} w-[40px] text-[9px] lg:w-[5%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[65px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <Skeleton className="h-3 w-1/3" />
                    </td>
                  </tr>
                ))}

              {!isLoading && payments.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {isFiltered ? "No transactions match those filters." : "No transactions yet."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                payments.map((payment) => {
                  const status = PAYMENT_STATUSES[payment.status];
                  return (
                    <tr key={payment.id} className={`${rowClass} !h-[65px]`}>
                      <td className="hidden lg:table-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${paymentCode(payment)}`}
                          checked={selected.has(payment.id)}
                          onChange={() => toggleSelected(payment.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pr-3">
                        <p>{paymentCode(payment)}</p>
                        <p className={subTextClass}>{paymentTypeLabel(payment.payment_type)}</p>
                      </td>
                      <td className="pr-3">
                        <p className="truncate">{payment.lead.client_name}</p>
                        <p className={subTextClass}>{payment.lead.project?.name ?? `Lead ${payment.lead.lead_no}`}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">{formatDay(`${payment.due_date}T00:00:00`)}</td>
                      <td className="hidden pr-3 sm:table-cell">{payment.amount.toLocaleString()}</td>
                      <td className="hidden pr-3 lg:table-cell">{payment.received_amount.toLocaleString()}</td>
                      <td className="hidden pr-3 lg:table-cell">{payment.balance.toLocaleString()}</td>
                      <td className="pr-3">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                      <td>
                        <RowMenu
                          label={`More actions for ${paymentCode(payment)}`}
                          items={[
                            ...(payment.balance > 0
                              ? [{ label: "Record payment", onClick: () => setRecording(payment) }]
                              : []),
                            ...(admin && payment.status === "unverified"
                              ? [{ label: "Verify receipt", onClick: () => void run(verifyPayment(payment.id)) }]
                              : []),
                            {
                              label: payment.is_starred ? "Remove from favourites" : "Add to favourites",
                              onClick: () => void run(setPaymentStarred(payment.id, !payment.is_starred)),
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
          noun="transactions"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isNewOpen && <NewPaymentModal onClose={() => setIsNewOpen(false)} onCreated={() => void load()} />}
      {recording && (
        <RecordPaymentModal
          key={recording.id}
          payment={recording}
          onClose={() => setRecording(null)}
          onRecorded={() => void load()}
        />
      )}
    </ViewTransition>
  );
}
