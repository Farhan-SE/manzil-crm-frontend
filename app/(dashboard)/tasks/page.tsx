"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { FilterBar, FilterDate, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
import { RowMenu } from "@/components/list/RowMenu";
import { StatusBadge, type StatusTone } from "@/components/list/StatusBadge";
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
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getAgents,
  getTasks,
  setFollowUpStarred,
  setTaskStatus,
  type Agent,
  type FollowUp,
  type TasksQuery,
  type TaskStatus,
  type TaskTab,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useIsAdmin } from "@/lib/session";
import { NEXT_TASKS, TASK_TYPES, taskLabel } from "@/lib/tasks";
import { formatClock, formatDay } from "@/lib/time";

type Filters = { search: string; assignedToId: string; taskType: string; dueFrom: string; dueTo: string };

const EMPTY_FILTERS: Filters = { search: "", assignedToId: "", taskType: "", dueFrom: "", dueTo: "" };

const TABS: { id: TaskTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
];

const STATUSES: Record<TaskStatus, { label: string; tone: StatusTone }> = {
  open: { label: "Open", tone: "neutral" },
  in_progress: { label: "In progress", tone: "warning" },
  scheduled: { label: "Scheduled", tone: "neutral" },
  overdue: { label: "Overdue", tone: "danger" },
  completed: { label: "Completed", tone: "success" },
};

// Next tasks reuse some task-type ids; keep the first label for each.
const ALL_TASK_TYPES = [...TASK_TYPES, ...NEXT_TASKS].filter(
  (option, i, all) => option.id !== "do_nothing" && all.findIndex((other) => other.id === option.id) === i,
);

const EXPORT_LIMIT = 1000;

const COLUMN_COUNT = 8;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const headerActionClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-dash-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60";

function taskId(task: FollowUp) {
  return `TSK-${task.task_no}`;
}

function assigneeName(task: FollowUp) {
  const agent = task.lead.assigned_to;
  return agent ? `${agent.first_name} ${agent.last_name}`.trim() : "Unassigned";
}

