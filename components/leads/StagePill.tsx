import { CUSTOMER_STAGES } from "@/lib/customers";

/** A lead's or client's stage as the coloured pill used across the lists. */
export function StagePill({ stage }: { stage: string }) {
  const meta = CUSTOMER_STAGES.find((entry) => entry.id === stage);
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-[20px] px-3 py-[3px] text-[11px] leading-[1.4] ${
        meta?.className ?? "bg-badge-neutral text-muted"
      }`}
    >
      {meta?.label ?? stage}
    </span>
  );
}
