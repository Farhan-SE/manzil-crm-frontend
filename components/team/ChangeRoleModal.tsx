"use client";

import { useState, type SubmitEvent } from "react";
import { Select } from "@/components/ui/Select";
import { setUserRole, type Role, type TeamMember } from "@/lib/api";

export function ChangeRoleModal({
  member,
  roles,
  onClose,
  onUpdated,
}: {
  member: TeamMember;
  roles: Role[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [roleId, setRoleId] = useState(member.role_id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = roles.find((role) => role.id === roleId);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!roleId) return setError("Choose a role.");
    setError(null);
    setIsSubmitting(true);
    try {
      await setUserRole(member.id, roleId);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

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
            Change role
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="change-role" className="text-sm text-muted">
              Role
              <span className="text-hot"> *</span>
            </label>
            <Select
              id="change-role"
              value={roleId}
              onChange={setRoleId}
              options={roles.map((role) => ({ id: role.id, name: role.name }))}
              placeholder="Select role"
            />
            {chosen?.description && <p className="text-xs text-muted">{chosen.description}</p>}
            <p className="text-xs text-muted">The change applies on their next click — no need to sign in again.</p>
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
              disabled={isSubmitting || roleId === member.role_id}
              className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