export default function TasksPage() {
  const admin = useIsAdmin();

  const [tasks, setTasks] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<TaskTab, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<TaskTab>("all");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  useEffect(() => {
    if (!admin) return;
    getAgents().then(setAgents).catch(() => {});
  }, [admin]);

  const buildQuery = useCallback(
    (): TasksQuery => ({
      status: tab,
      search: filters.search.trim() || undefined,
      assigned_to_id: filters.assignedToId ? Number(filters.assignedToId) : undefined,
      task_type: filters.taskType || undefined,
      due_from: filters.dueFrom || undefined,
      due_to: filters.dueTo || undefined,
      starred: favouritesOnly ? "true" : undefined,
      sort,
    }),
    [tab, filters, favouritesOnly, sort],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getTasks({ ...buildQuery(), page, limit: pageSize });
      setTasks(res.data);
      setTotal(res.total);
      setStatusCounts(res.status_counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
      setTasks([]);
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
      setError(err instanceof Error ? err.message : "Couldn't update that task.");
    }
    void load();
  }

  async function exportTasks() {
    try {
      const res = await getTasks({ ...buildQuery(), page: 1, limit: EXPORT_LIMIT });
      downloadCsv(`tasks-${new Date().toLocaleDateString("en-CA")}.csv`, [
        ["Task ID", "Type", "Subject", "Project", "Client", "Lead", "Assignee", "Due date", "Due time", "Status"],
        ...res.data.map((task) => [
          taskId(task),
          task.task_type ? taskLabel(task) : "",
          task.text,
          task.lead.project?.name ?? "",
          task.lead.client_name,
          String(task.lead.lead_no),
          assigneeName(task),
          task.due_date,
          task.due_time,
          STATUSES[task.status].label,
        ]),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export tasks.");
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
  const allSelected = tasks.length > 0 && tasks.every((task) => selected.has(task.id));

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-dash-ink" style={headingStyle}>
              Tasks
            </h1>
            <p className="text-[10px] text-dash-muted">
              {admin ? "All tasks" : "Tasks on your leads"} ·{" "}
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {admin && (
              <button type="button" onClick={() => setIsNewTaskOpen(true)} className={headerActionClass}>
                <PlusIcon className="size-2.5" />
                Add task
              </button>
            )}
            <button
              type="button"
              onClick={() => void exportTasks()}
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
              placeholder="Task ID or subject"
            />
          </FilterField>
          {admin && (
            <FilterField label="Assigned Staff">
              <FilterSelect
                value={draft.assignedToId}
                onChange={(e) => setDraft({ ...draft, assignedToId: e.target.value })}
                placeholder="Select Assignee"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.first_name} {agent.last_name}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>
          )}
          <FilterField label="Task Type">
            <FilterSelect
              value={draft.taskType}
              onChange={(e) => setDraft({ ...draft, taskType: e.target.value })}
              placeholder="Select Task Type"
            >
              {ALL_TASK_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Due Date">
            <FilterDate
              value={draft.dueFrom}
              onChange={(e) => setDraft({ ...draft, dueFrom: e.target.value })}
              placeholder="Select Date Range"
              aria-label="Due from"
            />
            <span className="text-xs text-placeholder">–</span>
            <FilterDate
              value={draft.dueTo}
              onChange={(e) => setDraft({ ...draft, dueTo: e.target.value })}
              placeholder="To"
              aria-label="Due to"
            />
          </FilterField>
        </FilterBar>

        <StatusTabs
          tabs={TABS.map((entry) => ({ ...entry, count: statusCounts?.[entry.id] ?? null }))}
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
                    aria-label="Select all tasks"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(tasks.map((task) => task.id)))}
                    className={checkboxClass}
                  />
                </th>
                <th className={`${headCellClass} w-[96px] lg:w-[13%]`}>Task ID / Type</th>
                <th className={headCellClass}>Subject / Project</th>
                <th className={`${headCellClass} hidden w-[17%] lg:table-cell`}>Client / Lead</th>
                <th className={`${headCellClass} hidden w-[17%] lg:table-cell`}>Staff (Assignee)</th>
                <th className={`${headCellClass} hidden w-[14%] lg:table-cell`}>Due date</th>
                <th className={`${headCellClass} w-[96px] lg:w-[11%]`}>Status</th>
                <th className={`${headCellClass} w-[40px] text-[9px] lg:w-[5%]`}>Actions</th>
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

              {!isLoading && tasks.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {isFiltered ? "No tasks match those filters." : "No tasks yet."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                tasks.map((task) => {
                  const status = STATUSES[task.status];
                  const agent = task.lead.assigned_to;
                  return (
                    <tr key={task.id} className={`${rowClass} !h-[74px]`}>
                      <td className="hidden lg:table-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${taskId(task)}`}
                          checked={selected.has(task.id)}
                          onChange={() => toggleSelected(task.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pr-3">
                        <p>{taskId(task)}</p>
                        <p className={subTextClass}>{task.task_type ? taskLabel(task) : "Follow-up"}</p>
                      </td>
                      <td className="pr-3">
                        <p className="truncate">{task.text}</p>
                        <p className={subTextClass}>{task.lead.project?.name ?? "—"}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{task.lead.client_name}</p>
                        <p className={subTextClass}>Lead {task.lead.lead_no}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{assigneeName(task)}</p>
                        {agent?.team && <p className={subTextClass}>{agent.team}</p>}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p>{formatDay(`${task.due_date}T00:00:00`)}</p>
                        <p className={subTextClass}>{formatClock(task.due_time)}</p>
                      </td>
                      <td className="pr-3">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                      <td>
                        <RowMenu
                          label={`More actions for ${taskId(task)}`}
                          items={[
                            ...(task.completed
                              ? [{ label: "Reopen task", onClick: () => void run(setTaskStatus(task.id, "open")) }]
                              : [
                                  {
                                    label: "Mark completed",
                                    onClick: () => void run(setTaskStatus(task.id, "completed")),
                                  },
                                  ...(["open", "in_progress", "scheduled"] as const)
                                    .filter((next) => next !== task.status)
                                    .map((next) => ({
                                      label: `Mark ${STATUSES[next].label.toLowerCase()}`,
                                      onClick: () => void run(setTaskStatus(task.id, next)),
                                    })),
                                ]),
                            {
                              label: task.is_starred ? "Remove from favourites" : "Add to favourites",
                              onClick: () => void run(setFollowUpStarred(task.id, !task.is_starred)),
                            },
                            { label: "Call client", href: `tel:${task.lead.client_number}`, external: true },
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
          noun="tasks"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isNewTaskOpen && <NewTaskModal onClose={() => setIsNewTaskOpen(false)} onCreated={() => void load()} />}
    </ViewTransition>
  );
}
