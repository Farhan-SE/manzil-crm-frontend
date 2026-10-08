import Link from "next/link";
import type { ReactNode } from "react";

export const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

export const outlineButtonClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60";

export const solidButtonClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-white bg-primary px-4 text-xs leading-[1.4] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";

export const bodyTextClass = "text-xs leading-[1.6] text-ink";

export function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex w-full flex-col gap-4 rounded-[4px] border border-border p-5 ${className}`}>
      <h2 className="font-serif text-sm font-bold leading-[1.4] text-ink" style={headingStyle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export type Crumb = { label: string; href?: string };

/** The heading block of the Help Center's inner pages: breadcrumb, title, optional action. */
export function ContextHeading({
  crumbs,
  title,
  caption,
  action,
}: {
  crumbs: Crumb[];
  title: string;
  caption: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-4 pt-[18px] sm:px-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] leading-[1.4] text-primary">
        <span aria-hidden="true">←</span>
        {crumbs.map((crumb, index) => (
          <span key={crumb.label} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-xl font-bold leading-[1.4] text-ink" style={headingStyle}>
          {title}
        </h1>
        {action}
      </div>
      <p className="text-[10px] leading-[1.4] text-muted">{caption}</p>
    </div>
  );
}
