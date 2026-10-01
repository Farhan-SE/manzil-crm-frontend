"use client";

import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";
import { ChevronDownIcon } from "@/components/icons/DashboardIcons";
import { Select, type SelectOption } from "@/components/ui/Select";
import {
  getFollowUps,
  getPartnerProjects,
  getUnits,
  getWeekLoad,
  logTask,
  type FollowUp,
  type Lead,
  type LeadTemperature,
  type Unit,
} from "@/lib/api";
import { UNIT_STATUSES } from "@/lib/inventory";
import {
  NEXT_TASKS,
  PAYMENT_SUB_TASKS,
  PAYMENT_TASKS,
  SUB_TASKS,
  SUGGESTED_COMMENTS,
  TASK_TYPES,
  TERMINAL_NEXT_TASKS,
  taskLabel,
} from "@/lib/tasks";

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

const TEMP_STYLES: Record<LeadTemperature, string> = {
  HOT: "border-hot text-hot",
  WARM: "border-warm text-warm",
  COLD: "border-cold text-cold",
};

const NO_PROJECT: SelectOption = { id: "", name: "No project" };
const NO_UNIT: SelectOption = { id: "", name: "No unit" };

function unitStatusLabel(status: string) {
  return UNIT_STATUSES.find((s) => s.id === status)?.label ?? status;
}

