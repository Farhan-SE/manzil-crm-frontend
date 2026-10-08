"use client";

import { Children, Fragment, isValidElement, useEffect, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Listbox, type ListboxOption } from "@/components/ui/Listbox";

const controlClass = "min-w-0 bg-transparent text-xs leading-[1.4] focus:outline-none";

export function FilterBar({ children, onSearch }: { children: ReactNode; onSearch: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="flex flex-wrap items-end gap-x-6 gap-y-4 bg-cream px-4 py-6 sm:px-8"
    >
      {children}
      <button
        type="submit"
        className="ml-auto flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] bg-primary px-4 text-xs leading-[1.4] text-placeholder transition-colors hover:text-white"
      >
        <Icon name="search" className="size-4" />
        Search
      </button>
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-[160px] flex-1 flex-col gap-[13px]">
      <span className="text-[10px] leading-[1.4] text-muted">{label}</span>
      <span className="flex items-center gap-2 text-muted">
        <Icon name="search" className="size-4" />
        {children}
      </span>
    </label>
  );
}

export function FilterInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input type="text" {...props} className={`${controlClass} flex-1 text-ink placeholder:text-placeholder`} />
  );
}

/** A native date picker. Empty, it shows its placeholder instead of the browser's dd/mm/yyyy mask. */
export function FilterDate({
  placeholder,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { placeholder: string }) {
  const [isFocused, setIsFocused] = useState(false);
  const showsDate = isFocused || Boolean(props.value);
  return (
    <input
      {...props}
      type={showsDate ? "date" : "text"}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`${controlClass} flex-1 text-ink placeholder:text-placeholder`}
    />
  );
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(textOf).join("");
  return isValidElement<{ children?: ReactNode }>(node) ? textOf(node.props.children) : String(node);
}

/** Reads the `<option>` children a native select would take. */
function toOptions(children: ReactNode): ListboxOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode }>(child)) return [];
    if (child.type === Fragment) return toOptions(child.props.children);
    const name = textOf(child.props.children);
    return [{ id: String(child.props.value ?? name), name }];
  });
}

/** Takes `<option>` children and an `onChange` like a native select, but opens the app's dropdown panel. */
export function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
  className = "flex-1",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const options = [...(placeholder !== undefined ? [{ id: "", name: placeholder }] : []), ...toOptions(children)];
  const selected = options.find((option) => option.id === value);
  return (
    <Listbox
      value={value}
      onChange={(next) => onChange({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)}
      options={options}
      label={ariaLabel}
      className={`${controlClass} flex cursor-pointer items-center gap-2 text-left ${className} ${
        value ? "text-ink" : "text-placeholder"
      }`}
    >
      {(isOpen) => (
        <>
          <span className="min-w-0 flex-1 truncate">{selected?.name ?? value}</span>
          <Icon name="chevron-down" className={`size-3.5 text-ink transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </>
      )}
    </Listbox>
  );
}

/** The trailing "More Filters" control: a popover holding the filters that don't fit the bar. */
export function MoreFilters({ activeCount = 0, children }: { activeCount?: number; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex h-9 shrink-0 items-center">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex items-center gap-1 text-xs leading-[1.4] text-primary"
      >
        More Filters
        {activeCount > 0 && ` (${activeCount})`}
        <Icon name="chevron-down" className="size-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 flex w-[280px] flex-col gap-5 rounded-[4px] border border-dash-border bg-cream p-4 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}
