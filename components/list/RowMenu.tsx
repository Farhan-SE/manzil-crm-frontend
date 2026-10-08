"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type RowMenuItem = { label: string; href?: string; external?: boolean; onClick?: () => void };

const MENU_WIDTH = 176;

const itemClass = "block w-full px-4 py-2 text-left text-xs text-dash-ink hover:bg-dash-bg";

export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    // The menu is fixed to the viewport, so it would drift off its row on scroll or resize.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  function toggle() {
    if (position || !buttonRef.current) return setPosition(null);
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={position !== null}
        aria-label={label}
        className="flex size-6 items-center justify-center text-primary"
      >
        <Icon name="ellipsis" className="size-4" />
      </button>

      {position && (
        // Fixed rather than absolute: the table scrolls horizontally, which would clip the menu.
        <div
          ref={menuRef}
          role="menu"
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-50 rounded-md border border-dash-border bg-white py-1 shadow-lg"
        >
          {items.map((item) =>
            item.href && item.external ? (
              <a
                key={item.label}
                role="menuitem"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPosition(null)}
                className={itemClass}
              >
                {item.label}
              </a>
            ) : item.href ? (
              <Link key={item.label} role="menuitem" href={item.href} className={itemClass}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPosition(null);
                  item.onClick?.();
                }}
                className={itemClass}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}
