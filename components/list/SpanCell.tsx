"use client";

import { useLayoutEffect, useRef, type TdHTMLAttributes } from "react";

/**
 * A full-width cell for loading, empty and expanded rows. It spans only the header cells that are
 * showing: spanning the hidden ones too makes a fixed-layout table share width with phantom columns.
 */
export function SpanCell(props: TdHTMLAttributes<HTMLTableCellElement>) {
  const ref = useRef<HTMLTableCellElement>(null);

  useLayoutEffect(() => {
    const cell = ref.current;
    const header = cell?.closest("table")?.tHead?.rows[0];
    if (!cell || !header) return;
    function fit() {
      const visible = [...header!.cells].filter((th) => getComputedStyle(th).display !== "none").length;
      if (visible > 0) cell!.colSpan = visible;
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return <td ref={ref} {...props} />;
}
