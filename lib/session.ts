"use client";

import { useSyncExternalStore } from "react";
import { getSessionUser } from "@/lib/api";

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

export function useIsAdmin() {
  return useSyncExternalStore(
    subscribe,
    () => getSessionUser()?.role === "admin",
    () => false,
  );
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
