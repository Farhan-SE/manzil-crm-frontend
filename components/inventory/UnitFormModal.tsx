"use client";

import { useState, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { Unit, UnitInput, UnitStatus } from "@/lib/api";
import { UNIT_STATUS_OPTIONS } from "@/lib/inventory";

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

type UnitFormModalProps = {
  initial: Unit | null;
  /** Preselected for a new unit when the list is already filtered to one project. */
  defaultProjectId: string;
  projects: SelectOption[];
  unitTypes: string[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (draft: UnitInput) => void;
};

export function UnitFormModal({
  initial,
  defaultProjectId,
  projects,
  unitTypes,
  isSaving,
  error,
  onClose,
  onSubmit,
}: UnitFormModalProps) {
  const [projectId, setProjectId] = useState(initial?.project_id ?? defaultProjectId);
  const [unitNumber, setUnitNumber] = useState(initial?.unit_number ?? "");
  const [unitType, setUnitType] = useState(initial?.unit_type ?? "");
  const [features, setFeatures] = useState(initial?.features ?? "");
  const [floor, setFloor] = useState(initial?.floor ?? "");
  const [beds, setBeds] = useState(initial?.beds != null ? String(initial.beds) : "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [area, setArea] = useState(initial?.area_sqft != null ? String(initial.area_sqft) : "");
  const [status, setStatus] = useState<UnitStatus>(initial?.status ?? "available");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) return setLocalError("Select the project this unit belongs to.");
    setLocalError(null);
    onSubmit({
      project_id: projectId,
      unit_number: unitNumber,
      // Text fields go even when empty so clearing one on an edit actually clears it.
      unit_type: unitType,
      features,
      floor,
      beds: beds ? Number(beds) : undefined,
      price: price ? Number(price) : undefined,
      area_sqft: area ? Number(area) : undefined,
      status,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-sidebar shadow-lg"
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <h2
            className="font-serif text-2xl font-bold text-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {initial ? "Edit unit" : "New unit"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-project" className="text-sm text-muted">
                Project
                <span className="text-hot"> *</span>
              </label>
              <Select
                id="unit-project"
                value={projectId}
                onChange={setProjectId}
                options={projects}
                placeholder="Select project"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-number" className="text-sm text-muted">
                Unit number
                <span className="text-hot"> *</span>
              </label>
              <input
                id="unit-number"
                type="text"
                required
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g. Shop-1"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-type" className="text-sm text-muted">
                Unit type
              </label>
              <input
                id="unit-type"
                type="text"
                list="unit-type-options"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                placeholder="e.g. Shop, Hotel Apartment"
                className={inputClass}
              />
              {/* Suggests the types already in use so the same type isn't spelled two ways. */}
              <datalist id="unit-type-options">
                {unitTypes.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-floor" className="text-sm text-muted">
                Floor / location
              </label>
              <input
                id="unit-floor"
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. Tenth floor"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-price" className="text-sm text-muted">
                Price (PKR)
              </label>
              <input
                id="unit-price"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-area" className="text-sm text-muted">
                Area (sq ft)
              </label>
              <input
                id="unit-area"
                type="number"
                min="0"
                step="any"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-beds" className="text-sm text-muted">
                Beds
              </label>
              <input
                id="unit-beds"
                type="number"
                min="0"
                step="1"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="—"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-features" className="text-sm text-muted">
                Features
              </label>
              <input
                id="unit-features"
                type="text"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="e.g. Corner, park facing"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit-status" className="text-sm text-muted">
                Status
              </label>
              <Select
                id="unit-status"
                value={status}
                onChange={(v) => setStatus(v as UnitStatus)}
                options={UNIT_STATUS_OPTIONS}
              />
            </div>
          </div>

          {(localError ?? error) && <p className="text-sm text-hot">{localError ?? error}</p>}

          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink"
            >
              {isSaving ? "Saving…" : initial ? "Save changes" : "Add unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
