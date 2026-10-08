"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { createSalesDispute, getLeads, getUsers } from "@/lib/api";
import { DISPUTE_CATEGORIES } from "@/lib/disputes";

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

export function NewDisputeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [category, setCategory] = useState(DISPUTE_CATEGORIES[0].id);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [requestedResolution, setRequestedResolution] = useState("");
  const [reviewOwnerId, setReviewOwnerId] = useState("");
  const [resolutionDue, setResolutionDue] = useState("");

  const [leads, setLeads] = useState<SelectOption[]>([]);
  const [owners, setOwners] = useState<SelectOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLeads({ limit: 200 })
      .then((res) =>
        setLeads(
          res.data.map((lead) => ({
            id: lead.id,
            name: `Lead ${lead.lead_no} — ${lead.client_name}${lead.project ? ` · ${lead.project.name}` : ""}`,
          })),
        ),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load leads."));
    getUsers()
      .then((users) =>
        setOwners(users.map((user) => ({ id: String(user.id), name: `${user.first_name} ${user.last_name}` }))),
      )
      .catch(() => {});
  }, []);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!leadId) {
      setError("Pick the lead this case is about.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createSalesDispute({
        lead_id: leadId,
        category,
        subject,
        description: description || undefined,
        requested_resolution: requestedResolution || undefined,
        review_owner_id: reviewOwnerId ? Number(reviewOwnerId) : undefined,
        resolution_due: resolutionDue || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-dash-border px-4 py-4 sm:px-6">
          <h2
            className="font-serif text-2xl font-bold text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Create sales dispute
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dispute-lead" className="text-sm text-dash-muted">
              Sale / booking reference
              <span className="text-hot"> *</span>
            </label>
            <Select id="dispute-lead" value={leadId} onChange={setLeadId} options={leads} placeholder="Select a lead" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dispute-category" className="text-sm text-dash-muted">
                Category
                <span className="text-hot"> *</span>
              </label>
              <Select id="dispute-category" value={category} onChange={setCategory} options={DISPUTE_CATEGORIES} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dispute-owner" className="text-sm text-dash-muted">
                Review owner
              </label>
              <Select
                id="dispute-owner"
                value={reviewOwnerId}
                onChange={setReviewOwnerId}
                options={[{ id: "", name: "Unassigned" }, ...owners]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dispute-subject" className="text-sm text-dash-muted">
                Subject
                <span className="text-hot"> *</span>
              </label>
              <input
                id="dispute-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Review commission attribution"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dispute-due" className="text-sm text-dash-muted">
                Resolution due
              </label>
              <input
                id="dispute-due"
                type="date"
                value={resolutionDue}
                onChange={(e) => setResolutionDue(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dispute-description" className="text-sm text-dash-muted">
              Description
            </label>
            <textarea
              id="dispute-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened, and what should the reviewer look at?"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dispute-resolution" className="text-sm text-dash-muted">
              Requested resolution
            </label>
            <textarea
              id="dispute-resolution"
              rows={2}
              value={requestedResolution}
              onChange={(e) => setRequestedResolution(e.target.value)}
              placeholder="The outcome you are asking for"
              className={inputClass}
            />
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
              {isSubmitting ? "Creating..." : "Create dispute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
