"use client";

import { ChevronDownIcon } from "@/components/icons/DashboardIcons";
import { Listbox } from "@/components/ui/Listbox";

export type SelectOption = { id: string; name: string };

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = "Select...",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const selectedName = options.find((option) => option.id === value)?.name;

  return (
    <Listbox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      className={`${inputClass} flex items-center justify-between gap-2 text-left ${
        selectedName ? "" : "text-placeholder"
      }`}
    >
      {(isOpen) => (
        <>
          <span className="min-w-0 truncate">{selectedName ?? placeholder}</span>
          <ChevronDownIcon
            className={`size-2.5 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </>
      )}
    </Listbox>
  );
}
