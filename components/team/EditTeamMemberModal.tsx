"use client";

import { useState, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { setUserTeam, updateStaffProfile, type Team, type TeamMember } from "@/lib/api";

const NO_TEAM: SelectOption = { id: "", name: "No team" };
const NO_MANAGER: SelectOption = { id: "", name: "No line manager" };

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

export function EditTeamMemberModal({
  member,
  teams,
  managers,
  onClose,
  onUpdated,
}: {
  member: TeamMember;
  teams: Team[];
  /** Everyone who could be this member's line manager. */
  managers: TeamMember[];
  onClose: () => void;
  onUpdated: (member: TeamMember) => void;
}) {
  const [teamId, setTeamId] = useState(member.team_id ?? "");
  const [designation, setDesignation] = useState(member.designation ?? "");
  const [department, setDepartment] = useState(member.department ?? "");
  const [region, setRegion] = useState(member.region ?? "");
  const [office, setOffice] = useState(member.office ?? "");
  const [managerId, setManagerId] = useState(member.manager_id != null ? String(member.manager_id) : "");
  const [joinedOn, setJoinedOn] = useState(member.joined_on ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await updateStaffProfile(member.id, {
        designation,
        department,
        region,
        office,
        manager_id: managerId ? Number(managerId) : null,
        joined_on: joinedOn || null,
      });
      // The team call runs last so the member it returns carries the profile changes too.
      onUpdated(await setUserTeam(member.id, teamId || null));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  const textFields = [
    { id: "designation", label: "Designation", value: designation, set: setDesignation, placeholder: "e.g. AMBD" },
    { id: "department", label: "Department", value: department, set: setDepartment, placeholder: "e.g. Sales - Primary" },
    { id: "region", label: "Region", value: region, set: setRegion, placeholder: "e.g. Central 1" },
    { id: "office", label: "Office", value: office, set: setOffice, placeholder: "e.g. Lahore" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2
            className="font-serif text-2xl font-bold text-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Update member
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-ink">
              {member.first_name} {member.last_name}
            </p>
            <p className="text-xs text-muted">
              E.ID: {member.id} · {member.email}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {textFields.map((field) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <label htmlFor={`edit-member-${field.id}`} className="text-sm text-muted">
                  {field.label}
                </label>
                <input
                  id={`edit-member-${field.id}`}
                  type="text"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-member-manager" className="text-sm text-muted">
                Line manager
              </label>
              <Select
                id="edit-member-manager"
                value={managerId}
                onChange={setManagerId}
                options={[
                  NO_MANAGER,
                  ...managers
                    .filter((manager) => manager.id !== member.id)
                    .map((manager) => ({
                      id: String(manager.id),
                      name: `${manager.first_name} ${manager.last_name}`,
                    })),
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-member-joined" className="text-sm text-muted">
                Joined on
              </label>
              <input
                id="edit-member-joined"
                type="date"
                value={joinedOn}
                onChange={(e) => setJoinedOn(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-member-team" className="text-sm text-muted">
              Team
            </label>
            <Select
              id="edit-member-team"
              value={teamId}
              onChange={setTeamId}
              options={[NO_TEAM, ...teams.map((t) => ({ id: t.id, name: t.name }))]}
            />
            <p className="text-xs text-muted">
              Shown under this member&apos;s name in the customers and leads lists.
            </p>
          </div>

          {error && <p className="text-sm text-hot">{error}</p>}

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
