"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { HELP_ITEM, findActiveSection, isActivePath, type NavItem } from "@/lib/navigation";

const itemClass =
  "flex h-16 w-full shrink-0 flex-col items-center justify-center gap-1.5 rounded-md px-1 py-2 text-center text-[10px] leading-3 transition-colors";

function RailItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const content = (
    <>
      <Icon name={item.icon} className="size-5" />
      {item.label}
    </>
  );

  if (!item.href) {
    return (
      <span aria-disabled="true" title="Coming soon" className={`${itemClass} cursor-not-allowed text-nav-idle/60`}>
        {content}
      </span>
    );
  }

  const isActive = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`${itemClass} ${
        isActive
          ? "bg-nav-active font-bold text-nav-active-fg"
          : "text-nav-idle hover:bg-dash-border/40 hover:text-dash-ink"
      }`}
    >
      {content}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const items = findActiveSection(pathname)?.items ?? [];

  return (
    <aside className="hide-scrollbar fixed bottom-0 left-0 top-[70px] z-20 hidden w-24 flex-col items-center gap-2 overflow-y-auto border-r border-border bg-sidebar px-2 py-4 lg:flex">
      {items.map((item) => (
        <RailItem key={item.label} item={item} pathname={pathname} />
      ))}
      <div className="min-h-px flex-1" />
      <RailItem item={HELP_ITEM} pathname={pathname} />
    </aside>
  );
}
