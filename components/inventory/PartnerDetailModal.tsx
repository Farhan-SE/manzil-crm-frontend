"use client";

import Link from "next/link";
import { MapPinIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import type { PartnerProject } from "@/lib/api";
import { formatCompact } from "@/lib/inventory";

function formatPrice(price: number | null) {
  return price == null ? "Not set" : `PKR ${price.toLocaleString()}`;
}

type PartnerDetailModalProps = {
  project: PartnerProject;
  categoryName: string;
  interestName: string;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function PartnerDetailModal({
  project,
  categoryName,
  interestName,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: PartnerDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-sidebar shadow-lg"
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              className="truncate font-serif text-2xl font-bold text-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {project.project_name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {project.developer && (
                <>
                  <span>by {project.developer}</span>
                  <span>·</span>
                </>
              )}
              <MapPinIcon className="size-3" />
              {[project.location, project.city].filter(Boolean).join(", ") || "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-badge-neutral px-3 py-1 text-xs font-semibold text-ink">
                {categoryName}
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                {interestName}
              </span>
            </div>
            <p className="text-lg font-bold text-ink">{formatPrice(project.price)}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-white p-3 text-center">
            <div>
              <p className="text-[11px] text-muted">Token</p>
              <p className="text-sm font-semibold text-ink">
                {project.token_amount != null ? `PKR ${formatCompact(project.token_amount)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Partial down payment</p>
              <p className="text-sm font-semibold text-ink">
                {project.pdp_percent != null ? `${project.pdp_percent}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Complete down payment</p>
              <p className="text-sm font-semibold text-ink">
                {project.cdp_percent != null ? `${project.cdp_percent}%` : "—"}
              </p>
            </div>
          </div>

          <Link
            href={`/inventory?project=${project.id}`}
            className="w-fit text-sm font-semibold text-stage-inquiry hover:underline"
          >
            View units — {project.available_units} of {project.total_units} available
          </Link>

          {project.description && (
            <p className="text-sm leading-relaxed text-ink">{project.description}</p>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            {canManage ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex shrink-0 items-center gap-2 text-sm font-medium text-hot transition-colors hover:text-hot"
              >
                <TrashIcon className="size-3.5" />
                Delete project
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-muted transition-colors hover:text-ink"
              >
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
