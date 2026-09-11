"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { PhoneIcon, PlusIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { getFollowUps, setFollowUpCompleted, type FollowUp } from "@/lib/api";
import { useIsAdmin } from "@/lib/session";

const STAGE_BADGES: Record<string, { label: string; className: string }> = {
  inquiry: { label: "Inquiry", className: "bg-stage-inquiry/10 text-stage-inquiry" },
  contacted: { label: "Contacted", className: "bg-stage-contacted/10 text-stage-contacted" },
  site_visit: { label: "Site Visit", className: "bg-stage-site-visit/10 text-stage-site-visit" },
  negotiation: { label: "Negotiation", className: "bg-stage-negotiation/10 text-stage-negotiation" },
  booked: { label: "Booked", className: "bg-stage-booked/10 text-stage-booked" },
  sold: { label: "Sold", className: "bg-stage-sold/10 text-stage-sold" },
  lost: { label: "Lost", className: "bg-stage-lost/10 text-stage-lost" },
};

function formatTime(due: string) {
  const [hours, minutes] = due.split(":");
  const hour = Number(hours);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, "0")}:${minutes} ${suffix}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

/** How far past due, in whole days — 0 means it slipped earlier today. */
function daysOverdue(followUp: FollowUp) {
  const due = new Date(`${followUp.due_date}T${followUp.due_time}`);
  return Math.floor((Date.now() - due.getTime()) / 86_400_000);
}

function overdueLabel(followUp: FollowUp) {
  const days = daysOverdue(followUp);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day late";
  return `${days} days late`;
}

