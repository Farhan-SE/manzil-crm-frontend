"use client";

import { useState, type ReactNode, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { LeadPicker } from "@/components/ui/LeadPicker";
import { createApproval, decideApproval, type Approval, type ApprovalDecision } from "@/lib/api";
import { APPROVAL_TYPES, approvalCode, approvalTypeLabel } from "@/lib/approvals";
import { formatClock, formatDay } from "@/lib/time";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

const PRIORITIES: SelectOption[] = [
  { id: "normal", name: "Normal" },
  { id: "high", name: "High" },
];

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
            {title}
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
        {children}
      </div>
    </div>
  );
}

export function NewApprovalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState(APPROVAL_TYPES[0].id);
  const [leadId, setLeadId] = useState("");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!leadId) {
      setError("Pick the lead this request is about.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createApproval({ type, lead_id: leadId, summary, priority, due_date: dueDate || undefined });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Request approval" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="approval-type" className="text-sm text-muted">
            Request type
          </label>
          <Select id="approval-type" value={type} onChange={setType} options={APPROVAL_TYPES} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="approval-lead" className="text-sm text-muted">
            Client / lead
            <span className="text-hot"> *</span>
          </label>
          <LeadPicker id="approval-lead" value={leadId} onChange={setLeadId} onError={setError} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="approval-summary" className="text-sm text-muted">
            What needs approving
            <span className="text-hot"> *</span>
          </label>
          <input
            id="approval-summary"
            type="text"
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Unit selection and documents"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="approval-priority" className="text-sm text-muted">
              Priority
            </label>
            <Select id="approval-priority" value={priority} onChange={setPriority} options={PRIORITIES} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="approval-due" className="text-sm text-muted">
              Decision needed by
            </label>
            <input
              id="approval-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
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
            {isSubmitting ? "Submitting..." : "Submit request"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const DECISIONS: { id: ApprovalDecision; label: string; primary?: boolean }[] = [
  { id: "rejected", label: "Reject request" },
  { id: "returned", label: "Return for information" },
  { id: "approved", label: "Approve", primary: true },
];

export function ReviewApprovalModal({
  approval,
  canDecide,
  onClose,
  onDecided,
}: {
  approval: Approval;
  canDecide: boolean;
  onClose: () => void;
  onDecided: () => void;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<ApprovalDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Approved and rejected requests are closed; a returned one can be decided again.
  const isOpen = approval.status === "pending" || approval.status === "returned";

  async function decide(decision: ApprovalDecision) {
    setError(null);
    setBusy(decision);
    try {
      await decideApproval(approval.id, decision, comment || undefined);
      onDecided();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  }

  const details = [
    ["Request", `${approvalCode(approval)} · ${approvalTypeLabel(approval.type)}`],
    ["Client / lead", `${approval.lead.client_name} · ${approval.lead.lead_no}`],
    ["Project", approval.lead.project?.name ?? "—"],
    [
      "Requester",
      approval.submitted_by ? `${approval.submitted_by.first_name} ${approval.submitted_by.last_name}` : "—",
    ],
    ["Submitted", `${formatDay(approval.created_at)} · ${formatClock(approval.created_at)}`],
    ["Priority", approval.priority === "high" ? "High" : "Normal"],
    ...(approval.reviewer
      ? [["Reviewer", `${approval.reviewer.first_name} ${approval.reviewer.last_name}`]]
      : []),
    ...(approval.review_comment ? [["Review comment", approval.review_comment]] : []),
  ];

  return (
    <ModalShell title="Review request" onClose={onClose}>
      <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        <p className="text-sm text-ink">{approval.summary}</p>
        <dl className="flex flex-col gap-2 text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="w-32 shrink-0 text-muted">{label}</dt>
              <dd className="min-w-0 text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {canDecide && isOpen && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="approval-comment" className="text-sm text-muted">
              Review comments
            </label>
            <textarea
              id="approval-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Record the reason when rejecting or returning a request."
              className={inputClass}
            />
          </div>
        )}

        {error && <p className="text-sm text-hot">{error}</p>}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {canDecide && isOpen ? (
            DECISIONS.map((decision) => (
              <button
                key={decision.id}
                type="button"
                disabled={busy !== null}
                onClick={() => void decide(decision.id)}
                className={`rounded-xl px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  decision.primary
                    ? "bg-ink font-bold text-white hover:bg-ink/90"
                    : "border border-border bg-white text-ink hover:bg-dash-bg"
                }`}
              >
                {busy === decision.id ? "Saving..." : decision.label}
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink hover:bg-dash-bg"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
