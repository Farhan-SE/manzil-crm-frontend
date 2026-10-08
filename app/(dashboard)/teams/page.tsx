"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
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
import { TeamFormModal } from "@/components/team/TeamFormModal";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  deleteTeam,
  getStaff,
  getTeamsOverview,
  getUsers,
  setTeamActive,
  setTeamStarred,
  type StaffMember,
  type Team,
  type TeamMember,
  type TeamsQuery,
  type TeamTab,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useIsAdmin } from "@/lib/session";

type Filters = { search: string; department: string; region: string; leadId: string };

const EMPTY_FILTERS: Filters = { search: "", department: "", region: "", leadId: "" };

const TABS: { id: TeamTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "all", label: "All" },
];

const EXPORT_LIMIT = 1000;
const SUMMARY_LIMIT = 50;

const COLUMN_COUNT = 9;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const headerActionClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-dash-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60";

function teamCode(team: Team) {
  return `TEAM-${String(team.team_no).padStart(2, "0")}`;
}

function leadName(team: Team) {
  return team.lead ? `${team.lead.first_name} ${team.lead.last_name}` : "—";
}

export default function TeamsPage() {
  const admin = useIsAdmin();

  const [teams, setTeams] = useState<Team[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<TeamTab, number> | null>(null);
  const [options, setOptions] = useState({ departments: [] as string[], regions: [] as string[] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<TeamTab>("active");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [everyone, setEveryone] = useState<TeamMember[]>([]);
  // The team whose members the summary panel lists; falls back to the first row.
  const [summaryTeamId, setSummaryTeamId] = useState<string | null>(null);
  const [summaryMembers, setSummaryMembers] = useState<StaffMember[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const loadEveryone = useCallback(() => {
    getUsers().then(setEveryone).catch(() => {});
  }, []);

  useEffect(() => {
    loadEveryone();
  }, [loadEveryone]);

  const buildQuery = useCallback(
    (): TeamsQuery => ({
      status: tab,
      search: filters.search.trim() || undefined,
      department: filters.department || undefined,
      region: filters.region || undefined,
      lead_id: filters.leadId ? Number(filters.leadId) : undefined,
      starred: favouritesOnly ? "true" : undefined,
      sort,
    }),
    [tab, filters, favouritesOnly, sort],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getTeamsOverview({ ...buildQuery(), page, limit: pageSize });
      setTeams(res.data);
      setTotal(res.total);
      setStatusCounts(res.status_counts);
      setOptions({ departments: res.departments, regions: res.regions });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
      setTeams([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaryTeam = teams.find((team) => team.id === summaryTeamId) ?? teams[0];

  useEffect(() => {
    if (!summaryTeam) return;
    let isCurrent = true;
    getStaff({ team_id: summaryTeam.id, limit: SUMMARY_LIMIT })
      .then((res) => {
        if (isCurrent) setSummaryMembers(res.data);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [summaryTeam]);

  async function run(action: Promise<unknown>) {
    try {
      await action;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that team.");
    }
    void load();
  }

  async function handleDelete(team: Team) {
    const note = team.member_count > 0 ? ` Its ${team.member_count} member(s) will be left without a team.` : "";
    if (!window.confirm(`Delete the team "${team.name}"?${note}`)) return;
    await run(deleteTeam(team.id));
    loadEveryone();
  }

  async function exportTeams() {
    try {
      const res = await getTeamsOverview({ ...buildQuery(), page: 1, limit: EXPORT_LIMIT });
      downloadCsv(`teams-${new Date().toLocaleDateString("en-CA")}.csv`, [
        ["Team ID", "Team", "Team lead", "Department", "Region", "Office", "Members", "Allocated leads", "Project assignments", "Status"],
        ...res.data.map((team) => [
          teamCode(team),
          team.name,
          team.lead ? leadName(team) : "",
          team.department ?? "",
          team.region ?? "",
          team.office ?? "",
          String(team.member_count),
          String(team.allocated_leads),
          String(team.project_assignments),
          team.is_active ? "Active" : "Inactive",
        ]),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export teams.");
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

  function openForm(team: Team | null) {
    setEditingTeam(team);
    setIsFormOpen(true);
  }

  const isFiltered = Object.values(filters).some(Boolean) || favouritesOnly;
  const allSelected = teams.length > 0 && teams.every((team) => selected.has(team.id));
  const tabNoun = tab === "all" ? "teams" : `${tab} teams`;

  return (
    <ViewTransition>
      <div className="flex w-full flex-col pb-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-dash-ink" style={headingStyle}>
              Teams
            </h1>
            <p className="text-[10px] text-dash-muted">Team groupings · Staff assignments and coverage</p>
          </div>
          <div className="flex items-center gap-3">
            {admin && (
              <button type="button" onClick={() => openForm(null)} className={headerActionClass}>
                <PlusIcon className="size-2.5" />
                Add team
              </button>
            )}
            <button
              type="button"
              onClick={() => void exportTeams()}
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
          <FilterField label="Team">
            <FilterInput
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              placeholder="Search Team"
            />
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
          <FilterField label="Team Lead">
            <FilterSelect
              value={draft.leadId}
              onChange={(e) => setDraft({ ...draft, leadId: e.target.value })}
              placeholder="Search Staff"
            >
              {everyone.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </FilterSelect>
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
                    aria-label="Select all teams"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(teams.map((team) => team.id)))}
                    className={checkboxClass}
                  />
                </th>
                <th className={headCellClass}>Team</th>
                <th className={`${headCellClass} hidden w-[15%] sm:table-cell`}>Team lead</th>
                <th className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Region</th>
                <th className={`${headCellClass} w-[20%] lg:w-[8%]`}>Members</th>
                <th className={`${headCellClass} hidden w-[12%] lg:table-cell`}>Allocated leads</th>
                <th className={`${headCellClass} hidden w-[14%] lg:table-cell`}>Project assignments</th>
                <th className={`${headCellClass} w-[84px] lg:w-[9%]`}>Status</th>
                <th className={`${headCellClass} w-[40px] text-[9px] lg:w-[5%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <td colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && teams.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-dash-placeholder">
                    {isFiltered ? `No ${tabNoun} match those filters.` : `No ${tabNoun} yet.`}
                  </td>
                </tr>
              )}

              {!isLoading &&
                teams.map((team) => (
                  <tr
                    key={team.id}
                    onClick={() => setSummaryTeamId(team.id)}
                    className={`${rowClass} cursor-pointer hover:bg-white/60`}
                  >
                    <td className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${team.name}`}
                        checked={selected.has(team.id)}
                        onChange={() => toggleSelected(team.id)}
                        className={checkboxClass}
                      />
                    </td>
                    <td className="pr-3">
                      <p className="truncate">{team.name}</p>
                      <p className={subTextClass}>{teamCode(team)}</p>
                    </td>
                    <td className="hidden pr-3 sm:table-cell">
                      <p className="truncate">{leadName(team)}</p>
                      {team.lead && <p className={subTextClass}>{team.lead.designation ?? "Team Lead"}</p>}
                    </td>
                    <td className="hidden pr-3 lg:table-cell">
                      <p className="truncate">{team.office ?? "—"}</p>
                      {team.region && <p className={subTextClass}>{team.region}</p>}
                    </td>
                    <td className="pr-3">{team.member_count}</td>
                    <td className="hidden pr-3 lg:table-cell">{team.allocated_leads.toLocaleString()}</td>
                    <td className="hidden pr-3 lg:table-cell">{team.project_assignments}</td>
                    <td className="pr-3">
                      <StatusBadge tone={team.is_active ? "success" : "warning"}>
                        {team.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        label={`More actions for ${team.name}`}
                        items={[
                          { label: "View assignment summary", onClick: () => setSummaryTeamId(team.id) },
                          {
                            label: team.is_starred ? "Remove from favourites" : "Add to favourites",
                            onClick: () => void run(setTeamStarred(team.id, !team.is_starred)),
                          },
                          ...(admin
                            ? [
                                { label: "Edit team", onClick: () => openForm(team) },
                                {
                                  label: team.is_active ? "Mark inactive" : "Mark active",
                                  onClick: () => void run(setTeamActive(team.id, !team.is_active)),
                                },
                                { label: "Delete team", onClick: () => void handleDelete(team) },
                              ]
                            : []),
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
          noun={tabNoun}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        {summaryTeam && (
          <div className="mx-4 rounded-[4px] border border-dash-border bg-white p-4 leading-[1.4] sm:mx-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-sm font-bold text-dash-ink" style={headingStyle}>
                {summaryTeam.name} — assignment summary
              </h2>
              <p className="shrink-0 text-[10px] text-dash-muted">Staff reference values</p>
            </div>
            {summaryMembers.length === 0 ? (
              <p className="mt-4 text-xs text-dash-placeholder">This team has no members yet.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {summaryMembers.map((member) => (
                  <div key={member.id} className="min-w-0 text-xs text-ink">
                    <p className="truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className={subTextClass}>
                      E.ID: {member.id} · {member.designation ?? (member.user_role === "admin" ? "Admin" : "Agent")}
                    </p>
                    <p className="mt-[5px] text-[11px]">
                      Allocated {member.allocated_leads.toLocaleString()} · Direct{" "}
                      {member.direct_leads.toLocaleString()}
                      <span className="ml-4">
                        {member.projects_allocated} project{member.projects_allocated === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isFormOpen && (
        <TeamFormModal
          key={editingTeam?.id ?? "new-team"}
          initial={editingTeam}
          members={everyone}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            void load();
            loadEveryone();
          }}
        />
      )}
    </ViewTransition>
  );
}
