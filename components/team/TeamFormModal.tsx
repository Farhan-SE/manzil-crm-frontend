"use client";

import { useState, type SubmitEvent } from "react";
import { SearchIcon } from "@/components/icons/DashboardIcons";
import { createTeam, updateTeam, type Team, type TeamMember } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

export function TeamFormModal({
  initial,
  members,
  onClose,
  onSaved,
}: {
  initial: Team | null;
  members: TeamMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  // Starts as the team's current members; whatever is ticked on save becomes the whole team.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(initial ? members.filter((m) => m.team_id === initial.id).map((m) => m.id) : []),
  );
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const term = search.trim().toLowerCase();
  const visible = term
    ? members.filter((m) =>
        [m.first_name, m.last_name, m.email, m.team ?? ""].some((f) => f.toLowerCase().includes(term)),
      )
    : members;
  const allVisibleSelected = visible.length > 0 && visible.every((m) => selected.has(m.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const member of visible) {
        if (allVisibleSelected) next.delete(member.id);
        else next.add(member.id);
      }
      return next;
    });
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const memberIds = [...selected];
      if (initial) {
        await updateTeam(initial.id, name, memberIds);
      } else {
        await createTeam(name, memberIds);
      }
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
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-4 py-4 sm:px-6">
          <h2
            className="font-serif text-2xl font-bold text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {initial ? "Edit team" : "New team"}
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
          <div className="flex shrink-0 flex-col gap-1.5">
            <label htmlFor="team-name" className="text-sm text-dash-muted">
              Team name
              <span className="text-hot"> *</span>
            </label>
            <input
              id="team-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales - Lahore"
              className={inputClass}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <p className="text-sm text-dash-muted">
                Members
                <span className="ml-2 text-xs">{selected.size} selected</span>
              </p>
              {visible.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="text-xs font-semibold text-dash-muted transition-colors hover:text-dash-ink"
                >
                  {allVisibleSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <SearchIcon className="absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members"
                aria-label="Search members"
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="min-h-24 flex-1 overflow-y-auto rounded-xl border border-dash-border bg-white">
              {visible.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-dash-placeholder">
                  {members.length === 0 ? "No members yet." : "Nobody matches that search."}
                </p>
              )}
              {visible.map((member, i) => {
                const inAnotherTeam = member.team_id && member.team_id !== initial?.id;
                return (
                  <label
                    key={member.id}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-dash-bg/60 ${
                      i > 0 ? "border-t border-dash-border" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(member.id)}
                      onChange={() => toggle(member.id)}
                      className="size-4 shrink-0 accent-dash-ink"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-dash-ink">
                        {member.first_name} {member.last_name}
                      </span>
                      <span className="block truncate text-xs text-dash-muted">{member.email}</span>
                    </span>
                    {/* Ticking someone from another team moves them — say so before it happens. */}
                    {inAnotherTeam && (
                      <span className="shrink-0 rounded bg-badge-neutral px-2 py-0.5 text-[10px] text-dash-muted">
                        {selected.has(member.id) ? `Moves from ${member.team}` : member.team}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {error && <p className="shrink-0 text-sm text-hot">{error}</p>}

          <div className="flex shrink-0 items-center justify-end gap-4">
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
              {isSubmitting ? "Saving..." : initial ? "Save changes" : "Create team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
