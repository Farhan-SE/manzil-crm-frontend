"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ViewTransition } from "react";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getDashboardStats,
  getFollowUps,
  getLead,
  getRecentActivity,
  getSalesPerformance,
  type Activity,
  type DashboardStats,
  type FollowUp,
  type Lead,
  type SalesMonth,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatMillions, formatMoney } from "@/lib/money";
import { taskLabel } from "@/lib/tasks";

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const panelClass = "rounded-[4px] border border-dash-border bg-white p-4";

const BAR_MAX_HEIGHT = 97;

function monthLabel(month: string, withYear = false) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: withYear ? "numeric" : undefined,
  });
}

function buildMetrics(stats: DashboardStats) {
  const change = stats.new_inquiries_change;
  return [
    {
      label: "New inquiries",
      value: String(stats.new_inquiries),
      note: `${change >= 0 ? "+" : "−"}${Math.abs(change)} compared with last month`,
    },
    {
      label: "Active opportunities",
      value: String(stats.open_leads),
      note: `${formatMoney(stats.pipeline_value)} pipeline value`,
    },
    {
      label: "Closed sales",
      value: String(stats.closed_sales_month),
      note: `${formatMoney(stats.closed_value_month)} booked this month`,
    },
    {
      label: "Tasks due today",
      value: String(stats.tasks_due_today),
      note: `${stats.overdue_follow_ups} follow-ups need attention`,
    },
  ];
}

function activityIcon(taskType: string | null) {
  const type = (taskType ?? "").toLowerCase();
  if (type.includes("call") || type.includes("contact") || type.includes("follow")) return "phone";
  if (type.includes("visit") || type.includes("meet")) return "calendar";
  if (type.includes("payment")) return "receipt";
  return "check-circle";
}

function activityTitle(activity: Activity) {
  const label = activity.task_type ? taskLabel(activity) : activity.text;
  return activity.kind === "scheduled" ? `${label} scheduled` : label;
}

