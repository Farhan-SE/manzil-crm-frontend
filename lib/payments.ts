import type { StatusTone } from "@/components/list/StatusBadge";
import type { Payment, PaymentStatus } from "@/lib/api";

// These ids mirror the list the server validates against in payment.entity.ts.
export const PAYMENT_TYPES = [
  { id: "token", name: "Token payment" },
  { id: "down_payment", name: "Down payment" },
  { id: "instalment", name: "Instalment" },
];

export const PAYMENT_METHODS = [
  { id: "Bank transfer", name: "Bank transfer" },
  { id: "Cheque", name: "Cheque" },
  { id: "Cash", name: "Cash" },
  { id: "Online", name: "Online" },
];

export const PAYMENT_STATUSES: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  unverified: { label: "Unverified", tone: "warning" },
  received: { label: "Received", tone: "neutral" },
  overdue: { label: "Overdue", tone: "danger" },
  part_paid: { label: "Part paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
};

export function paymentTypeLabel(type: string) {
  return PAYMENT_TYPES.find((entry) => entry.id === type)?.name ?? type;
}

export function paymentCode(payment: Payment) {
  return `PAY-${String(payment.payment_no).padStart(4, "0")}`;
}

/** The last twelve months, newest first, as { id: "2026-10", name: "October 2026" }. */
export function recentMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      id: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      name: month.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  });
}