/** Column header already says "Completed", so the cell carries just the stamp. */
function completedLabel(completedAt: string | null) {
  if (!completedAt) return "—";
  const at = new Date(completedAt);
  const date = at.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const time = at.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

function upcomingLabel(followUp: FollowUp) {
  const due = new Date(`${followUp.due_date}T${followUp.due_time}`);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

type Variant = "overdue" | "upcoming" | "completed";

export default function TasksPage() {
  const admin = useIsAdmin();

  const [overdue, setOverdue] = useState<FollowUp[]>([]);
  const [upcoming, setUpcoming] = useState<FollowUp[]>([]);
  const [completed, setCompleted] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overdueList, upcomingList, completedList] = await Promise.all([
        getFollowUps({ status: "overdue", search: debouncedSearch || undefined, limit: 100 }),
        getFollowUps({ status: "upcoming", search: debouncedSearch || undefined, limit: 100 }),
        getFollowUps({ status: "completed", search: debouncedSearch || undefined, limit: 100 }),
      ]);
      setOverdue(overdueList);
      setUpcoming(upcomingList);
      setCompleted(completedList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
      setOverdue([]);
      setUpcoming([]);
      setCompleted([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(followUp: FollowUp) {
    const next = !followUp.completed;
    // Moves between lists optimistically, then refetches so ordering is the server's.
    if (next) {
      setOverdue((prev) => prev.filter((f) => f.id !== followUp.id));
      setUpcoming((prev) => prev.filter((f) => f.id !== followUp.id));
      setCompleted((prev) => [{ ...followUp, completed: true }, ...prev]);
    } else {
      setCompleted((prev) => prev.filter((f) => f.id !== followUp.id));
      const restored = { ...followUp, completed: false };
      // `overdue` is computed server-side; the refetch below settles any drift.
      if (followUp.overdue) setOverdue((prev) => [...prev, restored]);
      else setUpcoming((prev) => [...prev, restored]);
    }

    try {
      await setFollowUpCompleted(followUp.id, next);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that task.");
      void load();
    }
  }

  function renderRow(followUp: FollowUp, i: number, variant: Variant) {
    const stage = STAGE_BADGES[followUp.lead.stage];
    const location = [followUp.lead.area, followUp.lead.city].filter(Boolean).join(", ");
    const isCompleted = variant === "completed";
    const timingTone = variant === "overdue" ? "text-hot" : "text-dash-muted";
    const timingLabel =
      variant === "completed"
        ? completedLabel(followUp.completed_at)
        : variant === "overdue"
          ? overdueLabel(followUp)
          : upcomingLabel(followUp);
    const dueAt = `Due ${formatDate(followUp.due_date)} · ${formatTime(followUp.due_time)}`;
    return (
      <div
        key={followUp.id}
        className={`flex items-start gap-3 px-4 py-3 md:items-center md:gap-4 md:px-6 ${i > 0 ? "border-t border-dash-border" : ""} ${
          isCompleted ? "opacity-60" : ""
        }`}
      >
        <div className="flex w-6 shrink-0 items-center justify-center pt-1 md:w-10 md:pt-0">
          <input
            type="checkbox"
            checked={followUp.completed}
            onChange={() => handleToggle(followUp)}
            aria-label={`Mark "${followUp.text}" done`}
            className="size-4 accent-warm"
          />
        </div>

        <div className="hidden w-[150px] shrink-0 md:block">
          <p className={`text-[11.5px] font-semibold ${timingTone}`}>{timingLabel}</p>
          <p className="text-[11px] text-dash-muted">{dueAt}</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span
              className="font-serif text-base font-semibold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {followUp.lead.client_name}
            </span>
            <span className={`text-sm text-dash-muted ${isCompleted ? "line-through" : ""}`}>
              — {followUp.text}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-dash-muted">
            {/* Timing and stage get their own columns from md up; below that they ride in this line. */}
            <span className={`font-semibold md:hidden ${timingTone}`}>{timingLabel}</span>
            <span className="md:hidden">·</span>
            <span>{location || followUp.lead.client_number}</span>
            {admin && (
              <>
                <span>·</span>
                <span className="rounded bg-badge-neutral px-1.5 py-0.5 text-[11px] text-dash-ink">
                  {followUp.lead.assigned_to
                    ? `${followUp.lead.assigned_to.first_name} ${followUp.lead.assigned_to.last_name}`
                    : "Unassigned"}
                </span>
              </>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.315px] md:hidden ${
                stage?.className ?? "bg-badge-neutral text-dash-muted"
              }`}
            >
              {stage?.label ?? followUp.lead.stage}
            </span>
          </div>
          <p className="text-[11px] text-dash-muted md:hidden">{dueAt}</p>
        </div>

        <div className="hidden w-[120px] shrink-0 md:block">
          <span
            className={`rounded px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.315px] ${
              stage?.className ?? "bg-badge-neutral text-dash-muted"
            }`}
          >
            {stage?.label ?? followUp.lead.stage}
          </span>
        </div>

        <div className="flex w-9 shrink-0 items-center justify-end gap-3 pt-0.5 md:w-[100px] md:pt-0">
          <a
            href={`tel:${followUp.lead.client_number}`}
            className="text-muted"
            aria-label={`Call ${followUp.lead.client_name}`}
          >
            <PhoneIcon className="size-[15px]" />
          </a>
        </div>
      </div>
    );
  }

  function renderSection(title: string, items: FollowUp[], variant: Variant, emptyText: string) {
    const columnLabel =
      variant === "completed" ? "Completed" : variant === "overdue" ? "Overdue by" : "Due in";
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2
            className="font-serif text-xl font-semibold text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {title}
          </h2>
          {!isLoading && (
            <span className="text-sm text-dash-muted">
              {items.length} task{items.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-dash-border bg-sidebar shadow-sm">
          <div className="hidden gap-4 border-b border-dash-border bg-dash-bg px-6 py-4 md:flex">
            <span className="w-10 shrink-0" />
            <p className="w-[150px] shrink-0 text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">
              {columnLabel}
            </p>
            <p className="flex-1 text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">Task</p>
            <p className="w-[120px] shrink-0 text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">
              Stage
            </p>
            <p className="w-[100px] shrink-0 text-right text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">
              Actions
            </p>
          </div>

          <div className="bg-white">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 md:gap-4 md:px-6 ${i > 0 ? "border-t border-dash-border" : ""}`}
                >
                  <div className="flex w-6 shrink-0 justify-center md:w-10">
                    <Skeleton className="size-4" />
                  </div>
                  <div className="hidden w-[150px] shrink-0 flex-col gap-1.5 md:flex">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-full max-w-64" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="hidden w-[120px] shrink-0 md:block">
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="flex w-9 shrink-0 justify-end md:w-[100px]">
                    <Skeleton className="size-4" />
                  </div>
                </div>
              ))}

            {!isLoading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-dash-placeholder md:px-6">{emptyText}</p>
            )}

            {!isLoading && items.map((followUp, i) => renderRow(followUp, i, variant))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1
            className="font-serif text-[28px] font-semibold leading-none text-dash-ink sm:text-[34px]"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Tasks
          </h1>
          {!isLoading && (
            <p className="text-sm text-dash-muted">
              {overdue.length} overdue · {upcoming.length} upcoming · {completed.length} completed
            </p>
          )}
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks or clients..."
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-4 text-sm text-dash-ink placeholder:text-dash-muted focus:outline-none"
            />
          </div>
          {admin && (
            <button
              type="button"
              onClick={() => setIsNewTaskOpen(true)}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
            >
              <PlusIcon className="size-3" />
              Add task
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

      {renderSection(
        "Overdue",
        overdue,
        "overdue",
        debouncedSearch ? "No overdue tasks match that search." : "Nothing overdue. All caught up.",
      )}

      {renderSection(
        "Upcoming",
        upcoming,
        "upcoming",
        debouncedSearch ? "No upcoming tasks match that search." : "Nothing scheduled ahead.",
      )}

      {renderSection(
        "Completed",
        completed,
        "completed",
        debouncedSearch ? "No completed tasks match that search." : "Nothing completed yet.",
      )}
    </div>

    {isNewTaskOpen && (
      <NewTaskModal onClose={() => setIsNewTaskOpen(false)} onCreated={() => void load()} />
    )}
    </ViewTransition>
  );
}
