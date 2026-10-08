"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { FilterBar, FilterField, FilterInput, FilterSelect, MoreFilters } from "@/components/list/FilterBar";
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
import { AddTeamMemberModal } from "@/components/team/AddTeamMemberModal";
import { EditTeamMemberModal } from "@/components/team/EditTeamMemberModal";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getSessionUser,
  getStaff,
  getTeams,
  getUsers,
  setUserBlocked,
  setUserRole,
  setUserStarred,
  setUserSuspended,
  type StaffMember,
  type StaffQuery,
  type StaffTab,
  type Team,
  type TeamMember,
} from "@/lib/api";
import { useIsAdmin } from "@/lib/session";

type SearchField = NonNullable<StaffQuery["search_by"]>;

type Filters = {
  search: string;
  searchBy: SearchField;
  department: string;
  designation: string;
  managerId: string;
  region: string;
  teamId: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  searchBy: "employee_id",
  department: "",
  designation: "",
  managerId: "",
  region: "",
  teamId: "",
};

const SEARCH_FIELDS: { id: SearchField; name: string }[] = [
  { id: "employee_id", name: "Employee ID" },
  { id: "name", name: "Name" },
];

const TABS: { id: StaffTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "blocked", label: "Blocked" },
];

const COLUMN_COUNT = 9;

const headerActionClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-dash-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar";

/** "Jan 24" and "2 years" — when they joined and how long ago that was. */
function tenure(member: TeamMember) {
  const joined = new Date(member.joined_on ? `${member.joined_on}T00:00:00` : member.created_at);
  const months = Math.max(
    0,
    (new Date().getFullYear() - joined.getFullYear()) * 12 + new Date().getMonth() - joined.getMonth(),
  );
  const years = Math.floor(months / 12);
  return {
    since: joined.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    length:
      years > 0
        ? `${years} year${years === 1 ? "" : "s"}`
        : months > 0
          ? `${months} month${months === 1 ? "" : "s"}`
          : "This month",
  };
}

