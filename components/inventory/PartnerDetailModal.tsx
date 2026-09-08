"use client";

import { MapPinIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import type { PartnerProject } from "@/lib/api";

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
      <div className="w-full max-w-lg rounded-xl bg-sidebar shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-4">
          <div className="min-w-0">
            <h2
              className="truncate font-serif text-2xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {project.project_name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dash-muted">
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
            <p className="text-lg font-bold text-dash-ink">{formatPrice(project.price)}</p>
          </div>

          {project.description && (
            <p className="text-sm leading-relaxed text-dash-ink">{project.description}</p>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-dash-border pt-4">
            {canManage ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex shrink-0 items-center gap-2 text-sm font-medium text-red-600 transition-colors hover:text-red-700"
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
