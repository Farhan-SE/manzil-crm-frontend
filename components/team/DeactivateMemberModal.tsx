"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { Select } from "@/components/ui/Select";
import { getAgents, setUserBlocked, setUserSuspended, transferLeads, type StaffMember } from "@/lib/api";

/**
 * Suspending or blocking a member who still holds leads first hands those leads,
 * and their clients, to someone who can keep working them.
 */
export function DeactivateMemberModal({
  member,
  action,
  onClose,
  onDone,
}: {
  member: StaffMember;
  action: "suspend" | "block";
  onClose: () => void;
  onDone: () => void;
}) {
  const [recipients, setRecipients] = useState<{ id: string; name: string }[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = `${member.first_name} ${member.last_name}`;

  useEffect(() => {
    getAgents()
      .then((list) =>
        setRecipients(
          list
            .filter((agent) => agent.id !== member.id)
            .map((agent) => ({ id: String(agent.id), name: `${agent.first_name} ${agent.last_name}` })),
        ),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load staff."));
  }, [member.id]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!toUserId) return setError("Pick who takes over the leads.");
    setError(null);
    setIsSubmitting(true);
    try {
      await transferLeads(member.id, Number(toUserId));
      await (action === "suspend" ? setUserSuspended(member.id, true) : setUserBlocked(member.id, true));
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-sidebar shadow-lg"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-serif text-2xl font-bold text-ink" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
            {action === "suspend" ? "Suspend" : "Block"} {member.first_name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
          <p className="text-sm text-ink">
            {name} has {member.allocated_leads.toLocaleString()} {member.allocated_leads === 1 ? "lead" : "leads"}. Choose who
            takes them over, along with their clients and open tasks, before the account is{" "}
            {action === "suspend" ? "suspended" : "blocked"}.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="transfer-to" className="text-sm text-muted">
              Transfer leads to
              <span className="text-hot"> *</span>
            </label>
            <Select id="transfer-to" value={toUserId} onChange={setToUserId} options={recipients} placeholder="Select staff member" />
          </div>
          {error && <p className="text-sm text-hot">{error}</p>}
          <div className="flex items-center justify-end gap-4">
            <button type="button" onClick={onClose} className="text-sm font-medium text-muted transition-colors hover:text-ink">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Transferring..." : `Transfer and ${action}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
