"use client";

import { ChevronDownIcon } from "@/components/icons/DashboardIcons";
import { Listbox } from "@/components/ui/Listbox";
import type { CustomerStage } from "@/lib/api";
import { CUSTOMER_STAGES } from "@/lib/customers";

const OPTIONS = CUSTOMER_STAGES.map((stage) => ({ id: stage.id, name: stage.label }));

export function StageSelect({
  value,
  onChange,
  label,
}: {
  value: CustomerStage;
  onChange: (stage: CustomerStage) => void;
  label: string;
}) {
  const current = CUSTOMER_STAGES.find((s) => s.id === value);

  return (
    <Listbox
      value={value}
      onChange={(next) => onChange(next as CustomerStage)}
      options={OPTIONS}
      label={label}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-[20px] px-4 py-[5px] text-[11px] leading-[1.4] ${
        current?.className ?? "bg-badge-neutral text-muted"
      }`}
    >
      {(isOpen) => (
        <>
          {current?.label ?? value}
          <ChevronDownIcon className={`size-2 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </>
      )}
    </Listbox>
  );
}
