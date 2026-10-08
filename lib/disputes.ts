import type { StatusTone } from "@/components/list/StatusBadge";
import type { DisputeStatus, SalesDispute } from "@/lib/api";

// These ids mirror the list the server validates against in sales-dispute.entity.ts.
export const DISPUTE_CATEGORIES = [
  { id: "allocation_conflict", name: "Allocation conflict" },
  { id: "commission_attribution", name: "Commission attribution" },
  { id: "duplicate_client_ownership", name: "Duplicate client ownership" },
  { id: "booking_reassignment", name: "Booking reassignment" },
  { id: "lead_source_correction", name: "Lead source correction" },
  { id: "other", name: "Other" },
];

export const DISPUTE_STATUSES: { id: DisputeStatus; label: string; tone: StatusTone }[] = [
  { id: "open", label: "Open", tone: "neutral" },
  { id: "under_review", label: "Under review", tone: "warning" },
  { id: "awaiting_evidence", label: "Awaiting evidence", tone: "neutral" },
  { id: "escalated", label: "Escalated", tone: "danger" },
  { id: "resolved", label: "Resolved", tone: "success" },
];

export function disputeCode(dispute: SalesDispute) {
  return `DSP-${String(dispute.case_no).padStart(3, "0")}`;
}

/** "2 days remaining", "Due today", "1 day overdue" — where a case stands against its resolution date. */
export function resolutionNote(dispute: SalesDispute) {
  if (dispute.status === "resolved") return "Closed by reviewer";
  if (!dispute.resolution_due) return "No due date";
  const today = new Date(new Date().toDateString());
  const days = Math.round((new Date(`${dispute.resolution_due}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Due today";
  const count = `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  return days > 0 ? `${count} remaining` : `${count} overdue`;
}
