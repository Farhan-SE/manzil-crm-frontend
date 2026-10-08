import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export type StatusTab<T extends string> = { id: T; label: string; count?: number | null };

export function formatCount(count: number) {
  return count >= 1000 ? `${(count / 1000).toFixed(1)} K` : String(count);
}

export function StatusTabs<T extends string>({
  tabs,
  active,
  onChange,
  children,
  variant = "pill",
}: {
  tabs: StatusTab<T>[];
  active: T;
  onChange: (id: T) => void;
  children?: ReactNode;
  /** "underline" marks the active tab with a bar under it instead of a filled pill. */
  variant?: "pill" | "underline";
}) {
  if (variant === "underline") {
    return (
      <div className="flex min-h-[50px] flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 sm:px-8">
        <div className="hide-scrollbar flex min-w-full flex-1 items-stretch gap-7 self-stretch overflow-x-auto sm:min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={tab.id === active}
              className={`-mb-px flex shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-3 text-xs font-bold leading-[1.4] transition-colors ${
                tab.id === active ? "border-cold text-cold" : "border-transparent text-ink hover:text-cold"
              }`}
            >
              {tab.label}
              {tab.count != null && <span className="font-normal text-muted">({formatCount(tab.count)})</span>}
            </button>
          ))}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-[50px] flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-1.5 sm:px-8">
      <div className="hide-scrollbar flex min-w-full flex-1 items-center gap-1 overflow-x-auto sm:min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={tab.id === active}
            className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-[5px] text-sm leading-[1.4] transition-colors ${
              tab.id === active
                ? "mx-2.5 bg-nav-active font-bold text-nav-active-fg"
                : "text-nav-idle hover:text-dash-ink"
            }`}
          >
            {tab.label}
            {tab.count != null && ` (${formatCount(tab.count)})`}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

export function FavouritesButton({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      aria-pressed={active}
      className={`shrink-0 text-xs leading-[1.4] transition-colors hover:text-dash-ink ${
        active ? "font-bold text-nav-active-fg" : "text-nav-idle"
      }`}
    >
      {active ? "★" : "☆"} Favourites
    </button>
  );
}

export function SortButton({
  sort,
  onChange,
}: {
  sort: "asc" | "desc";
  onChange: (sort: "asc" | "desc") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(sort === "desc" ? "asc" : "desc")}
      aria-label={`Sort by ID, currently ${sort === "desc" ? "newest first" : "oldest first"}`}
      className="flex shrink-0 items-center gap-1.5 text-xs leading-[1.4] text-nav-idle transition-colors hover:text-dash-ink"
    >
      Sort By
      <Icon name="sort" className={`size-4 text-ink transition-transform ${sort === "asc" ? "-scale-y-100" : ""}`} />
    </button>
  );
}
