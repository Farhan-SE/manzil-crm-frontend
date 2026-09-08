"use client";

import { LockIcon, MapPinIcon, PhoneIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import type { Listing } from "@/lib/api";

function formatPrice(price: number | null) {
  return price == null ? "Not set" : `PKR ${price.toLocaleString()}`;
}

type ListingDetailModalProps = {
  listing: Listing;
  categoryName: string;
  interestName: string;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ListingDetailModal({
  listing,
  categoryName,
  interestName,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: ListingDetailModalProps) {
  const assignedName = listing.assigned_to
    ? `${listing.assigned_to.first_name} ${listing.assigned_to.last_name}`
    : "Unassigned";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-sidebar shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-4">
          <div className="min-w-0">
            <h2
              className="truncate font-serif text-2xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {listing.area_name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dash-muted">
              <MapPinIcon className="size-3" />
              {[listing.location, listing.city].filter(Boolean).join(", ") || "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-dash-muted transition-colors hover:text-dash-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-badge-neutral px-3 py-1 text-xs font-semibold text-dash-ink">
                {categoryName}
              </span>
              <span className="rounded-full border border-dash-border px-3 py-1 text-xs font-semibold text-dash-muted">
                {interestName}
              </span>
            </div>
            <p className="text-lg font-bold text-dash-ink">{formatPrice(listing.price)}</p>
          </div>

          {listing.description && (
            <p className="text-sm leading-relaxed text-dash-ink">{listing.description}</p>
          )}

          <div className="rounded-xl border border-dash-border bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.6px] text-dash-muted">Seller contact</p>
            {listing.can_see_contact ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-dash-ink">{listing.client_name}</p>
                <a
                  href={`tel:${listing.client_number}`}
                  className="mt-1 flex items-center gap-2 text-sm text-dash-muted transition-colors hover:text-dash-ink"
                >
                  <PhoneIcon className="size-3.5" />
                  {listing.client_number}
                </a>
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-dash-placeholder">
                <LockIcon className="size-3.5" />
                Visible to admins and the assigned agent only.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-dash-border pt-4">
            <p className="text-sm text-dash-muted">Handled by</p>
            <p className="text-sm font-semibold capitalize text-dash-ink">{assignedName}</p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            {canManage ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex shrink-0 items-center gap-2 text-sm font-medium text-red-600 transition-colors hover:text-red-700"
              >
                <TrashIcon className="size-3.5" />
                Delete listing
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
              >
                Close
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
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
