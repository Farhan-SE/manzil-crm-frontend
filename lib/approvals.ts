import type { Approval } from "@/lib/api";
import { formatMoney } from "@/lib/money";

// These ids mirror the list the server validates against in approval.entity.ts.
export const APPROVAL_TYPES = [
  { id: "lead_transfer", name: "Lead transfer", short: "transfer" },
  { id: "inventory_approval", name: "Inventory approval", short: "inventory" },
  { id: "payment_verification", name: "Payment verification", short: "payment" },
];

/** Requests staff raise by hand; inventory approvals come from adding a unit. */
export const REQUESTABLE_TYPES = APPROVAL_TYPES.filter((type) => type.id !== "inventory_approval");

export function approvalTypeLabel(type: string) {
  return APPROVAL_TYPES.find((entry) => entry.id === type)?.name ?? type;
}

export function approvalCode(approval: Approval) {
  return `APR-${String(approval.request_no).padStart(3, "0")}`;
}

/** The project and the line under it, for whatever the request is about. */
export function approvalSubject(approval: Approval) {
  if (approval.unit) {
    return {
      title: approval.unit.project?.name ?? "—",
      detail: `Unit ${approval.unit.unit_number} · ${approval.unit.inventory_type === "partner" ? "Sales partner" : "Direct"} inventory`,
    };
  }
  const lead = approval.lead;
  const extra = approval.payment
    ? ` · ${formatMoney(approval.payment.amount)}`
    : approval.target_user
      ? ` → ${approval.target_user.first_name} ${approval.target_user.last_name}`
      : "";
  return {
    title: lead?.project?.name ?? "—",
    detail: lead ? `${lead.client_name} · Lead ${lead.lead_no}${extra}` : "—",
  };
}
