"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons/DashboardIcons";

export type SelectOption = { id: string; name: string };

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedName = options.find((option) => option.id === value)?.name;

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${
          selectedName ? "" : "text-dash-placeholder"
        }`}
      >
        {selectedName ?? placeholder}
        <ChevronDownIcon
          className={`size-2.5 shrink-0 text-dash-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-56 overflow-auto rounded-xl border border-dash-border bg-white py-1 shadow-lg"
        >
          {options.length === 0 && <p className="px-4 py-2 text-sm text-dash-placeholder">No options yet</p>}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === value}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm ${
                option.id === value ? "bg-warm/10 font-semibold text-warm" : "text-dash-ink hover:bg-dash-bg"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
