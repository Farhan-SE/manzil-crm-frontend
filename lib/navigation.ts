/** `icon` is a file in /public/icons. An item without `href` has no screen yet and renders disabled. */
export type NavItem = { label: string; icon: string; href?: string };

export type NavSection = { label: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  { label: "Dashboard", items: [{ label: "Dashboard", icon: "dashboard", href: "/dashboard" }] },
  {
    label: "Clients & Leads",
    items: [
      { label: "Clients", icon: "clients", href: "/customers" },
      { label: "Leads", icon: "leads", href: "/leads" },
      { label: "Todos", icon: "todos", href: "/today" },
      { label: "Tasks", icon: "tasks", href: "/tasks" },
      { label: "Pipeline", icon: "pipeline", href: "/pipeline" },
      { label: "Sales Dispute", icon: "dispute", href: "/sales-disputes" },
    ],
  },
  {
    label: "Projects & Inventory",
    items: [
      { label: "Projects", icon: "projects", href: "/projects" },
      { label: "Inv. Primary", icon: "inventory", href: "/inventory" },
      { label: "Locations", icon: "locations", href: "/locations" },
    ],
  },
  {
    label: "Staff",
    items: [
      { label: "Staff", icon: "staff", href: "/team" },
      { label: "Teams", icon: "teams", href: "/teams" },
    ],
  },
  { label: "Management", items: [{ label: "Management", icon: "management", href: "/management" }] },
  { label: "Reports", items: [{ label: "Reports", icon: "reports", href: "/reports" }] },
  { label: "Accounts", items: [{ label: "Accounts", icon: "accounts", href: "/accounts" }] },
];

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
