"use client";

import { useSyncExternalStore } from "react";
import { getMe, getSessionUser, type Me, type Permissions, type Scope } from "@/lib/api";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("unauthorized", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("unauthorized", onChange);
  };
}

// The token lives in storage, which the server can't read. These return the server
// snapshot on the first render so the markup matches, then the real value on hydration.
// Snapshots must be primitives — returning a fresh object each call would loop.

export function useIsSuperAdmin() {
  return useSyncExternalStore(
    subscribe,
    () => getSessionUser()?.role === "super_admin",
    () => false,
  );
}

// ── Access: the signed-in member's role and permissions ──────────────────────
// Permissions aren't in the token, so they come from /auth/me: once per user per page load,
// with a sessionStorage copy so a reload paints the right menus before the request returns.

type Access = { userId: number; role: Me["role"]; permissions: Permissions; company: Me["company"] };

const ACCESS_CACHE_KEY = "access";
let access: Access | null = null;
let loadingFor: number | null = null;
const accessListeners = new Set<() => void>();

function notifyAccess() {
  for (const listener of accessListeners) listener();
}

function readCachedAccess(userId: number): Access | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(ACCESS_CACHE_KEY) ?? "null") as Access | null;
    return cached?.userId === userId ? cached : null;
  } catch {
    return null;
  }
}

/** Fetches the member's access again, e.g. after their role was changed. */
export function refreshAccess() {
  const user = getSessionUser();
  if (!user || user.role === "super_admin") {
    access = null;
    notifyAccess();
    return;
  }
  loadingFor = user.id;
  getMe()
    .then((me) => {
      if (getSessionUser()?.id !== me.id) return;
      access = { userId: me.id, role: me.role, permissions: me.permissions, company: me.company };
      try {
        sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify(access));
      } catch {}
      notifyAccess();
    })
    .catch(() => {})
    .finally(() => {
      loadingFor = null;
    });
}

function ensureAccess() {
  const user = getSessionUser();
  if (!user) {
    if (access) {
      access = null;
      notifyAccess();
    }
    return;
  }
  if (access?.userId === user.id || loadingFor === user.id) return;
  access = readCachedAccess(user.id);
  if (access) notifyAccess();
  refreshAccess();
}

function subscribeAccess(onChange: () => void) {
  accessListeners.add(onChange);
  window.addEventListener("storage", ensureAccess);
  window.addEventListener("unauthorized", ensureAccess);
  ensureAccess();
  return () => {
    accessListeners.delete(onChange);
    window.removeEventListener("storage", ensureAccess);
    window.removeEventListener("unauthorized", ensureAccess);
  };
}

// Only the signed-in user's access: after a logout the old object lingers until the next load,
// and the first render after someone else signs in must not show their menus or logo.
function accessSnapshot() {
  return access && access.userId === getSessionUser()?.id ? access : null;
}

/** The member's role and permissions; null until loaded (and on the server). */
export function useAccess() {
  return useSyncExternalStore(subscribeAccess, accessSnapshot, () => null);
}

/** The member's company name and logo, for the top bar. */
export function useCompanyBranding() {
  return useAccess()?.company ?? null;
}

/** Whether the member's role holds this permission. False until access has loaded. */
export function useCan(permission: string) {
  return Boolean(useAccess()?.permissions[permission]);
}

/** How far a scoped permission reaches for this member, or null without it. */
export function useScope(permission: string): Scope | null {
  const grant = useAccess()?.permissions[permission];
  return grant === "own" || grant === "team" || grant === "all" ? grant : null;
}

/** Non-hook check for code that reads permissions once, outside render. */
export function can(permission: string) {
  return Boolean(accessSnapshot()?.permissions[permission]);
}

/**
 * Whether a record owned by `ownerId` is in reach. A team scope is let through: the client can't
 * tell who is on the member's team, and the server refuses anything outside it.
 */
export function reaches(scope: Scope | null, ownerId: number | null | undefined, userId: number | null | undefined) {
  if (scope === "all" || scope === "team") return true;
  return scope === "own" && ownerId != null && ownerId === userId;
}

export function useSessionFullName() {
  return useSyncExternalStore(
    subscribe,
    () => {
      const user = getSessionUser();
      return user ? `${user.first_name} ${user.last_name}`.trim() : "";
    },
    () => "",
  );
}

export function useSessionEmail() {
  return useSyncExternalStore(
    subscribe,
    () => getSessionUser()?.email ?? "",
    () => "",
  );
}
