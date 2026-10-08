"use client";

import { useEffect } from "react";

const DIALOG = '[role="dialog"][aria-modal="true"]';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function topDialog() {
  const dialogs = document.querySelectorAll<HTMLElement>(DIALOG);
  return dialogs[dialogs.length - 1] ?? null;
}

/**
 * Gives every modal in the app the keyboard behaviour of a dialog, in one place: focus moves
 * into it when it opens and back to where it was when it closes, Tab stays inside it, and
 * Escape closes it the same way a click on its backdrop would.
 */
export function DialogKeyboard() {
  useEffect(() => {
    let opener: HTMLElement | null = null;
    let current: HTMLElement | null = null;

    function sync() {
      const dialog = topDialog();
      if (dialog === current) return;
      if (dialog) {
        if (!current) opener = document.activeElement as HTMLElement | null;
        // Named by its own heading, for screen readers.
        const heading = dialog.querySelector("h2, h1");
        if (heading && !dialog.hasAttribute("aria-labelledby") && !dialog.hasAttribute("aria-label")) {
          heading.id ||= `dialog-title-${Math.random().toString(36).slice(2, 8)}`;
          dialog.setAttribute("aria-labelledby", heading.id);
        }
        if (!dialog.contains(document.activeElement)) {
          dialog.tabIndex = -1;
          (dialog.querySelector<HTMLElement>("[autofocus]") ?? dialog).focus({ preventScroll: true });
        }
      } else if (opener?.isConnected) {
        opener.focus({ preventScroll: true });
      }
      current = dialog;
    }

    function handleKey(e: KeyboardEvent) {
      const dialog = topDialog();
      // A dropdown or search list inside the dialog marks its own Escape as handled.
      if (!dialog || e.defaultPrevented) return;
      if (e.key === "Escape") {
        // The backdrop is the dialog's parent and already knows how to close it.
        dialog.parentElement?.click();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null);
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement;
      // A floating dropdown panel opened from the dialog is rendered inside it, so it stays in the loop.
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", handleKey);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return null;
}