function formatActivityTime(at: string) {
  const date = new Date(at);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toLowerCase();
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PRIORITY_LABELS = { low: "Low priority", normal: "Normal priority", high: "High priority" };

function formatDue(followUp: FollowUp) {
  const date = new Date(`${followUp.due_date}T${followUp.due_time}`);
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  if (date.toDateString() === new Date().toDateString()) return `Today, ${time}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

function assigneeName(followUp: FollowUp) {
  const agent = followUp.lead.assigned_to;
  return agent ? `${agent.first_name} ${agent.last_name}`.trim() : "Unassigned";
}

function downloadSummary(stats: DashboardStats, sales: SalesMonth[]) {
  const rows = [
    ["Metric", "Value", "Detail"],
    ...buildMetrics(stats).map((metric) => [metric.label, metric.value, metric.note]),
    [""],
    ["Month", "Closed sales (PKR)", "Deals"],
    ...sales.map((entry) => [entry.month, String(entry.total), String(entry.count)]),
  ];
  downloadCsv(`sales-overview-${new Date().toLocaleDateString("en-CA")}.csv`, rows);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<SalesMonth[] | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[] | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  function refresh() {
    getDashboardStats().then(setStats).catch(() => {});
    getSalesPerformance()
      .then(setSales)
      .catch(() => setSales([]));
    getRecentActivity()
      .then(setActivity)
      .catch(() => setActivity([]));
    getFollowUps({ limit: 5 })
      .then(setFollowUps)
      .catch(() => setFollowUps([]));
  }

  useEffect(() => {
    refresh();
    window.addEventListener("leads:changed", refresh);
    return () => window.removeEventListener("leads:changed", refresh);
  }, []);

  function openLead(followUp: FollowUp) {
    getLead(followUp.lead.id)
      .then(setSelectedLead)
      .catch(() => {});
  }

  const salesPeak = Math.max(...(sales ?? []).map((entry) => entry.total), 0);

  return (
    <ViewTransition>
      <div className="flex w-full flex-col pb-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-dash-ink" style={headingStyle}>
              Sales overview
            </h1>
            <p className="text-[10px] text-dash-muted">
              {stats?.scope === "own" ? "Your assigned leads" : "All leads"} ·{" "}
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            type="button"
            disabled={!stats}
            onClick={() => stats && downloadSummary(stats, sales ?? [])}
            className="flex h-9 items-center gap-[7px] rounded-[4px] border border-dash-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60"
          >
            <Icon name="download" className="size-4" />
            Export summary
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:gap-5 sm:px-8 lg:grid-cols-4">
          {!stats &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex min-w-0 flex-col gap-2.5 ${panelClass}`}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            ))}

          {stats &&
            buildMetrics(stats).map((metric) => (
              <div key={metric.label} className={`flex min-w-0 flex-col gap-1.5 leading-[1.4] ${panelClass}`}>
                <p className="text-[11px] text-dash-muted">{metric.label}</p>
                <p className="font-serif text-[26px] font-bold text-dash-ink" style={headingStyle}>
                  {metric.value}
                </p>
                <p className="truncate text-[10px] text-primary">{metric.note}</p>
              </div>
            ))}
        </div>

        <div className="flex flex-col gap-6 px-4 pb-6 sm:px-8 lg:flex-row lg:items-start">
          <div className={`flex min-w-0 flex-col gap-4 lg:flex-[2] ${panelClass}`}>
            <div className="flex items-center justify-between leading-[1.4]">
              <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
                Sales performance
              </h2>
              {sales && sales.length > 0 && (
                <p className="text-[10px] text-dash-muted">
                  {monthLabel(sales[0].month)} – {monthLabel(sales[sales.length - 1].month, true)}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
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
          </div>

          <div className={`flex min-w-0 flex-col gap-4 lg:flex-1 ${panelClass}`}>
            <div className="flex items-center justify-between leading-[1.4]">
              <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
                Recent activity
              </h2>
              <p className="text-[10px] text-dash-muted">Latest</p>
            </div>

            {!activity &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-4" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
              ))}

            {activity && activity.length === 0 && (
              <p className="text-xs text-dash-placeholder">No activity yet.</p>
            )}

            {activity?.map((entry) => (
              <div key={`${entry.id}-${entry.kind}`} className="flex items-center gap-3 text-primary">
                <Icon name={activityIcon(entry.task_type)} className="size-4" />
                <div className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[1.4]">
                  <p className="truncate text-xs text-dash-ink">{activityTitle(entry)}</p>
                  <p className="truncate text-[10px] text-dash-muted">
                    {[entry.project, entry.client_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="whitespace-nowrap text-[10px] leading-[1.4] text-dash-muted">
                  {formatActivityTime(entry.at)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between px-4 leading-[1.4] sm:px-8">
          <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
            Priority follow-ups
          </h2>
          <Link href="/tasks" className="text-[11px] text-primary hover:underline">
            View all tasks →
          </Link>
        </div>

        <div className="overflow-x-auto px-4 sm:px-8">
          <table className="w-full min-w-[720px] table-fixed text-left">
            <thead>
              <tr className="h-[54px] border-b border-dash-border text-[10px] font-normal uppercase text-dash-ink">
                <th className="w-[26%] font-normal">Task</th>
                <th className="w-[18%] font-normal">Client / Lead</th>
                <th className="w-[22%] font-normal">Project</th>
                <th className="w-[17%] font-normal">Assignee</th>
                <th className="w-[13%] font-normal">Due</th>
                <th className="w-12 text-[9px] font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!followUps &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="h-[62px] border-b border-dash-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="pr-3">
                        <Skeleton className="h-3 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))}

              {followUps && followUps.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-dash-placeholder">
                    No follow-ups due.
                  </td>
                </tr>
              )}

              {followUps?.map((followUp) => (
                <tr
                  key={followUp.id}
                  onClick={() => openLead(followUp)}
                  className="h-[62px] cursor-pointer border-b border-dash-border text-xs leading-[1.4] text-dash-ink hover:bg-white/60"
                >
                  <td className="pr-3">
                    <p className="truncate">{followUp.text}</p>
                    <p className="mt-[5px] truncate text-[10px] text-dash-muted">
                      {followUp.task_type ? taskLabel(followUp) : "Follow-up"} ·{" "}
                      {PRIORITY_LABELS[followUp.priority]}
                    </p>
                  </td>
                  <td className="pr-3">
                    <p className="truncate">{followUp.lead.client_name}</p>
                    <p className="mt-[5px] truncate text-[10px] text-dash-muted">Lead {followUp.lead.lead_no}</p>
                  </td>
                  <td className="truncate pr-3">{followUp.lead.project?.name ?? "—"}</td>
                  <td className="truncate pr-3">{assigneeName(followUp)}</td>
                  <td className={`truncate pr-3 ${followUp.overdue ? "text-hot" : ""}`}>{formatDue(followUp)}</td>
                  <td>
                    <button
                      type="button"
                      aria-label={`Open lead for ${followUp.lead.client_name}`}
                      className="flex size-6 items-center text-primary"
                    >
                      <Icon name="ellipsis" className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <LeadDetailModal
        key={selectedLead?.id}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onChanged={refresh}
      />
    </ViewTransition>
  );
}
