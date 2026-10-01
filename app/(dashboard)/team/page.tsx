"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewTransition } from "react";
import { EmailIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import { AddTeamMemberModal } from "@/components/team/AddTeamMemberModal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  deleteTeam,
  getSessionUser,
  getTeams,
  getUsers,
  setUserBlocked,
  setUserRole,
  type Team,
  type TeamMember,
} from "@/lib/api";
import { EditTeamMemberModal } from "@/components/team/EditTeamMemberModal";
import { TeamFormModal } from "@/components/team/TeamFormModal";
import { useIsAdmin } from "@/lib/session";

// Spans only apply to the md grid; below md each row collapses into a card.
const COLS = {
  member: "md:col-span-3",
  email: "md:col-span-3",
  role: "md:col-span-3",
  joined: "md:col-span-1",
  actions: "md:col-span-2",
};

const ROLE_OPTIONS: SelectOption[] = [
  { id: "agent", name: "Agent" },
  { id: "admin", name: "Admin" },
];

const headerCell = "text-xs font-bold uppercase tracking-[0.6px] text-dash-muted";

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-warm/20 text-warm" },
  agent: { label: "Agent", className: "bg-cold/15 text-cold" },
};

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function formatJoined(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function TeamPage() {
  const admin = useIsAdmin();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  // "all", "none" (members without a team) or a team id — narrows the members list below.
  const [teamFilter, setTeamFilter] = useState("all");
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const currentUserId = getSessionUser()?.id;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setMembers(await getUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the team.");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTeams = useCallback(() => {
    getTeams()
      .then(setTeams)
      .catch(() => {});
  }, []);

  useEffect(() => {
    void load();
    loadTeams();
  }, [load, loadTeams]);

  async function handleDeleteTeam(team: Team) {
    const note = team.member_count > 0 ? ` Its ${team.member_count} member(s) will be left without a team.` : "";
    if (!window.confirm(`Delete the team "${team.name}"?${note}`)) return;
    setError(null);
    try {
      await deleteTeam(team.id);
      if (teamFilter === team.id) setTeamFilter("all");
      loadTeams();
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that team.");
    }
  }

  async function handleBlockToggle(member: TeamMember) {
    setBusyId(member.id);
    setError(null);
    try {
      const updated = await setUserBlocked(member.id, !member.blocked);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that member.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(member: TeamMember, nextRole: "admin" | "agent") {
    if (nextRole === member.user_role) return;
    setBusyId(member.id);
    setError(null);
    try {
      const updated = await setUserRole(member.id, nextRole);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change that role.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const inTeam = members.filter(
      (m) => teamFilter === "all" || (teamFilter === "none" ? !m.team_id : m.team_id === teamFilter),
    );
    if (!term) return inTeam;
    return inTeam.filter((m) =>
      [m.first_name, m.last_name, m.email, m.user_role, m.team ?? ""].some((f) => f.toLowerCase().includes(term)),
    );
  }, [members, search, teamFilter]);

  const adminCount = members.filter((m) => m.user_role === "admin").length;
  const agentCount = members.length - adminCount;
  const noTeamCount = members.filter((m) => !m.team_id).length;
  const teamCards = [
    { id: "all", name: "All members", count: members.length, team: null },
    ...teams.map((team) => ({ id: team.id, name: team.name, count: team.member_count, team })),
    ...(noTeamCount > 0 ? [{ id: "none", name: "No team", count: noTeamCount, team: null }] : []),
  ];

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1
            className="font-serif text-[28px] font-semibold leading-none text-dash-ink sm:text-[34px]"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Team
          </h1>
          {!isLoading && members.length > 0 && (
            <p className="text-sm text-dash-muted">
              {adminCount} admin{adminCount === 1 ? "" : "s"} · {agentCount} agent
              {agentCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

      </div>

      {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[1px] text-dash-muted">Teams</h2>
          {admin && (
            <button
              type="button"
              onClick={() => {
                setEditingTeam(null);
                setIsTeamFormOpen(true);
              }}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-dash-border px-3 py-2 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
            >
              <PlusIcon className="size-3" />
              Add team
            </button>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
          {teamCards.map((card) => (
            <div
              key={card.id}
              className={`flex items-center justify-between gap-2 rounded-lg border bg-white transition-colors ${
                teamFilter === card.id ? "border-dash-ink" : "border-dash-border hover:border-dash-muted/40"
              }`}
            >
              <button
                type="button"
                onClick={() => setTeamFilter(card.id)}
                aria-pressed={teamFilter === card.id}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-4 py-3 text-left"
              >
                <span className="w-full truncate text-sm font-semibold text-dash-ink">{card.name}</span>
                <span className="text-xs text-dash-muted">
                  {card.count} member{card.count === 1 ? "" : "s"}
                </span>
              </button>
              {admin && card.team && (
                <div className="flex shrink-0 items-center gap-1 pr-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeam(card.team);
                      setIsTeamFormOpen(true);
                    }}
                    aria-label={`Edit ${card.name}`}
                    title="Edit"
                    className="flex size-7 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-bg hover:text-dash-ink"
                  >
                    <PencilIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => card.team && void handleDeleteTeam(card.team)}
                    aria-label={`Delete ${card.name}`}
                    title="Delete"
                    className="flex size-7 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-bg hover:text-red-600"
                  >
                    <TrashIcon className="size-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[1px] text-dash-muted">
          Members{teamFilter !== "all" ? ` — ${teamCards.find((c) => c.id === teamFilter)?.name ?? ""}` : ""}
        </h2>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, role..."
              className="w-full rounded-lg border border-dash-border bg-sidebar py-2.5 pl-10 pr-3 text-sm text-dash-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          {admin && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
            >
              <PlusIcon className="size-3" />
              Add member
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-dash-border">
        <div className="hidden gap-4 border-b border-dash-border bg-dash-bg/50 px-6 py-4 md:grid md:grid-cols-12">
          <p className={`${COLS.member} ${headerCell}`}>Member</p>
          <p className={`${COLS.email} ${headerCell}`}>Email</p>
          <p className={`${COLS.role} ${headerCell}`}>Role</p>
          <p className={`${COLS.joined} ${headerCell}`}>Joined</p>
          {admin && <p className={`${COLS.actions} ${headerCell} text-right`}>Actions</p>}
        </div>

        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-3 bg-white px-4 py-4 md:grid md:grid-cols-12 md:gap-4 md:px-6 ${
                i > 0 ? "border-t border-dash-border" : ""
              }`}
            >
              <div className={`${COLS.member} flex w-full items-center gap-3 md:w-auto`}>
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className={`${COLS.email} hidden h-4 w-48 md:block`} />
              <Skeleton className={`${COLS.role} h-5 w-16`} />
              <Skeleton className={`${COLS.joined} hidden h-4 w-16 md:block`} />
              {admin && <Skeleton className={`${COLS.actions} ml-auto h-8 w-16 md:ml-0 md:w-full`} />}
            </div>
          ))}

        {!isLoading && filtered.length === 0 && (
          <p className="bg-white px-4 py-10 text-center text-sm text-dash-placeholder md:px-6">
            {search || teamFilter !== "all" ? "Nobody matches that filter." : "No team members yet."}
          </p>
        )}

        {!isLoading &&
          filtered.map((member, i) => {
            const role = ROLE_BADGES[member.user_role];
            return (
              <div
                key={member.id}
                className={`flex flex-wrap items-center gap-3 bg-white px-4 py-4 md:grid md:grid-cols-12 md:gap-4 md:px-6 ${
                  i > 0 ? "border-t border-dash-border" : ""
                } ${member.blocked ? "opacity-60" : ""}`}
              >
                <div className={`${COLS.member} flex w-full min-w-0 items-center gap-3 md:w-auto`}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-avatar/30 text-xs font-bold text-dash-ink">
                    {initials(member.first_name, member.last_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-dash-ink">
                      {member.first_name} {member.last_name}
                    </p>
                    {member.team && <p className="truncate text-[11px] text-dash-muted">{member.team}</p>}
                    {/* Email and joined date get their own columns from md up. */}
                    <a
                      href={`mailto:${member.email}`}
                      className="flex min-w-0 items-center gap-1.5 text-xs text-dash-muted md:hidden"
                    >
                      <EmailIcon className="size-3 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </a>
                    <p className="text-[11px] text-dash-muted md:hidden">
                      Joined {formatJoined(member.created_at)}
                    </p>
                    {member.blocked && (
                      <p className="truncate text-[11px] font-semibold text-hot">Blocked</p>
                    )}
                  </div>
                </div>

                <div className={`${COLS.email} hidden min-w-0 md:block`}>
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-1.5 text-sm text-dash-ink transition-colors hover:text-warm hover:underline"
                  >
                    <EmailIcon className="size-3 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </a>
                </div>

                <div className={`${COLS.role} min-w-0 flex-1 md:flex-none`}>
                  {admin && member.id !== currentUserId ? (
                    <Select
                      id={`role-${member.id}`}
                      value={member.user_role}
                      onChange={(v) => void handleRoleChange(member, v as "admin" | "agent")}
                      options={ROLE_OPTIONS}
                    />
                  ) : (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.45px] ${
                        role?.className ?? "bg-badge-neutral text-dash-muted"
                      }`}
                    >
                      {role?.label ?? member.user_role}
                    </span>
                  )}
                </div>

                <p className={`${COLS.joined} hidden text-sm text-dash-muted md:block`}>
                  {formatJoined(member.created_at)}
                </p>

                {admin && (
                  <div className={`${COLS.actions} flex shrink-0 items-center justify-end gap-2`}>
                    <button
                      type="button"
                      onClick={() => setEditing(member)}
                      className="rounded-lg border border-dash-border px-3 py-1.5 text-xs font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
                    >
                      Update
                    </button>
                    {/* The server refuses self-block, so it isn't offered. */}
                    {member.id !== currentUserId && (
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleBlockToggle(member)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          member.blocked
                            ? "border-dash-border text-dash-ink hover:bg-dash-bg"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        {member.blocked ? "Unblock" : "Block"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
      </section>
    </div>

    {isAddOpen && (
      <AddTeamMemberModal
        teams={teams}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => {
          void load();
          loadTeams();
        }}
      />
    )}
    {editing && (
      <EditTeamMemberModal
        member={editing}
        teams={teams}
        onClose={() => setEditing(null)}
        onUpdated={(updated) => {
          setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          loadTeams();
        }}
      />
    )}
    {isTeamFormOpen && (
      <TeamFormModal
        key={editingTeam?.id ?? "new-team"}
        initial={editingTeam}
        members={members}
        onClose={() => setIsTeamFormOpen(false)}
        onSaved={() => {
          loadTeams();
          // Saving can rename the team and move members, both of which show on the list below.
          void load();
        }}
      />
    )}
    </ViewTransition>
  );
}
