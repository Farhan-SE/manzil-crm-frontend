"use client";

import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { ViewTransition } from "react";
import { FilterBar, FilterField, FilterSelect } from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { SortButton, StatusTabs } from "@/components/list/StatusTabs";
import { TablePagination } from "@/components/list/TablePagination";
import { headCellClass, headRowClass, rowClass, subTextClass, tableClass } from "@/components/list/tableStyles";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  generateReport,
  getPartnerProjects,
  getPipeline,
  getReports,
  getSalesPerformance,
  getTargets,
  setTarget,
  type PartnerProject,
  type Report,
  type ReportCategory,
  type SalesMonth,
  type TargetMetric,
  type TargetProgress,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatMillions, formatMoney } from "@/lib/money";
import { recentMonths } from "@/lib/payments";
import { useIsAdmin } from "@/lib/session";
import { formatClock, formatDay } from "@/lib/time";

type Tab = ReportCategory | "all";
type Filters = { period: string; category: string; region: string; projectId: string };

const CATEGORIES: { id: ReportCategory; label: string }[] = [
  { id: "sales", label: "Sales" },
  { id: "inventory", label: "Inventory" },
  { id: "collections", label: "Collections" },
  { id: "staff", label: "Staff" },
];

/** `money` targets are entered and shown in PKR millions; the rest as plain counts. */
const TARGETS: Record<TargetMetric, { label: string; unit: string; money: boolean }> = {
  booked_sales: { label: "Booked sales", unit: "M PKR", money: true },
  site_visits: { label: "Client site visits", unit: "visits", money: false },
  collections: { label: "Collections", unit: "M PKR", money: true },
  unit_sales: { label: "Project units sold", unit: "units", money: false },
};

const BAR_MAX_HEIGHT = 97;

const COLUMN_COUNT = 7;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const panelClass = "rounded-[4px] border border-dash-border bg-white p-4";

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

function monthLabel(period: string, style: "short" | "long" = "short") {
  return new Date(`${period}-01T00:00:00`).toLocaleDateString("en-US", {
    month: style,
    year: style === "long" ? "numeric" : undefined,
  });
}

