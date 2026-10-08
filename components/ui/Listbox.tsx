"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ListboxOption = { id: string; name: string };

const MIN_WIDTH = 160;
const MAX_HEIGHT = 256;
const GAP = 6;

type Position = { left: number; width: number; top?: number; bottom?: number };

/** The app's dropdown: any trigger, with the options in a floating white panel. */
export function Listbox({
  value,
  onChange,
  options,
  children,
  className = "",
  id,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ListboxOption[];
  /** The trigger's content; receives whether the panel is open. */
  children: (isOpen: boolean) => ReactNode;
  className?: string;
  id?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    function handlePointer(e: Event) {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    }
    // The panel is fixed to the viewport, so it would drift off its trigger when the page scrolls.
    function handleScroll(e: Event) {
      if (!menuRef.current?.contains(e.target as Node)) close();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  function toggle() {
    if (position || !buttonRef.current) return setPosition(null);
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, MIN_WIDTH);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const height = Math.min(MAX_HEIGHT, options.length * 36 + 10);
    const opensUp = rect.bottom + GAP + height > window.innerHeight && rect.top > height;
    setPosition(
      opensUp
        ? { left, width, bottom: window.innerHeight - rect.top + GAP }
        : { left, width, top: rect.bottom + GAP },
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={position !== null}
        aria-label={label}
        className={className}
      >
        {children(position !== null)}
      </button>

      {position && (
        // Fixed rather than absolute: tables, modals and popovers clip their overflow.
        <div
          ref={menuRef}
          role="listbox"
          style={{ ...position, maxHeight: MAX_HEIGHT }}
          className="fixed z-[60] overflow-auto rounded-xl border border-dash-border bg-white py-1 shadow-lg"
        >
          {options.length === 0 && <p className="px-4 py-2 text-sm text-dash-placeholder">No options yet</p>}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === value}
              onClick={() => {
                setPosition(null);
                onChange(option.id);
              }}
              className={`block w-full px-4 py-2 text-left text-sm font-normal leading-5 ${
                option.id === value ? "bg-warm/10 font-semibold text-warm" : "text-dash-ink hover:bg-dash-bg"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
