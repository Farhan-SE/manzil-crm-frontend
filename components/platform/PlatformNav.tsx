"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoutIcon } from "@/components/icons/DashboardIcons";
import { clearToken } from "@/lib/api";
import { useSessionEmail, useSessionFullName } from "@/lib/session";

const wordmarkStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PlatformNav() {
  const router = useRouter();
  const fullName = useSessionFullName();
  const email = useSessionEmail();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center gap-4 border-b border-nav-idle bg-dash-bg px-4 lg:px-7 xl:gap-6">
      <Link
        href="/platform"
        className="shrink-0 font-serif text-2xl font-bold tracking-[-0.48px] text-ink"
        style={wordmarkStyle}
      >
        humarimanzil
      </Link>
      <span className="rounded-[20px] bg-badge-neutral px-3 py-[3px] text-[11px] leading-[1.4] text-primary">
        Platform
      </span>

      <div className="ml-auto flex items-center gap-3">
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
            <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-md border border-border bg-white py-1 shadow-lg">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-semibold capitalize text-ink">{fullName}</p>
                <p className="truncate text-xs text-nav-idle">Platform admin · {email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-hot/10 hover:text-hot"
              >
                <LogoutIcon className="size-4 shrink-0" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
