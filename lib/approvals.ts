import type { Approval } from "@/lib/api";

// These ids mirror the list the server validates against in approval.entity.ts.
export const APPROVAL_TYPES = [
  { id: "booking_approval", name: "Booking approval", short: "booking" },
  { id: "lead_allocation", name: "Lead allocation", short: "allocation" },
  { id: "payment_verification", name: "Payment verification", short: "payment" },
];

export function approvalTypeLabel(type: string) {
  return APPROVAL_TYPES.find((entry) => entry.id === type)?.name ?? type;
}

export function approvalCode(approval: Approval) {
  return `APR-${String(approval.request_no).padStart(3, "0")}`;
}
