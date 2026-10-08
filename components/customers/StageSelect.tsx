"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons/DashboardIcons";
import type { CustomerStage } from "@/lib/api";
import { CUSTOMER_STAGES } from "@/lib/customers";

const MENU_WIDTH = 160;

export function StageSelect({
  value,
  onChange,
  label,
}: {
  value: CustomerStage;
  onChange: (stage: CustomerStage) => void;
  label: string;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    // The menu is fixed to the viewport, so it would drift off its badge on scroll or resize.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  function toggle() {
    if (position || !buttonRef.current) return setPosition(null);
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
    });
  }

  const current = CUSTOMER_STAGES.find((s) => s.id === value);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={position !== null}
        aria-label={label}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-[20px] px-4 py-[5px] text-[11px] leading-[1.4] ${
          current?.className ?? "bg-badge-neutral text-dash-muted"
        }`}
      >
        {current?.label ?? value}
        <ChevronDownIcon
          className={`size-2 shrink-0 transition-transform ${position ? "rotate-180" : ""}`}
        />
      </button>

      {position && (
        // Fixed rather than absolute: the table clips its overflow, which would cut the menu off.
        <div
          ref={menuRef}
          role="listbox"
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-50 rounded-xl border border-dash-border bg-white py-1 shadow-lg"
        >
          {CUSTOMER_STAGES.map((stage) => (
            <button
              key={stage.id}
              type="button"
              role="option"
              aria-selected={stage.id === value}
              onClick={() => {
                setPosition(null);
                onChange(stage.id);
              }}
              className={`block w-full px-4 py-2 text-left text-sm ${
                stage.id === value ? "bg-warm/10 font-semibold text-warm" : "text-dash-ink hover:bg-dash-bg"
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
