"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken } from "@/lib/api";
import { useIsAdmin, useSessionFullName } from "@/lib/session";
import { NewLeadModal } from "@/components/NewLeadModal";
import {
  CloseIcon,
  DashboardIcon,
  LeadsIcon,
  TodayIcon,
  PipelineIcon,
  InventoryIcon,
  CustomersIcon,
  TasksIcon,
  TeamIcon,
  SettingsIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
} from "@/components/icons/DashboardIcons";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", Icon: DashboardIcon },
  { label: "Leads", href: "/leads", Icon: LeadsIcon },
  { label: "Today", href: "/today", Icon: TodayIcon },
  { label: "Pipeline", href: "/pipeline", Icon: PipelineIcon },
  { label: "Inventory", href: "/inventory", Icon: InventoryIcon },
  { label: "Customers", href: "/customers", Icon: CustomersIcon },
  { label: "Tasks", href: "/tasks", Icon: TasksIcon },
  { label: "Team", href: "/team", Icon: TeamIcon },
  { label: "Settings", href: "/settings", Icon: SettingsIcon },
] as const;

const navRowClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors";

const wordmarkStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useIsAdmin();
  const fullName = useSessionFullName();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Mobile drawer only: lock the page behind it and let Escape close it.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <>
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-dash-border bg-sidebar px-4 lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="-ml-1 flex size-9 items-center justify-center rounded-lg text-dash-ink transition-colors hover:bg-dash-border/40"
      >
        <MenuIcon className="h-3.5 w-[18px]" />
      </button>
      <p className="font-serif text-xl font-bold tracking-[-0.4px] text-dash-ink" style={wordmarkStyle}>
        manzil.com
      </p>
    </header>

    <div
      onClick={() => setIsOpen(false)}
      aria-hidden="true"
      className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    />

    <aside
      className={`fixed left-0 top-0 z-50 flex h-dvh w-[256px] max-w-[85vw] flex-col gap-2 border-r border-dash-border bg-sidebar py-4 pl-4 pr-[17px] transition-transform duration-300 lg:z-auto lg:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between pb-8 pt-2">
        <p className="font-serif text-2xl font-bold tracking-[-0.48px] text-dash-ink" style={wordmarkStyle}>
          manzil.com
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
          className="flex size-8 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-border/40 hover:text-dash-ink lg:hidden"
        >
          <CloseIcon className="size-3.5" />
        </button>
      </div>

      {admin && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setIsNewLeadOpen(true);
          }}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-dash-ink py-2.5 text-base text-white transition-colors hover:bg-dash-ink/90"
        >
          <PlusIcon className="size-3" />
          New Lead
        </button>
      )}

      <nav className="hide-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`${navRowClass} ${
                isActive
                  ? "bg-nav-active font-semibold text-nav-active-fg"
                  : "text-nav-idle hover:bg-dash-border/40 hover:text-dash-ink"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-dash-border pt-4">
        {fullName && (
          <div className="mb-1.5 flex items-center gap-3 px-3 py-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-avatar/30 text-xs font-bold text-dash-ink">
              {initials(fullName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize leading-tight text-dash-ink">
                {fullName}
              </p>
              <p className="text-xs leading-tight text-nav-idle">{admin ? "Admin" : "Agent"}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className={`${navRowClass} text-left text-nav-idle hover:bg-hot/10 hover:text-hot`}
        >
          <LogoutIcon className="size-[18px] shrink-0" />
          Logout
        </button>
      </div>
    </aside>
    <NewLeadModal isOpen={isNewLeadOpen} onClose={() => setIsNewLeadOpen(false)} />
    </>
  );
}
