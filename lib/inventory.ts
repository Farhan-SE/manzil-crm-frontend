import type { SelectOption } from "@/components/ui/Select";
import type { UnitStatus } from "@/lib/api";

// In sale order. `tab` is the short label the tabs use; `label` is the full name shown on a row.
export const UNIT_STATUSES: { id: UnitStatus; tab: string; label: string; className: string }[] = [
  { id: "available", tab: "Available", label: "Available", className: "bg-stage-sold/10 text-stage-sold" },
  { id: "token", tab: "Token", label: "Token", className: "bg-stage-inquiry/10 text-stage-inquiry" },
  { id: "pdp", tab: "PDP", label: "Partial Down Payment", className: "bg-warm/20 text-warm" },
  { id: "cdp", tab: "CDP", label: "Complete Down Payment", className: "bg-stage-negotiation/10 text-stage-negotiation" },
  { id: "sold", tab: "SCW", label: "Sold (Closed Won)", className: "bg-badge-neutral text-muted" },
];

export const UNIT_STATUS_OPTIONS: SelectOption[] = UNIT_STATUSES.map((s) => ({ id: s.id, name: s.label }));

export const PROJECT_TYPES: SelectOption[] = [
  { id: "exclusive", name: "Exclusive" },
  { id: "non_exclusive", name: "Non-exclusive" },
];

/** How long a project carries its "New" marker after being added. */
const NEW_FOR_DAYS = 30;

export function isNewProject(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < NEW_FOR_DAYS * 86_400_000;
}

/** 10000 → "10 K", 2500000 → "2.5 M" — the compact form the projects table uses. */
export function formatCompact(amount: number) {
  if (amount >= 1_000_000) return `${+(amount / 1_000_000).toFixed(2)} M`;
  if (amount >= 1_000) return `${+(amount / 1_000).toFixed(2)} K`;
  return String(amount);
}
