"use client";

import { useEffect, useState } from "react";
import { TrashIcon } from "@/components/icons/DashboardIcons";
import { getMedia, type MediaItem, type Unit } from "@/lib/api";
import { UNIT_STATUSES } from "@/lib/inventory";
import { formatLakhCrore } from "@/lib/money";

type UnitDetailModalProps = {
  unit: Unit;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export function UnitDetailModal({ unit, canManage, onClose, onEdit, onDelete }: UnitDetailModalProps) {
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMedia({ unit_id: unit.id })
      .then((items) => !cancelled && setMedia(items))
      .catch(() => !cancelled && setMediaError(true));
    return () => {
      cancelled = true;
    };
  }, [unit.id]);

  const status = UNIT_STATUSES.find((entry) => entry.id === unit.status);
  const statusLabel =
    unit.approval_status === "approved"
      ? (status?.label ?? unit.status)
      : unit.approval_status === "pending"
        ? "Awaiting approval"
        : "Not approved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-sidebar shadow-lg"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              className="truncate font-serif text-2xl font-bold text-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Unit {unit.unit_number}
            </h2>
            <p className="mt-1 truncate text-xs text-muted">
              {unit.project?.name ?? "—"} · {unit.inventory_type === "partner" ? "Partner inventory" : "Direct inventory"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-muted transition-colors hover:text-ink">
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.className ?? "bg-badge-neutral text-muted"}`}>
              {statusLabel}
            </span>
            <p className="text-lg font-bold text-ink">{unit.price != null ? formatLakhCrore(unit.price) : "Price not set"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-white p-4 sm:grid-cols-4">
            <Fact label="Type" value={unit.unit_type || "—"} />
            <Fact label="Beds" value={unit.beds != null ? String(unit.beds) : "—"} />
            <Fact label="Floor" value={unit.floor || "—"} />
            <Fact label="Area" value={unit.area_sqft != null ? `${unit.area_sqft.toLocaleString()} sqft` : "—"} />
          </div>

          {unit.features && (
            <div>
              <p className="text-[11px] text-muted">Features</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">{unit.features}</p>
            </div>
          )}

          {unit.lead && (
            <p className="text-sm text-ink">
              <span className="text-muted">Booked by </span>
              Lead {unit.lead.lead_no} · {unit.lead.client_name}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-muted">Photos &amp; videos</p>
            {mediaError ? (
              <p className="text-xs text-hot">Couldn&apos;t load the photos and videos.</p>
            ) : media === null ? (
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-border/60" />
                ))}
              </div>
            ) : media.length === 0 ? (
              <p className="text-xs text-placeholder">No photos or videos yet.{canManage ? " Add them from Edit." : ""}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {media.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${item.file_name}`}
                    className="group relative block aspect-square overflow-hidden rounded-lg border border-border bg-white"
                  >
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs, not optimisable assets
                      <img src={item.url} alt="" className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                    ) : (
                      <>
                        <video src={item.url} muted preload="metadata" className="size-full object-cover" />
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-white">Video</span>
                      </>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            {canManage ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex shrink-0 items-center gap-2 text-sm font-medium text-hot transition-colors hover:text-hot"
              >
                <TrashIcon className="size-3.5" />
                Delete unit
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <button type="button" onClick={onClose} className="text-sm font-medium text-muted transition-colors hover:text-ink">
                Close
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
