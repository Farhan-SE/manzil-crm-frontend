"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewTransition } from "react";
import { EmailIcon, PlusIcon, SearchIcon } from "@/components/icons/DashboardIcons";
import { AddTeamMemberModal } from "@/components/team/AddTeamMemberModal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSessionUser, getUsers, setUserBlocked, setUserRole, type TeamMember } from "@/lib/api";
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
  const [busyId, setBusyId] = useState<number | null>(null);

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

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!term) return members;
    return members.filter((m) =>
      [m.first_name, m.last_name, m.email, m.user_role].some((f) => f.toLowerCase().includes(term)),
    );
  }, [members, search]);

  const adminCount = members.filter((m) => m.user_role === "admin").length;
  const agentCount = members.length - adminCount;

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

      {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

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
            {search ? "Nobody matches that search." : "No team members yet."}
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
    </div>

    {isAddOpen && (
      <AddTeamMemberModal onClose={() => setIsAddOpen(false)} onCreated={() => void load()} />
    )}
    </ViewTransition>
  );
}
