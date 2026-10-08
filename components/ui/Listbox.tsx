"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export type ListboxOption = { id: string; name: string };

const MIN_WIDTH = 160;
const MAX_HEIGHT = 256;
const GAP = 6;

type Position = { left: number; width: number; top?: number; bottom?: number };

/** Moves focus between the items of an open menu with the arrow, Home and End keys. */
export function moveMenuFocus(e: KeyboardEvent<HTMLElement>, itemSelector: string) {
  const step = { ArrowDown: 1, ArrowUp: -1, Home: "first", End: "last" }[e.key];
  if (step === undefined) return;
  e.preventDefault();
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>(itemSelector)];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next =
    step === "first" ? 0 : step === "last" ? items.length - 1 : (at + (step as number) + items.length) % items.length;
  items[next]?.focus();
}

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
    // Opening lands on the current choice, so the arrow keys continue from it.
    const options = menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    (menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? options?.[0])?.focus();

    function handlePointer(e: Event) {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    }
    // The panel is fixed to the viewport, so it would drift off its trigger when the page scrolls.
    function handleScroll(e: Event) {
      if (!menuRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", handlePointer);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  function open() {
    if (!buttonRef.current) return;
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

  function close(returnFocus: boolean) {
    setPosition(null);
    if (returnFocus) buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => (position ? close(false) : open())}
        onKeyDown={(e) => {
          if (position || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
          e.preventDefault();
          open();
        }}
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
          aria-label={label}
          style={{ ...position, maxHeight: MAX_HEIGHT }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              // Marked as handled so a dialog behind the panel stays open.
              e.preventDefault();
              close(true);
            } else if (e.key === "Tab") {
              close(false);
            } else {
              moveMenuFocus(e, '[role="option"]');
            }
          }}
          className="fixed z-[60] overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          {options.length === 0 && <p className="px-4 py-2 text-sm text-placeholder">No options yet</p>}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === value}
              onClick={() => {
                close(true);
                onChange(option.id);
              }}
              className={`block w-full px-4 py-2 text-left text-sm font-normal leading-5 ${
                option.id === value ? "bg-warm/10 font-semibold text-warm-ink" : "text-ink hover:bg-dash-bg"
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