function toDateInput(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function toTimeInput(date: Date) {
  return date.toTimeString().slice(0, 5);
}

function daysAgo(followUp: FollowUp) {
  const done = new Date(followUp.completed_at ?? `${followUp.due_date}T${followUp.due_time}`);
  const days = Math.floor((Date.now() - done.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function loadClass(count: number) {
  if (count === 0) return "text-dash-muted";
  if (count <= 3) return "text-stage-sold";
  return count <= 6 ? "text-warm" : "text-hot";
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-dash-muted">
        {label}
        {required && <span className="text-hot"> *</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-dash-border pb-2 text-xs font-bold uppercase tracking-[1px] text-dash-muted">
      {children}
    </h3>
  );
}

export function LogTaskModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Captured once so the defaults and the 7-day strip don't shift while the form is open.
  const [now] = useState(() => new Date());
  const today = toDateInput(now);

  const [taskType, setTaskType] = useState("call");
  const [subTask, setSubTask] = useState("followed_up");
  const [completedDate, setCompletedDate] = useState(today);
  const [completedTime, setCompletedTime] = useState(() => toTimeInput(now));
  const [comment, setComment] = useState("");

  const [nextTask, setNextTask] = useState("");
  const [deadlineDate, setDeadlineDate] = useState(() => toDateInput(new Date(now.getTime() + 86_400_000)));
  const [deadlineTime, setDeadlineTime] = useState(() => toTimeInput(now));
  const [projectId, setProjectId] = useState(lead.project_id ?? "");
  const [unitId, setUnitId] = useState(lead.unit_id ?? "");
  const [units, setUnits] = useState<Unit[]>([]);
  const [temperature, setTemperature] = useState<LeadTemperature>(lead.temperature);

  const [history, setHistory] = useState<FollowUp[]>([]);
  const [projects, setProjects] = useState<SelectOption[]>([]);
  const [weekLoad, setWeekLoad] = useState<Record<string, number>>({});
  const [showComments, setShowComments] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Each piece is optional context — the form still works if one of them fails to load.
    getFollowUps({ lead_id: lead.id })
      .then((list) => {
        if (cancelled) return;
        setHistory(list);
        // A payment that was scheduled last time is most likely what's being logged now.
        const planned = list.find((f) => !f.completed)?.task_type;
        if (planned && planned in PAYMENT_TASKS) {
          setTaskType(planned);
          setSubTask("received");
        }
      })
      .catch(() => {});
    getPartnerProjects()
      .then((list) => !cancelled && setProjects(list.map((p) => ({ id: p.id, name: p.project_name }))))
      .catch(() => {});
    getWeekLoad(today)
      .then((rows) => !cancelled && setWeekLoad(Object.fromEntries(rows.map((r) => [r.date, r.count]))))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lead.id, today]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    getUnits({ project_id: projectId, limit: 500 })
      .then((res) => !cancelled && setUnits(res.data))
      .catch(() => !cancelled && setUnits([]));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const isPaymentTask = taskType in PAYMENT_TASKS;
  // Only units still on the market, plus any this lead already holds.
  const unitOptions: SelectOption[] = projectId
    ? units
        .filter((u) => u.project_id === projectId && (u.status === "available" || u.lead?.id === lead.id))
        .map((u) => ({ id: u.id, name: `${u.unit_number} · ${unitStatusLabel(u.status)}` }))
    : [];
  const selectedUnit = units.find((u) => u.id === unitId);
  const reachedStatus =
    nextTask === "closed_won" ? "sold" : subTask === "received" ? PAYMENT_TASKS[taskType] : undefined;

  function handleTaskTypeChange(next: string) {
    setTaskType(next);
    // The two kinds of task have different outcomes, so the sub-task can't carry over.
    if ((next in PAYMENT_TASKS) !== isPaymentTask) setSubTask(next in PAYMENT_TASKS ? "received" : "followed_up");
  }

  const done = history
    .filter((f) => f.completed)
    .sort((a, b) => (b.completed_at ?? b.due_date).localeCompare(a.completed_at ?? a.due_date));
  const lastTask = done[0];
  // getFollowUps returns a lead's follow-ups soonest-due first.
  const plannedNext = history.find((f) => !f.completed);

  const isTerminal = TERMINAL_NEXT_TASKS.includes(nextTask);
  const week = Array.from({ length: 7 }, (_, i) => new Date(now.getTime() + i * 86_400_000));

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nextTask) return setError("Select the next task.");
    if (isPaymentTask && subTask === "received" && !unitId) {
      return setError("Select the unit this payment is for.");
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await logTask({
        lead_id: lead.id,
        task_type: taskType,
        sub_task: subTask,
        completed_date: completedDate,
        completed_time: completedTime,
        comment,
        next_task: nextTask,
        deadline_date: isTerminal ? undefined : deadlineDate,
        deadline_time: isTerminal ? undefined : deadlineTime,
        project_id: projectId || undefined,
        unit_id: unitId || undefined,
        temperature,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-dash-border px-4 py-4 sm:px-6">
          <h2
            className="font-serif text-2xl font-bold text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Add task
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-5 sm:px-6">
          <section className="flex flex-col gap-3">
            <SectionTitle>Client details</SectionTitle>
            <div className="rounded-xl border border-dash-border bg-dash-bg/50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs text-dash-muted">Client</p>
                  <p className="truncate text-sm font-semibold text-dash-ink">
                    {lead.client_name}
                    <span className="ml-2 font-normal text-stage-inquiry">#{lead.lead_no}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-dash-muted">Interested project</p>
                  <p className="truncate text-sm text-dash-ink">
                    {lead.project?.name ?? "—"}
                    {lead.unit && (
                      <span className="text-dash-muted">
                        {" "}
                        · {lead.unit.unit_number} ({unitStatusLabel(lead.unit.status)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-dash-muted">Last task</p>
                  <p className="truncate text-sm text-dash-ink">
                    {lastTask ? `${taskLabel(lastTask)} · ${daysAgo(lastTask)}` : "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-dash-muted">Planned next task</p>
                  <p className="truncate text-sm text-dash-ink">
                    {plannedNext ? taskLabel(plannedNext) : "Do Nothing"}
                  </p>
                </div>
              </div>

              {done.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowComments((v) => !v)}
                    aria-expanded={showComments}
                    className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-semibold text-stage-inquiry"
                  >
                    {showComments ? "Hide" : "Show"} last task comments
                    <ChevronDownIcon
                      className={`size-2 transition-transform ${showComments ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showComments && (
                    <ul className="mt-3 flex flex-col gap-2 border-t border-dash-border pt-3">
                      {done.map((f) => (
                        <li key={f.id} className="text-sm text-dash-ink">
                          <span className="text-xs text-dash-muted">
                            {f.task_type ? `${taskLabel(f)} · ` : ""}
                            {daysAgo(f)}
                          </span>
                          <p className="whitespace-pre-wrap">{f.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionTitle>Current task</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Task" htmlFor="task-type" required>
                <Select id="task-type" value={taskType} onChange={handleTaskTypeChange} options={TASK_TYPES} />
              </Field>
              <Field label="Sub-task" htmlFor="task-sub" required>
                <Select
                  id="task-sub"
                  value={subTask}
                  onChange={setSubTask}
                  options={isPaymentTask ? PAYMENT_SUB_TASKS : SUB_TASKS}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Completion date" htmlFor="task-completed-date" required>
                <input
                  id="task-completed-date"
                  type="date"
                  required
                  max={today}
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Completion time" htmlFor="task-completed-time" required>
                <input
                  id="task-completed-time"
                  type="time"
                  required
                  value={completedTime}
                  onChange={(e) => setCompletedTime(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Attachments">
                {/* Placeholder until file storage is wired up — nothing is uploaded yet. */}
                <div
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center justify-between rounded-xl border border-dashed border-dash-border bg-white px-4 py-2 text-sm text-dash-placeholder"
                >
                  + Select file
                  <span className="text-[10px] uppercase tracking-[0.45px]">Coming soon</span>
                </div>
              </Field>
            </div>

            <Field label="Comment" htmlFor="task-comment" required>
              <textarea
                id="task-comment"
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter comment"
                className={`${inputClass} resize-y`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-dash-muted">Suggested comments:</span>
                {SUGGESTED_COMMENTS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => setComment(text)}
                    className="rounded-full border border-dash-border px-2.5 py-0.5 text-xs text-dash-ink transition-colors hover:bg-dash-bg"
                  >
                    + {text}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <section className="flex flex-col gap-4">
            <SectionTitle>Next task</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Next task" htmlFor="task-next" required>
                <Select
                  id="task-next"
                  value={nextTask}
                  onChange={setNextTask}
                  options={NEXT_TASKS}
                  placeholder="Select next task"
                />
                {nextTask === "closed_won" && (
                  <p className="text-xs text-dash-muted">This lead&apos;s stage will be set to Sold.</p>
                )}
              </Field>

              {!isTerminal && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Deadline" htmlFor="task-deadline-date" required>
                    <input
                      id="task-deadline-date"
                      type="date"
                      required
                      min={today}
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Deadline time" htmlFor="task-deadline-time" required>
                    <input
                      id="task-deadline-time"
                      type="time"
                      required
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </div>

            {!isTerminal && (
              <div className="grid grid-cols-7 gap-1.5">
                {week.map((day) => {
                  const key = toDateInput(day);
                  const count = weekLoad[key] ?? 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDeadlineDate(key)}
                      title={`${count} open task${count === 1 ? "" : "s"} due`}
                      className={`flex flex-col items-center rounded-lg border bg-white py-1.5 transition-colors ${
                        key === deadlineDate ? "border-dash-ink" : "border-dash-border hover:bg-dash-bg"
                      }`}
                    >
                      <span className="text-[10px] uppercase text-dash-muted">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-sm font-semibold text-dash-ink">{day.getDate()}</span>
                      <span className={`text-[10px] font-bold ${loadClass(count)}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Project" htmlFor="task-project">
                <Select
                  id="task-project"
                  value={projectId}
                  onChange={(next) => {
                    setProjectId(next);
                    // A unit belongs to one project, so it can't survive a project change.
                    setUnitId("");
                  }}
                  options={[NO_PROJECT, ...projects]}
                />
              </Field>
              <Field label="Unit" htmlFor="task-unit" required={isPaymentTask && subTask === "received"}>
                <Select
                  id="task-unit"
                  value={unitId}
                  onChange={setUnitId}
                  options={[NO_UNIT, ...unitOptions]}
                  placeholder={projectId ? "Select unit" : "Select a project first"}
                />
                {selectedUnit && reachedStatus && (
                  <p className="text-xs text-dash-muted">
                    Unit {selectedUnit.unit_number} will be marked {unitStatusLabel(reachedStatus)}.
                  </p>
                )}
              </Field>
              <Field label="Leads classification" required>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TEMP_STYLES) as LeadTemperature[]).map((temp) => (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => setTemperature(temp)}
                      aria-pressed={temperature === temp}
                      className={`rounded-xl border bg-white py-2 text-sm font-bold ${
                        temperature === temp ? TEMP_STYLES[temp] : "border-dash-border text-dash-ink"
                      }`}
                    >
                      {temp.charAt(0) + temp.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>

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
              {isSubmitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
