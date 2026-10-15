import type { Permissions } from "@/lib/api";

/**
 * `icon` is a file in /public/icons. An item without `href` has no screen yet and renders disabled.
 * `permission` hides the item from roles without it; the screen's API refuses them anyway.
 */
export type NavItem = { label: string; icon: string; href?: string; permission?: string };

export type NavSection = { label: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  { label: "Dashboard", items: [{ label: "Dashboard", icon: "dashboard", href: "/dashboard" }] },
  {
    label: "Clients & Leads",
    items: [
      { label: "Clients", icon: "clients", href: "/customers", permission: "customers.view" },
      { label: "Leads", icon: "leads", href: "/leads", permission: "leads.view" },
      { label: "Todos", icon: "todos", href: "/today", permission: "leads.view" },
      { label: "Tasks", icon: "tasks", href: "/tasks", permission: "leads.view" },
      { label: "Pipeline", icon: "pipeline", href: "/pipeline", permission: "leads.view" },
      { label: "Sales Dispute", icon: "dispute", href: "/sales-disputes", permission: "disputes.view" },
    ],
  },
  {
    label: "Projects & Inventory",
    items: [
      { label: "Projects", icon: "projects", href: "/projects" },
      { label: "Direct Inventory", icon: "inventory", href: "/inventory" },
      { label: "Partner Inventory", icon: "inventory", href: "/partner-inventory" },
      { label: "Locations", icon: "locations", href: "/locations" },
    ],
  },
  {
    label: "Staff",
    items: [
      { label: "Staff", icon: "staff", href: "/team" },
      { label: "Teams", icon: "teams", href: "/teams" },
      { label: "Roles", icon: "roles", href: "/roles", permission: "roles.manage" },
    ],
  },
  { label: "Management", items: [{ label: "Management", icon: "management", href: "/management", permission: "approvals.view" }] },
  { label: "Reports", items: [{ label: "Reports", icon: "reports", href: "/reports", permission: "reports.view" }] },
  { label: "Accounts", items: [{ label: "Accounts", icon: "accounts", href: "/accounts", permission: "payments.view" }] },
];

/** The sections and items this member's role can reach. Nothing gated shows until access has loaded. */
export function visibleSections(permissions: Permissions | undefined): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || Boolean(permissions?.[item.permission])),
  })).filter((section) => section.items.length > 0);
}

export const HELP_ITEM: NavItem = { label: "Help Center", icon: "help-center", href: "/help" };

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findActiveSection(pathname: string) {
  return NAV_SECTIONS.find((section) =>
    section.items.some((item) => item.href && isActivePath(pathname, item.href)),
  );
}

export function sectionHref(section: NavSection) {
  return section.items.find((item) => item.href)?.href;
}
