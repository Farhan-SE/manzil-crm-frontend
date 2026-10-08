"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearToken } from "@/lib/api";
import { useIsAdmin, useSessionFullName } from "@/lib/session";
import { CloseIcon, LogoutIcon, MenuIcon, SettingsIcon } from "@/components/icons/DashboardIcons";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { UNREAD_EVENT } from "@/components/NotificationToasts";
import { Icon } from "@/components/ui/Icon";
import { HELP_ITEM, NAV_SECTIONS, findActiveSection, isActivePath, sectionHref } from "@/lib/navigation";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const wordmarkStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const iconButtonClass =
  "flex size-8 shrink-0 items-center justify-center rounded-md text-nav-idle transition-colors hover:bg-dash-border/40";

const drawerRowClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useIsAdmin();
  const fullName = useSessionFullName();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const onUnread = (e: Event) => setUnreadCount((e as CustomEvent<number>).detail);
    window.addEventListener(UNREAD_EVENT, onUnread);
    return () => window.removeEventListener(UNREAD_EVENT, onUnread);
  }, []);
  const activeSection = findActiveSection(pathname);

  // Mobile drawer only: lock the page behind it and let Escape close it.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isProfileOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[70px] items-center gap-4 border-b border-nav-idle bg-dash-bg px-4 lg:px-7 xl:gap-6">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={isDrawerOpen}
          className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-dash-ink transition-colors hover:bg-dash-border/40 lg:hidden"
        >
          <MenuIcon className="h-3.5 w-[18px]" />
        </button>

        <Link
          href="/dashboard"
          className="shrink-0 font-serif text-2xl font-bold tracking-[-0.48px] text-dash-ink"
          style={wordmarkStyle}
        >
          manzil.com
        </Link>

        {/* Auto margins centre the tabs yet still let them scroll from the first one when they overflow. */}
        <nav className="hide-scrollbar hidden h-full min-w-0 flex-1 items-center gap-4 overflow-x-auto lg:flex xl:gap-6 [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto">
          {NAV_SECTIONS.map((section) => {
            const href = sectionHref(section);
            if (!href) {
              return (
                <span
                  key={section.label}
                  aria-disabled="true"
                  title="Coming soon"
                  className="shrink-0 cursor-not-allowed whitespace-nowrap text-xs leading-[1.4] text-nav-idle/60"
                >
                  {section.label}
                </span>
              );
            }
            const isActive = section === activeSection;
            return (
              <Link
                key={section.label}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap leading-[1.4] transition-colors ${
                  isActive
                    ? "rounded-md bg-nav-active px-2.5 py-[5px] text-sm font-bold text-nav-active-fg"
                    : "text-xs text-nav-idle hover:text-dash-ink"
                }`}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 lg:ml-0 xl:gap-6">
          <Link href="/help" aria-label="Help" className={iconButtonClass}>
            <Icon name="help" className="size-[18px]" />
          </Link>
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
              aria-expanded={isNotificationsOpen}
              className={`${iconButtonClass} relative`}
            >
              <Icon name="bell" className="size-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hot px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {isNotificationsOpen && <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((open) => !open)}
              aria-label="Account menu"
              aria-expanded={isProfileOpen}
              className="flex size-8 items-center justify-center rounded-full bg-avatar text-[11px] leading-[1.4] text-nav-active-fg"
            >
              {initials(fullName)}
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-md border border-dash-border bg-white py-1 shadow-lg">
                <div className="border-b border-dash-border px-4 py-3">
                  <p className="truncate text-sm font-semibold capitalize text-dash-ink">{fullName}</p>
                  <p className="text-xs text-nav-idle">{admin ? "Admin" : "Agent"}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-dash-ink transition-colors hover:bg-dash-bg"
                >
                  <SettingsIcon className="size-4 shrink-0" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-dash-ink transition-colors hover:bg-hot/10 hover:text-hot"
                >
                  <LogoutIcon className="size-4 shrink-0" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[256px] max-w-[85vw] flex-col border-r border-dash-border bg-sidebar p-4 transition-transform duration-300 lg:hidden ${
          isDrawerOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-6 pt-2">
          <p className="font-serif text-2xl font-bold tracking-[-0.48px] text-dash-ink" style={wordmarkStyle}>
            manzil.com
          </p>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close menu"
            className="flex size-8 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-border/40 hover:text-dash-ink"
          >
            <CloseIcon className="size-3.5" />
          </button>
        </div>

        <nav className="hide-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {[...NAV_SECTIONS, { label: "Support", items: [HELP_ITEM] }].map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              {section.items.length > 1 && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-[1px] text-nav-idle">{section.label}</p>
              )}
              {section.items.map((item) => {
                if (!item.href) {
                  return (
                    <span
                      key={item.label}
                      aria-disabled="true"
                      className={`${drawerRowClass} cursor-not-allowed text-nav-idle/60`}
                    >
                      <Icon name={item.icon} className="size-5" />
                      {item.label}
                    </span>
                  );
                }
                const isActive = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`${drawerRowClass} ${
                      isActive
                        ? "bg-nav-active font-bold text-nav-active-fg"
                        : "text-nav-idle hover:bg-dash-border/40 hover:text-dash-ink"
                    }`}
                  >
                    <Icon name={item.icon} className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
