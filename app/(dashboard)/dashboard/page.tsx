"use client";

import Link from "next/link";
import { useEffect, useState, ViewTransition } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { getPerformance, type Funnel, type FunnelStep, type Performance } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { taskLabel } from "@/lib/tasks";
import { formatDay } from "@/lib/time";

type TaskTab = keyof Performance["tasks"];
type FunnelTab = "calls" | "meetings";
type PaymentTab = "token" | "pdp";

const TASK_TABS: { id: TaskTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
];

const FUNNELS: Record<FunnelTab, { label: string; total: string; steps: [keyof Funnel, string][] }> = {
  calls: {
    label: "Calls",
    total: "Total Qualified Calls",
    steps: [
      ["total", "Dialed"],
      ["connected", "Connected"],
      ["qualified", "Qualified"],
    ],
  },
  meetings: {
    label: "Meetings",
    total: "Total Qualified Meetings",
    steps: [
      ["total", "Held"],
      ["connected", "Attended"],
      ["qualified", "Qualified"],
    ],
  },
};

const CHART_HEIGHT = 232;

const cardClass = "rounded-[4px] bg-white shadow-[0_1px_4px_rgba(16,24,40,0.06)]";

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** "4Y 6M 26D" between the joining date and the day being viewed. */
function tenure(joinedOn: string, until: string) {
  const from = new Date(`${joinedOn.slice(0, 10)}T00:00:00`);
  const to = new Date(`${until}T00:00:00`);
  if (to < from) return null;
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years}Y ${months}M ${days}D`;
}

/** The Todos list narrowed to exactly the tasks one dashboard count stands for. */
function todosHref(tab: TaskTab, taskType: string, date: string) {
  const due = { today: "due_date", overdue: "due_before", upcoming: "due_after" }[tab];
  const type = taskType === "other" ? "" : `&task_type=${taskType}`;
  return `/today?${due}=${date}${type}`;
}

function Hint({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="flex size-3.5 shrink-0 cursor-help items-center justify-center rounded-full bg-border text-[9px] font-bold leading-none text-white"
    >
      i
    </span>
  );
}

function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: ReactNode }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={tab.id === active}
          className={`-mb-px border-b-2 px-3.5 pb-3 text-xs font-bold leading-[1.4] transition-colors ${
            tab.id === active ? "border-cold text-cold" : "border-transparent text-ink hover:text-cold"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FunnelChart({ funnel, labels }: { funnel: Funnel; labels: [keyof Funnel, string][] }) {
  const peak = Math.max(...labels.map(([key]) => funnel[key].unique + funnel[key].repeat), 1);
  // Round the axis up to a step that gives about seven gridlines.
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000].find((size) => peak / size <= 7) ?? 2000;
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => top - i * step);
  const height = (value: number) => (value / top) * CHART_HEIGHT;

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-right text-[10px] leading-none text-muted" style={{ height: CHART_HEIGHT }}>
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {tick}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height: CHART_HEIGHT }}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className={`absolute inset-x-0 border-t ${tick === 0 ? "border-border" : "border-border/60"}`}
              style={{ bottom: height(tick) }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-around">
            {labels.map(([key, label]) => {
              const { unique, repeat }: FunnelStep = funnel[key];
              return (
                <div
                  key={key}
                  title={`${label}: ${unique + repeat} (${unique} unique, ${repeat} repeat)`}
                  className="flex w-5 flex-col-reverse gap-px"
                >
                  <div className="bg-indigo-600" style={{ height: height(unique) }} />
                  <div className="bg-indigo-300" style={{ height: height(repeat) }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-6 mt-2 flex justify-around text-[10px] leading-[1.4] text-muted">
        {labels.map(([key, label]) => (
          <span key={key}>{label}</span>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-10 text-[10px] leading-[1.4] text-muted">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-indigo-300" />
          Repeat
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-indigo-600" />
          Unique
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [date, setDate] = useState(localToday);
  const [data, setData] = useState<Performance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskTab, setTaskTab] = useState<TaskTab>("today");
  const [funnelTab, setFunnelTab] = useState<FunnelTab>("calls");
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("token");

  useEffect(() => {
    let cancelled = false;
    getPerformance(date)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the dashboard.");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const profile = data?.profile;
  const subtitle = profile
    ? [profile.team, profile.office, profile.joined_on && tenure(profile.joined_on, date)].filter(Boolean)
    : [];
  const cards = data
    ? [
        { label: "Tokens", hint: "Token payments received this month", value: String(data.cards.tokens) },
        { label: "PDP", hint: "Partial down payments received this month", value: String(data.cards.pdp) },
        { label: "Closed Won", hint: "Leads moved to Sold this month", value: String(data.cards.closed_won) },
        {
          label: "Achieved Revenue",
          hint: "Value of the leads sold this month",
          value: data.cards.achieved_revenue ? formatMoney(data.cards.achieved_revenue).replace("PKR ", "") : "0",
        },
        {
          label: "Project Unit Target",
          hint: "Units sold this month against the target set in Reports",
          value: `${data.cards.closed_won}/${data.cards.unit_target}`,
        },
      ]
    : null;
  const funnel = FUNNELS[funnelTab];
  const qualified = data ? data[funnelTab].qualified : null;
  const pending = data?.payments[paymentTab];

  return (
    <ViewTransition>
      <div className="flex w-full flex-col gap-4 bg-sidebar px-4 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold leading-[1.3] text-ink">
              {profile ? `${profile.first_name} ${profile.last_name}` : "Dashboard"}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-[1.4] text-muted">
              {subtitle.map((part, index) => (
                <span key={index} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true">•</span>}
                  {part}
                </span>
              ))}
              {data?.scope === "system" && subtitle.length > 0 && <span>• All staff</span>}
            </p>
          </div>
          <label className={`${cardClass} relative flex h-10 w-[156px] items-center justify-between gap-2 px-3 text-xs text-ink`}>
            {formatDay(`${date}T00:00:00`)}
            <Icon name="calendar" className="size-3.5 text-muted" />
            <input
              type="date"
              value={date}
              max={localToday()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Dashboard date"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>

        {error && <p className="rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot">{error}</p>}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {(cards ?? Array.from({ length: 5 }, () => null)).map((card, index) => (
            <div key={card?.label ?? index} className={`${cardClass} flex min-h-[82px] items-center justify-between gap-3 px-5 py-4`}>
              {card ? (
                <>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold leading-[1.4] text-ink">
                      <span className="truncate">{card.label}</span>
                      <Hint text={card.hint} />
                    </p>
                    <p className="mt-0.5 text-[11px] leading-[1.4] text-muted">Month To Date</p>
                  </div>
                  <p className="shrink-0 text-xl font-bold text-ink">{card.value}</p>
                </>
              ) : (
                <Skeleton className="h-8 w-full" />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className={`${cardClass} flex flex-col gap-6 p-5`}>
            <Tabs tabs={TASK_TABS} active={taskTab} onChange={setTaskTab} />
            <ul className="flex flex-col px-3.5">
              {data ? (
                data.tasks[taskTab].map((task) => (
                  <li key={task.task_type} className="border-b border-border/60 last:border-b-0">
                    <Link
                      href={todosHref(taskTab, task.task_type, date)}
                      className={`flex h-[29px] items-center justify-between gap-3 text-xs uppercase leading-[1.4] ${
                        task.count ? "text-cold hover:underline" : "text-cold/60"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon name="check-circle" className="size-3" />
                        <span className="truncate">
                          {task.task_type === "other"
                            ? "Other"
                            : taskLabel({ text: task.task_type, task_type: task.task_type, sub_task: null })}
                        </span>
                      </span>
                      {task.count ? (
                        <span className="normal-case text-ink">{task.count}</span>
                      ) : (
                        <span title="Nothing due" aria-label="Nothing due">
                          🎉
                        </span>
                      )}
                    </Link>
                  </li>
                ))
              ) : (
                <Skeleton className="h-40 w-full" />
              )}
            </ul>
          </section>

          <section className={`${cardClass} flex flex-col gap-5 p-5`}>
            <Tabs
              tabs={(Object.keys(FUNNELS) as FunnelTab[]).map((id) => ({ id, label: FUNNELS[id].label }))}
              active={funnelTab}
              onChange={setFunnelTab}
            />
            <div className="text-right">
              <p className="text-[11px] leading-[1.4] text-muted">{funnel.total}</p>
              <p className="mt-1 text-base font-bold text-ink">{qualified ? qualified.unique + qualified.repeat : "—"}</p>
            </div>
            {data ? <FunnelChart funnel={data[funnelTab]} labels={funnel.steps} /> : <Skeleton className="h-60 w-full" />}
          </section>

          <section className={`${cardClass} flex flex-col gap-5 p-5`}>
            <Tabs tabs={[{ id: "log", label: "Activity Logs" }]} active="log" onChange={() => {}} />
            <div className="max-h-[310px] overflow-y-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="sticky top-0 bg-cream text-[11px] uppercase text-muted">
                  <tr className="h-9">
                    <th className="pl-5 font-bold">Time</th>
                    <th className="font-bold" title="Unique qualified calls">
                      UQC
                    </th>
                    <th className="font-bold">Calls</th>
                    <th className="font-bold" title="Unique meetings">
                      U.Met
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.activity ?? []).map((row) => {
                    const hour = String(row.hour).padStart(2, "0");
                    return (
                      <tr key={row.hour} className="h-[34px] odd:bg-white even:bg-sidebar">
                        <td className="pl-5">
                          {hour}:00 - {hour}:59
                        </td>
                        <td>{row.uqc}</td>
                        <td>{row.calls}</td>
                        <td>{row.umet}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!data && <Skeleton className="mt-2 h-40 w-full" />}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,10fr)]">
          <section className={`${cardClass} flex flex-col pb-2`}>
            <h2 className="px-5 py-5 text-sm font-bold text-ink">Payments</h2>
            {[
              { label: "Expected", hint: "Everything still owed on open payments", value: data?.payments.expected, tone: "border-emerald-500 bg-emerald-50" },
              { label: "Overdue", hint: "The part of that already past its due date", value: data?.payments.overdue, tone: "border-orange-400 bg-orange-50" },
              { label: "Received", hint: "Collected this month to date", value: data?.payments.received, tone: "border-cold bg-cold/5" },
            ].map((row) => (
              <div key={row.label} className={`mb-2 flex items-center justify-between gap-3 border-l-2 px-5 py-3 ${row.tone}`}>
                <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Icon name="receipt" className="size-4 text-emerald-600" />
                  {row.label}
                  <Hint text={row.hint} />
                </p>
                <p className="text-xs font-bold text-ink">{row.value == null ? "—" : formatMoney(row.value)}</p>
              </div>
            ))}
          </section>

          <section className={`${cardClass} flex min-w-0 flex-col gap-5 p-5`}>
            <Tabs
              tabs={[
                { id: "token" as const, label: <>Token <span className="font-normal text-muted">({formatMoney(data?.payments.token.total ?? 0)})</span></> },
                { id: "pdp" as const, label: <>PDP <span className="font-normal text-muted">({formatMoney(data?.payments.pdp.total ?? 0)})</span></> },
              ]}
              active={paymentTab}
              onChange={setPaymentTab}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs text-ink">
                <thead className="bg-cream text-[11px] uppercase text-muted">
                  <tr className="h-9">
                    <th className="pl-5 font-bold">Expected date</th>
                    <th className="font-bold">Client</th>
                    <th className="font-bold">Project</th>
                    <th className="font-bold">Unit</th>
                    <th className="font-bold">Payments (PKR)</th>
                    <th className="font-bold">Expiry</th>
                    <th className="font-bold">User</th>
                  </tr>
                </thead>
                <tbody>
                  {pending?.rows.map((row) => {
                    const daysLeft = Math.round(
                      (new Date(`${row.due_date}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime()) / 86_400_000,
                    );
                    return (
                      <tr key={row.id} className="h-[38px] odd:bg-white even:bg-sidebar">
                        <td className="pl-5">{formatDay(`${row.due_date}T00:00:00`)}</td>
                        <td className="max-w-[160px] truncate pr-3">{row.client_name}</td>
                        <td className="max-w-[180px] truncate pr-3">{row.project ?? "—"}</td>
                        <td>{row.unit ?? "—"}</td>
                        <td>{row.outstanding.toLocaleString()}</td>
                        <td className={daysLeft < 0 ? "text-hot" : ""}>
                          {daysLeft < 0 ? `${-daysLeft}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                        </td>
                        <td className="max-w-[150px] truncate">{row.staff ?? "Unassigned"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pending?.rows.length === 0 && (
                <p className="py-8 text-center text-xs text-dash-placeholder">Nothing outstanding here. 🎉</p>
              )}
              {!data && <Skeleton className="mt-2 h-24 w-full" />}
            </div>
          </section>
        </div>
      </div>
    </ViewTransition>
  );
}