function shortPeriod(period: string) {
  return new Date(`${period}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function TargetsModal({
  period,
  targets,
  onClose,
  onSaved,
}: {
  period: string;
  targets: TargetProgress[];
  onClose: () => void;
  onSaved: (targets: TargetProgress[]) => void;
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      targets.map((entry) => [
        entry.metric,
        entry.target == null ? "" : String(TARGETS[entry.metric].money ? entry.target / 1_000_000 : entry.target),
      ]),
    ),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      let latest = targets;
      for (const entry of targets) {
        const raw = values[entry.metric];
        if (raw === "") continue;
        const value = Number(raw) * (TARGETS[entry.metric].money ? 1_000_000 : 1);
        latest = await setTarget(period, entry.metric, value);
      }
      onSaved(latest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-sidebar shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-dash-border px-4 py-4 sm:px-6">
          <h2 className="font-serif text-2xl font-bold text-dash-ink" style={headingStyle}>
            Targets · {monthLabel(period, "long")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-dash-muted transition-colors hover:text-dash-ink"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
          {targets.map((entry) => (
            <div key={entry.metric} className="flex flex-col gap-1.5">
              <label htmlFor={`target-${entry.metric}`} className="text-sm text-dash-muted">
                {TARGETS[entry.metric].label} ({TARGETS[entry.metric].unit})
              </label>
              <input
                id={`target-${entry.metric}`}
                type="number"
                min="0"
                step="any"
                value={values[entry.metric]}
                onChange={(e) => setValues({ ...values, [entry.metric]: e.target.value })}
                placeholder="Not set"
                className={inputClass}
              />
            </div>
          ))}
          {error && <p className="text-sm text-hot">{error}</p>}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save targets"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const admin = useIsAdmin();
  const [months] = useState(recentMonths);
  const currentPeriod = months[0].id;

  const [reports, setReports] = useState<Report[] | null>(null);
  const [sales, setSales] = useState<SalesMonth[] | null>(null);
  const [targets, setTargets] = useState<TargetProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>({ period: currentPeriod, category: "", region: "", projectId: "" });
  const [filters, setFilters] = useState<Filters>({ period: currentPeriod, category: "", region: "", projectId: "" });
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isTargetsOpen, setIsTargetsOpen] = useState(false);

  const loadReports = useCallback(() => {
    getReports()
      .then(setReports)
      .catch((err) => {
        setReports([]);
        setError(err instanceof Error ? err.message : "Failed to load reports.");
      });
  }, []);

  useEffect(() => {
    loadReports();
    getSalesPerformance()
      .then(setSales)
      .catch(() => setSales([]));
    getPartnerProjects({ limit: 500 }).then(setProjects).catch(() => {});
    // The pipeline response carries every region staff are assigned to.
    getPipeline({ per_stage: 1 })
      .then((res) => setRegions(res.regions))
      .catch(() => {});
  }, [loadReports]);

  useEffect(() => {
    getTargets(filters.period)
      .then(setTargets)
      .catch(() => setTargets([]));
  }, [filters.period]);

  async function download(report: Report) {
    setBusyKey(report.key);
    setError(null);
    try {
      const res = await generateReport(report.key, {
        period: filters.period,
        project_id: filters.projectId || undefined,
        region: filters.region || undefined,
      });
      downloadCsv(`${report.key.replace(/_/g, "-")}-${res.period}.csv`, [
        res.columns,
        ...res.rows.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
      ]);
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate that report.");
    } finally {
      setBusyKey(null);
    }
  }

  function exportSummary() {
    downloadCsv(`reports-summary-${filters.period}.csv`, [
      ["Month", "Closed sales (PKR)", "Deals"],
      ...(sales ?? []).map((entry) => [entry.month, String(entry.total), String(entry.count)]),
      [""],
      ["Target", "Actual", "Target value"],
      ...(targets ?? []).map((entry) => [
        TARGETS[entry.metric].label,
        String(entry.actual),
        entry.target == null ? "" : String(entry.target),
      ]),
    ]);
  }

  const inCategory = (reports ?? []).filter((report) => !filters.category || report.category === filters.category);
  const visible = inCategory
    .filter((report) => tab === "all" || report.category === tab)
    .sort((a, b) => (sort === "asc" ? 1 : -1) * a.name.localeCompare(b.name));
  const pageRows = visible.slice((page - 1) * pageSize, page * pageSize);
  const salesPeak = Math.max(...(sales ?? []).map((entry) => entry.total), 0);
  const latestSales = sales?.[sales.length - 1];

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-dash-ink" style={headingStyle}>
              Reports
            </h1>
            <p className="text-[10px] text-dash-muted">Performance data · Sales, inventory and collections</p>
          </div>
          <button
            type="button"
            onClick={exportSummary}
            disabled={!sales || !targets}
            className="flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-dash-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60"
          >
            <Icon name="download" className="size-4" />
            Export summary
          </button>
        </div>

        <FilterBar
          onSearch={() => {
            setFilters(draft);
            setPage(1);
          }}
        >
          <FilterField label="Period">
            <FilterSelect value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })}>
              {months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Report Category">
            <FilterSelect
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              placeholder="All Categories"
            >
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
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
              {regions.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </FilterSelect>
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
        </FilterBar>

        <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 lg:flex-row lg:items-start">
          <div className={`flex min-w-0 flex-col gap-4 lg:flex-[5] ${panelClass}`}>
            <div className="flex items-center justify-between leading-[1.4]">
              <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
                Monthly sales performance
              </h2>
              {latestSales && (
                <p className="text-[10px] text-dash-muted">
                  {formatMoney(latestSales.total)} · {monthLabel(latestSales.month, "long")}
                </p>
              )}
            </div>
            <div className="flex gap-4 text-[10px] leading-[1.4]">
              <p className="text-primary">■ Closed sales</p>
              <p className="text-dash-muted">PKR million</p>
            </div>
            {!sales && <Skeleton className="h-[160px] w-full" />}
            {sales && sales.length === 0 && (
              <p className="flex h-[160px] items-center justify-center text-xs text-dash-placeholder">
                Sales data is unavailable.
              </p>
            )}
            {sales && sales.length > 0 && (
              <>
                <div className="flex h-[132px] items-end gap-3 border-b border-dash-border px-3 sm:gap-[26px]">
                  {sales.map((entry) => (
                    <div key={entry.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <p className="whitespace-nowrap text-[10px] leading-[1.4] text-dash-muted">
                        {formatMillions(entry.total)}
                      </p>
                      <div
                        className="w-full max-w-11 rounded-t-[3px] bg-warm"
                        style={{ height: salesPeak ? (entry.total / salesPeak) * BAR_MAX_HEIGHT : 0 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 px-3 text-center text-[10px] text-dash-muted sm:gap-[26px]">
                  {sales.map((entry) => (
                    <p key={entry.month} className="min-w-0 flex-1">
                      {monthLabel(entry.month)}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={`flex min-w-0 flex-col gap-4 lg:flex-[3] ${panelClass}`}>
            <div className="flex items-center justify-between gap-3 leading-[1.4]">
              <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
                Target achievement
              </h2>
              <p className="shrink-0 text-[10px] text-dash-muted">{monthLabel(filters.period, "long")}</p>
            </div>
            {!targets && <Skeleton className="h-24 w-full" />}
            {targets?.map((entry) => {
              const meta = TARGETS[entry.metric];
              const show = (value: number) => (meta.money ? formatMillions(value) : String(value));
              const progress = entry.target ? Math.min(entry.actual / entry.target, 1) : 0;
              return (
                <div key={entry.metric} className="flex flex-col gap-2 leading-[1.4]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-dash-ink">{meta.label}</p>
                    <p className="shrink-0 text-[11px] text-dash-muted">
                      {show(entry.actual)} / {entry.target == null ? "no target" : show(entry.target)} {meta.unit}
                    </p>
                  </div>
                  <div className="h-1 rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {admin && targets && targets.length > 0 && (
              <button
                type="button"
                onClick={() => setIsTargetsOpen(true)}
                className="self-start text-[11px] text-primary hover:underline"
              >
                Set targets →
              </button>
            )}
          </div>
        </div>

        <StatusTabs
          tabs={[
            { id: "all" as Tab, label: "All reports", count: reports ? inCategory.length : null },
            ...CATEGORIES.map((category) => ({
              id: category.id as Tab,
              label: category.label,
              count: reports ? inCategory.filter((report) => report.category === category.id).length : null,
            })),
          ]}
          active={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
        >
          <SortButton sort={sort} onChange={setSort} />
        </StatusTabs>

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th className={headCellClass}>Report name</th>
                <th className={`${headCellClass} hidden w-[14%] lg:table-cell`}>Category</th>
                <th className={`${headCellClass} hidden w-[16%] sm:table-cell`}>Period</th>
                <th className={`${headCellClass} hidden w-[18%] lg:table-cell`}>Last generated</th>
                <th className={`${headCellClass} hidden w-[8%] lg:table-cell`}>Format</th>
                <th className={`${headCellClass} w-[110px] lg:w-[11%]`}>Download</th>
                <th className={`${headCellClass} w-[40px] text-[9px] lg:w-[4%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!reports &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[52px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <Skeleton className="h-3 w-1/3" />
                    </td>
                  </tr>
                ))}

              {reports && visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    No reports in this category.
                  </td>
                </tr>
              )}

              {pageRows.map((report) => (
                <tr key={report.key} className={`${rowClass} !h-[52px]`}>
                  <td className="pr-3">
                    <p className="truncate">{report.name}</p>
                    <p className={subTextClass}>{report.description}</p>
                  </td>
                  <td className="hidden pr-3 lg:table-cell">
                    {CATEGORIES.find((category) => category.id === report.category)?.label}
                  </td>
                  <td className="hidden pr-3 sm:table-cell">{shortPeriod(filters.period)}</td>
                  <td className="hidden truncate pr-3 lg:table-cell">
                    {report.last_generated_at
                      ? `${formatDay(report.last_generated_at)} · ${formatClock(report.last_generated_at)}`
                      : "Not generated yet"}
                  </td>
                  <td className="hidden pr-3 lg:table-cell">{report.format}</td>
                  <td className="pr-3">
                    <button
                      type="button"
                      onClick={() => void download(report)}
                      disabled={busyKey !== null}
                      className="hover:underline disabled:opacity-60"
                    >
                      {busyKey === report.key ? "Preparing…" : "Download ↓"}
                    </button>
                  </td>
                  <td>
                    <RowMenu
                      label={`More actions for ${report.name}`}
                      items={[{ label: `Download ${report.format}`, onClick: () => void download(report) }]}
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
          total={visible.length}
          noun="reports"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isTargetsOpen && targets && (
        <TargetsModal
          period={filters.period}
          targets={targets}
          onClose={() => setIsTargetsOpen(false)}
          onSaved={setTargets}
        />
      )}
    </ViewTransition>
  );
}
