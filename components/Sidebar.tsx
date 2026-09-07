"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clearToken } from "@/lib/api";
import { useIsAdmin, useSessionFullName } from "@/lib/session";
import { NewLeadModal } from "@/components/NewLeadModal";
import {
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useIsAdmin();
  const fullName = useSessionFullName();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <>
    <aside className="fixed left-0 top-0 flex h-dvh w-[256px] flex-col gap-2 border-r border-dash-border bg-sidebar py-4 pl-4 pr-[17px]">
      <div className="pb-8 pt-2">
        <p
          className="font-serif text-2xl font-bold tracking-[-0.48px] text-dash-ink"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          manzil.com
        </p>
      </div>

      {admin && (
        <button
          type="button"
          onClick={() => setIsNewLeadOpen(true)}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-dash-ink py-2.5 text-base text-white transition-colors hover:bg-dash-ink/90"
        >
          <PlusIcon className="size-3" />
          New Lead
        </button>
      )}

      <nav className="hide-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