export default function StaffPage() {
  const admin = useIsAdmin();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<StaffTab, number> | null>(null);
  const [options, setOptions] = useState({ departments: [] as string[], designations: [] as string[], regions: [] as string[] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<StaffTab>("active");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [everyone, setEveryone] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const currentUserId = getSessionUser()?.id;

  const loadLookups = useCallback(() => {
    getUsers().then(setEveryone).catch(() => {});
    getTeams().then(setTeams).catch(() => {});
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const search = filters.search.trim();
      const res = await getStaff({
        status: tab,
        search: search || undefined,
        search_by: search ? filters.searchBy : undefined,
        department: filters.department || undefined,
        designation: filters.designation || undefined,
        manager_id: filters.managerId ? Number(filters.managerId) : undefined,
        region: filters.region || undefined,
        team_id: filters.teamId || undefined,
        starred: favouritesOnly ? "true" : undefined,
        sort,
        page,
        limit: pageSize,
      });
      setStaff(res.data);
      setTotal(res.total);
      setStatusCounts(res.status_counts);
      setOptions({ departments: res.departments, designations: res.designations, regions: res.regions });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff.");
      setStaff([]);
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
      setError(err instanceof Error ? err.message : "Couldn't update that member.");
    }
    void load();
  }

  function resetPaging() {
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const isFiltered = Object.values({ ...filters, searchBy: "" }).some(Boolean) || favouritesOnly;
  const allSelected = staff.length > 0 && staff.every((member) => selected.has(member.id));
  const tabNoun = `${tab} employees`;

  return (
    <ViewTransition>
      <div className="flex w-full flex-col">
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
              placeholder="Search by Employee"
              aria-label="Search staff"
            />
            <FilterSelect
              value={draft.searchBy}
              onChange={(e) => setDraft({ ...draft, searchBy: e.target.value as SearchField })}
              aria-label="Search field"
              className="w-[92px] shrink-0"
            >
              {SEARCH_FIELDS.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Department">
            <FilterSelect
              value={draft.department}
              onChange={(e) => setDraft({ ...draft, department: e.target.value })}
              placeholder="Select Department"
            >
              {options.departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Designation">
            <FilterSelect
              value={draft.designation}
              onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
              placeholder="Select Designation"
            >
              {options.designations.map((designation) => (
                <option key={designation}>{designation}</option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Search for Staff">
            <FilterSelect
              value={draft.managerId}
              onChange={(e) => setDraft({ ...draft, managerId: e.target.value })}
              placeholder="Search by Staff"
            >
              {everyone.map((member) => (
                <option key={member.id} value={member.id}>
                  Reports to {member.first_name} {member.last_name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <MoreFilters activeCount={[filters.region, filters.teamId].filter(Boolean).length}>
            <FilterField label="Region">
              <FilterSelect
                value={draft.region}
                onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                placeholder="Select Region"
              >
                {options.regions.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </FilterSelect>
            </FilterField>
            <FilterField label="Team">
              <FilterSelect
                value={draft.teamId}
                onChange={(e) => setDraft({ ...draft, teamId: e.target.value })}
                placeholder="Select Team"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>
          </MoreFilters>
        </FilterBar>

        <StatusTabs
          tabs={TABS.map((entry) => ({ ...entry, count: statusCounts?.[entry.id] ?? null }))}
          active={tab}
          onChange={(next) => {
            setTab(next);
            resetPaging();
          }}
        >
          {admin && (
            <button type="button" onClick={() => setIsAddOpen(true)} className={headerActionClass}>
              <PlusIcon className="size-2.5" />
              Add member
            </button>
          )}
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
                    aria-label="Select all staff"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(staff.map((member) => member.id)))}
                    className={checkboxClass}
                  />
                </th>
                <th className={headCellClass}>Employee detail</th>
                <th className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Department</th>
                <th className={`${headCellClass} hidden w-[9%] lg:table-cell`}>Tenure</th>
                <th className={`${headCellClass} hidden w-[10%] lg:table-cell`}>Region</th>
                <th className={`${headCellClass} hidden w-[12%] sm:table-cell`}>Line manager</th>
                <th className={`${headCellClass} w-[34%] lg:w-[12%]`}>Leads</th>
                <th className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Projects allocated</th>
                <th className="w-[40px] lg:w-[12%]" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className={`${rowClass} !h-[170px]`}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && staff.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {isFiltered ? `No ${tabNoun} match those filters.` : `No ${tabNoun}.`}
                  </td>
                </tr>
              )}

              {!isLoading &&
                staff.map((member) => {
                  const joined = tenure(member);
                  const isSelf = member.id === currentUserId;
                  return (
                    <tr key={member.id} className={`${rowClass} !h-[170px]`}>
                      <td className="hidden lg:table-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${member.first_name} ${member.last_name}`}
                          checked={selected.has(member.id)}
                          onChange={() => toggleSelected(member.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="pr-3">
                        <p className="truncate">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className={subTextClass}>
                          E.ID: {member.id} · {member.designation ?? (member.user_role === "admin" ? "Admin" : "Agent")}
                        </p>
                      </td>
                      <td className="hidden truncate pr-3 lg:table-cell">{member.department ?? "—"}</td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p>{joined.since}</p>
                        <p className={subTextClass}>{joined.length}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">
                        <p className="truncate">{member.region ?? "—"}</p>
                        {member.office && <p className={subTextClass}>{member.office}</p>}
                      </td>
                      <td className="hidden truncate pr-3 sm:table-cell">
                        {member.manager ? `${member.manager.first_name} ${member.manager.last_name}` : "—"}
                      </td>
                      <td className="pr-3">
                        <p>Allocated {member.allocated_leads.toLocaleString()}</p>
                        <p>Direct {member.direct_leads.toLocaleString()}</p>
                      </td>
                      <td className="hidden pr-3 lg:table-cell">{member.projects_allocated}</td>
                      <td>
                        <RowMenu
                          label={`More actions for ${member.first_name} ${member.last_name}`}
                          items={[
                            {
                              label: member.is_starred ? "Remove from favourites" : "Add to favourites",
                              onClick: () => void run(setUserStarred(member.id, !member.is_starred)),
                            },
                            ...(admin
                              ? [
                                  { label: "Edit member", onClick: () => setEditing(member) },
                                  ...(isSelf
                                    ? []
                                    : [
                                        {
                                          label: member.user_role === "admin" ? "Make agent" : "Make admin",
                                          onClick: () =>
                                            void run(
                                              setUserRole(member.id, member.user_role === "admin" ? "agent" : "admin"),
                                            ),
                                        },
                                        {
                                          label: member.suspended ? "Lift suspension" : "Suspend",
                                          onClick: () => void run(setUserSuspended(member.id, !member.suspended)),
                                        },
                                        {
                                          label: member.blocked ? "Unblock" : "Block",
                                          onClick: () => void run(setUserBlocked(member.id, !member.blocked)),
                                        },
                                      ]),
                                ]
                              : []),
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
          noun={tabNoun}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isAddOpen && (
        <AddTeamMemberModal
          teams={teams}
          onClose={() => setIsAddOpen(false)}
          onCreated={() => {
            void load();
            loadLookups();
          }}
        />
      )}
      {editing && (
        <EditTeamMemberModal
          member={editing}
          teams={teams}
          managers={everyone}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            void load();
            loadLookups();
          }}
        />
      )}
    </ViewTransition>
  );
}
