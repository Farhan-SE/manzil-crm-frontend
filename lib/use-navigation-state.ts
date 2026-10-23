"use client";

import { useEffect, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { navigationState } from "./navigation-state-store";

/** Keep list controls on return without preserving open forms or row selections. */
export function useNavigationState<T>(name: string, initial: T | (() => T), namespace = ""): [T, Dispatch<SetStateAction<T>>] {
  const pathname = usePathname();
  const key = `${pathname}:${namespace}:${name}`;
  const read = () => {
    if (navigationState.has(key)) return navigationState.get(key) as T;
    return typeof initial === "function" ? (initial as () => T)() : initial;
  };
  const [previousKey, setPreviousKey] = useState(key);
  const [value, setValue] = useState<T>(read);
  // The router may reuse a component for a different search link or inventory route.
  if (previousKey !== key) {
    setPreviousKey(key);
    setValue(() => read());
  }
  useEffect(() => {
    // Limit retained pages when many different search links are opened in one session.
    if (!navigationState.has(key) && navigationState.size >= 300) {
      navigationState.delete(navigationState.keys().next().value!);
    }
    navigationState.set(key, value);
  }, [key, value]);
  return [value, setValue];
}

/** Restore only once the rows exist, so a loading skeleton cannot clamp the saved scroll. */
export function useNavigationScroll(ready: boolean, namespace = "") {
  const pathname = usePathname();
  const key = `${pathname}:${namespace}:scroll`;
  useLayoutEffect(() => {
    if (!ready) return;
    const saved = navigationState.get(key);
    if (typeof saved === "number") window.scrollTo({ top: saved, behavior: "instant" });
    const remember = () => navigationState.set(key, window.scrollY);
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [key, ready]);
}
