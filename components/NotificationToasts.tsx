"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons/DashboardIcons";
import { Icon } from "@/components/ui/Icon";
import { getNotifications, getValidToken, markNotificationRead, type AppNotification } from "@/lib/api";
import { armChime, playChime } from "@/lib/chime";

const POLL_MS = 20_000;
const TOAST_MS = 4_000;
const MAX_TOASTS = 3;

/** Fired with the unread count whenever it is learned, so the bell can show its dot. */
export const UNREAD_EVENT = "notifications:unread";

export function announceUnread(count: number) {
  window.dispatchEvent(new CustomEvent<number>(UNREAD_EVENT, { detail: count }));
}

/**
 * Watches for notifications that arrive while the app is open and shows each one in the
 * top-right corner for a few seconds, with a sound. Left alone, it stays in the bell panel.
 */
export function NotificationToasts() {
  const router = useRouter();
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  // Everything already unread when the app opened is old news, not a toast.
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    const disarm = armChime();
    let cancelled = false;

    async function poll() {
      if (!getValidToken()) return;
      try {
        const res = await getNotifications(true);
        if (cancelled) return;
        announceUnread(res.unread_count);
        const fresh = known.current ? res.data.filter((entry) => !known.current!.has(entry.id)) : [];
        known.current = new Set([...(known.current ?? []), ...res.data.map((entry) => entry.id)]);
        if (!fresh.length) return;

        playChime();
        const shown = fresh.slice(0, MAX_TOASTS);
        setToasts((current) => [...shown, ...current].slice(0, MAX_TOASTS));
        setTimeout(() => {
          if (!cancelled) setToasts((current) => current.filter((toast) => !shown.includes(toast)));
        }, TOAST_MS);
      } catch {
        // A failed poll just waits for the next one.
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      disarm();
    };
  }, []);

  const dismiss = (toast: AppNotification) => setToasts((current) => current.filter((entry) => entry !== toast));

  async function open(toast: AppNotification) {
    dismiss(toast);
    await markNotificationRead(toast.id).catch(() => {});
    void getNotifications(true)
      .then((res) => announceUnread(res.unread_count))
      .catch(() => {});
    if (toast.link) router.push(toast.link);
  }

  if (!toasts.length) return null;

  return (
    <div aria-live="polite" className="fixed right-4 top-[78px] z-[70] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-[4px] border border-border bg-white p-3 shadow-lg"
        >
          <button type="button" onClick={() => void open(toast)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-nav-active text-nav-active-fg">
              <Icon name="bell" className="size-4" />
            </span>
            <span className="min-w-0 leading-[1.4]">
              <span className="block truncate text-xs font-bold text-ink">{toast.title}</span>
              {toast.body && <span className="mt-0.5 block truncate text-[11px] text-muted">{toast.body}</span>}
              {toast.link && <span className="mt-1 block text-[11px] text-cold">Open task →</span>}
            </span>
          </button>
          <button
            type="button"
            onClick={() => dismiss(toast)}
            aria-label="Dismiss notification"
            className="shrink-0 p-1 text-muted hover:text-ink"
          >
            <CloseIcon className="size-2" />
          </button>
        </div>
      ))}
    </div>
  );
}
