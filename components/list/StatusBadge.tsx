import type { ReactNode } from "react";

const TONES = {
  neutral: "text-primary",
  warning: "text-status-negotiation",
  danger: "text-hot",
  success: "text-stage-sold",
};

export type StatusTone = keyof typeof TONES;

export function StatusBadge({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-[20px] bg-badge-neutral px-3 py-[3px] text-[11px] leading-[1.4] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
