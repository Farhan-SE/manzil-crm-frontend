"use client";

import { useState, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { setUserTeam, type Team, type TeamMember } from "@/lib/api";

const NO_TEAM: SelectOption = { id: "", name: "No team" };

export function EditTeamMemberModal({
  member,
  teams,
  onClose,
  onUpdated,
}: {
  member: TeamMember;
  teams: Team[];
  onClose: () => void;
  onUpdated: (member: TeamMember) => void;
}) {
  const [teamId, setTeamId] = useState(member.team_id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      onUpdated(await setUserTeam(member.id, teamId || null));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-dash-border px-4 py-4 sm:px-6">
          <h2
            className="font-serif text-2xl font-bold text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Update member
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-dash-ink">
              {member.first_name} {member.last_name}
            </p>
            <p className="text-xs text-dash-muted">{member.email}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-member-team" className="text-sm text-dash-muted">
              Team
            </label>
            <Select
              id="edit-member-team"
              value={teamId}
              onChange={setTeamId}
              options={[NO_TEAM, ...teams.map((t) => ({ id: t.id, name: t.name }))]}
            />
            <p className="text-xs text-dash-muted">
              Shown under this member&apos;s name in the customers and leads lists.
            </p>
          </div>

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
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
