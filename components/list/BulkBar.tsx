"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Listbox } from "@/components/ui/Listbox";
import { getAgents } from "@/lib/api";

const buttonClass =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-white px-3 text-xs text-primary transition-colors hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60";

/**
 * What can be done to the ticked rows of a list. Assigning is for admins; anyone can
 * favourite or export what they picked.
 */
export function BulkBar({
  count,
  noun,
  canAssign,
  onAssign,
  onFavourite,
  onExport,
  onClear,
}: {
  count: number;
  noun: string;
  canAssign: boolean;
  onAssign: (userId: number) => Promise<void>;
  onFavourite: () => Promise<void>;
  onExport: () => void;
  onClear: () => void;
}) {
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState<"assign" | "favourite" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAssign) return;
    getAgents()
      .then((list) => setStaff(list.map((agent) => ({ id: String(agent.id), name: `${agent.first_name} ${agent.last_name}` }))))
      .catch(() => {});
  }, [canAssign]);

  async function run(kind: "assign" | "favourite", action: () => Promise<void>) {
    setError(null);
    setBusy(kind);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="region"
      aria-label="Actions for selected rows"
      className="sticky top-0 z-20 mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-[4px] border border-primary/20 bg-cream px-4 py-2.5 sm:mx-8"
    >
      <p className="text-xs font-bold text-ink">
        {count} {count === 1 ? noun : `${noun}s`} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {canAssign && (
          <Listbox
            value=""
            onChange={(id) => void run("assign", () => onAssign(Number(id)))}
            options={staff}
            label="Assign selected to"
            disabled={busy !== null}
            className={buttonClass}
          >
            {(isOpen) => (
              <>
                <Icon name="staff" className="size-3.5" />
                {busy === "assign" ? "Assigning..." : "Assign to"}
                <Icon name="chevron-down" className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </Listbox>
        )}
        <button type="button" onClick={() => void run("favourite", onFavourite)} disabled={busy !== null} className={buttonClass}>
          <span aria-hidden="true">★</span>
          {busy === "favourite" ? "Saving..." : "Add to favourites"}
        </button>
        <button type="button" onClick={onExport} disabled={busy !== null} className={buttonClass}>
          <Icon name="download" className="size-3.5" />
          Export
        </button>
      </div>
      <button type="button" onClick={onClear} className="ml-auto text-xs text-muted hover:text-ink hover:underline">
        Clear selection
      </button>
      {error && <p className="w-full text-xs text-hot">{error}</p>}
    </div>
  );
}
