"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { FilterBar, FilterDate, FilterField, FilterInput, FilterSelect } from "@/components/list/FilterBar";
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
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getAgents,
  getTodos,
  setFollowUpStarred,
  setTaskStatus,
  type Agent,
  type FollowUp,
  type TodosQuery,
  type TodoWindow,
} from "@/lib/api";
import { whatsappUrl } from "@/lib/customers";
import { useIsAdmin } from "@/lib/session";
import { NEXT_TASKS, TASK_TYPES, taskLabel } from "@/lib/tasks";
import { formatClock, formatDay, genderLabel, timeAgo } from "@/lib/time";

type SearchField = NonNullable<TodosQuery["search_by"]>;

type Filters = { search: string; searchBy: SearchField; assignedToId: string; taskType: string; dueDate: string };

const EMPTY_FILTERS: Filters = { search: "", searchBy: "lead_id", assignedToId: "", taskType: "", dueDate: "" };

const SEARCH_FIELDS: { id: SearchField; name: string }[] = [
  { id: "lead_id", name: "Lead ID" },
  { id: "client", name: "Client" },
  { id: "todo", name: "Todo" },
];

const TABS: { id: TodoWindow; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "Week" },
  { id: "all", label: "All" },
];

const NOUNS: Record<TodoWindow, string> = {
  overdue: "overdue tasks",
  today: "tasks due today",
  tomorrow: "tasks due tomorrow",
  week: "tasks due this week",
  all: "tasks",
};

// Next tasks reuse some task-type ids; keep the first label for each.
const TODO_TYPES = [...NEXT_TASKS, ...TASK_TYPES].filter(
  (option, i, all) => option.id !== "do_nothing" && all.findIndex((other) => other.id === option.id) === i,
);

const COLUMN_COUNT = 8;

export default function TodosPage() {
  const admin = useIsAdmin();
  const [todos, setTodos] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [windowCounts, setWindowCounts] = useState<Record<TodoWindow, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<TodoWindow>("overdue");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (!admin) return;
    getAgents().then(setAgents).catch(() => {});
  }, [admin]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const search = filters.search.trim();
      const res = await getTodos({
        window: tab,
        search: search || undefined,
        search_by: search ? filters.searchBy : undefined,
        assigned_to_id: filters.assignedToId ? Number(filters.assignedToId) : undefined,
        task_type: filters.taskType || undefined,
        due_date: filters.dueDate || undefined,
        starred: favouritesOnly ? "true" : undefined,
        sort,
        page,
        limit: pageSize,
      });
      setTodos(res.data);
      setTotal(res.total);
      setWindowCounts(res.window_counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos.");
      setTodos([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [tab, filters, favouritesOnly, sort, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: Promise<unknown>) {
    try {
      await action;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that todo.");
    }
    void load();
  }

  const isFiltered = Object.values({ ...filters, searchBy: "" }).some(Boolean) || favouritesOnly;

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
        <FilterBar
          onSearch={() => {
            setFilters(draft);
            setPage(1);
          }}
        >
          <FilterField label="Search by">
            <FilterInput
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              placeholder="Search by Lead"
              aria-label="Search todos"
            />
            <FilterSelect
              value={draft.searchBy}
              onChange={(e) => setDraft({ ...draft, searchBy: e.target.value as SearchField })}
              aria-label="Search field"
              className="w-[72px] shrink-0"
            >
              {SEARCH_FIELDS.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          {admin && (
            <FilterField label="Assigned Staff">
              <FilterSelect
                value={draft.assignedToId}
                onChange={(e) => setDraft({ ...draft, assignedToId: e.target.value })}
                placeholder="Search by Task Added By"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.first_name} {agent.last_name}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>
          )}
          <FilterField label="Todo Type">
            <FilterSelect
              value={draft.taskType}
              onChange={(e) => setDraft({ ...draft, taskType: e.target.value })}
              placeholder="Search by Todo Type"
            >
              {TODO_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Show Todos By">
            <FilterDate
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              placeholder="Search by Due Date"
            />
          </FilterField>
        </FilterBar>

        <StatusTabs
          tabs={TABS.map((entry) => ({ ...entry, count: windowCounts?.[entry.id] ?? null }))}
          active={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
        >
          <FavouritesButton
            active={favouritesOnly}
            onChange={(next) => {
              setFavouritesOnly(next);
              setPage(1);
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
                <th className="w-8" />
                <th className={headCellClass}>Todo</th>
                <th className={`${headCellClass} hidden w-[13%] lg:table-cell`}>Last task</th>
                <th className={`${headCellClass} hidden w-[15%] lg:table-cell`}>Staff (Assignee)</th>
                <th className={`${headCellClass} hidden w-[10%] lg:table-cell`}>Lead ID</th>
                <th className={`${headCellClass} w-[34%] lg:w-[13%]`}>Client</th>
                <th className={`${headCellClass} hidden w-[15%] sm:table-cell`}>Interest</th>
                <th className="w-[60px] lg:w-[11%]" />
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

              {!isLoading && todos.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {isFiltered ? "No todos match those filters." : "Nothing here. All caught up."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                todos.map((todo) => {
                  const agent = todo.lead.assigned_to;
                  return (
                    <tr key={todo.id} className={rowClass}>
                      <td>
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => void run(setTaskStatus(todo.id, "completed"))}
                          aria-label={`Mark "${todo.text}" done`}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pr-3">
                        <p className="line-clamp-2">{todo.text}</p>
                        <p className={`${subTextClass} ${todo.overdue ? "text-hot" : ""}`}>
                          ▣&nbsp; {formatDay(`${todo.due_date}T00:00:00`)} {formatClock(todo.due_time)}
                        </p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        {todo.last_task ? (
                          <>
                            <p className="line-clamp-2">{taskLabel(todo.last_task)}</p>
                            {todo.last_task.at && <p className={subTextClass}>{timeAgo(todo.last_task.at)}</p>}
                          </>
                        ) : (
                          <p className="text-muted">—</p>
                        )}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">
                          {agent ? `${agent.first_name} ${agent.last_name}` : "Unassigned"}
                        </p>
                        {agent?.team && <p className={subTextClass}>{agent.team}</p>}
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p>{todo.lead.lead_no}</p>
                        <p className={subTextClass}>▣&nbsp; {formatDay(todo.lead.created_at)}</p>
                      </td>
                      <td className="pr-3">
                        <p className="truncate">{todo.lead.client_name}</p>
                        <p className={subTextClass}>▣&nbsp; {genderLabel(todo.lead.gender)}</p>
                      </td>
                      <td className="hidden pr-3 sm:table-cell">
                        <p className="truncate">{todo.lead.project?.name ?? "—"}</p>
                        {todo.lead.interest && <p className={subTextClass}>{todo.lead.interest.name}</p>}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2 text-primary lg:justify-start lg:gap-[19px]">
                          <a
                            href={`tel:${todo.lead.client_number}`}
                            aria-label={`Call ${todo.lead.client_name}`}
                          >
                            <Icon name="phone" className="block size-4" />
                          </a>
                          <RowMenu
                            label={`More actions for "${todo.text}"`}
                            items={[
                              { label: "Mark done", onClick: () => void run(setTaskStatus(todo.id, "completed")) },
                              {
                                label: todo.is_starred ? "Remove from favourites" : "Add to favourites",
                                onClick: () => void run(setFollowUpStarred(todo.id, !todo.is_starred)),
                              },
                              {
                                label: "WhatsApp client",
                                href: whatsappUrl(todo.lead.client_number),
                                external: true,
                              },
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
          noun={NOUNS[tab]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </ViewTransition>
  );
}
