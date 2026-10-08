"use client";

import { useState, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { PartnerProject, PartnerProjectInput } from "@/lib/api";
import { PROJECT_TYPES } from "@/lib/inventory";

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

export type PartnerDraft = PartnerProjectInput;

type PartnerFormModalProps = {
  initial: PartnerProject | null;
  categories: SelectOption[];
  interests: SelectOption[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (draft: PartnerDraft) => void;
};

export function PartnerFormModal({
  initial,
  categories,
  interests,
  isSaving,
  error,
  onClose,
  onSubmit,
}: PartnerFormModalProps) {
  const [projectName, setProjectName] = useState(initial?.project_name ?? "");
  const [developer, setDeveloper] = useState(initial?.developer ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [category, setCategory] = useState(initial?.category_id ?? "");
  const [interest, setInterest] = useState(initial?.interest_id ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [projectType, setProjectType] = useState(initial?.project_type ?? "exclusive");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [grade, setGrade] = useState(initial?.grade ?? "");
  const [tokenAmount, setTokenAmount] = useState(initial?.token_amount != null ? String(initial.token_amount) : "");
  const [pdpPercent, setPdpPercent] = useState(initial?.pdp_percent != null ? String(initial.pdp_percent) : "");
  const [cdpPercent, setCdpPercent] = useState(initial?.cdp_percent != null ? String(initial.cdp_percent) : "");

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      project_name: projectName,
      developer: developer || undefined,
      category_id: category || undefined,
      interest_id: interest || undefined,
      city: city || undefined,
      location: location || undefined,
      price: price ? Number(price) : undefined,
      description: description || undefined,
      project_type: projectType,
      is_active: isActive,
      // Sent even when empty so clearing the field on an edit actually clears it.
      grade,
      token_amount: tokenAmount ? Number(tokenAmount) : undefined,
      pdp_percent: pdpPercent ? Number(pdpPercent) : undefined,
      cdp_percent: cdpPercent ? Number(cdpPercent) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-sidebar shadow-lg"
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              className="font-serif text-2xl font-bold text-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {initial ? "Edit project" : "New project"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              A developer&apos;s project your team markets. Visible to everyone.
            </p>
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-project" className="text-sm text-muted">
                Project name
              </label>
              <input
                id="partner-project"
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Skyline Heights"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-developer" className="text-sm text-muted">
                Developer
              </label>
              <input
                id="partner-developer"
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="Developer / builder"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-city" className="text-sm text-muted">
                City
              </label>
              <input
                id="partner-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lahore"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-location" className="text-sm text-muted">
                Location
              </label>
              <input
                id="partner-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Area"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-category" className="text-sm text-muted">
                Category
              </label>
              <Select
                id="partner-category"
                value={category}
                onChange={setCategory}
                options={categories}
                placeholder="Select"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-interest" className="text-sm text-muted">
                Property type
              </label>
              <Select
                id="partner-interest"
                value={interest}
                onChange={setInterest}
                options={interests}
                placeholder="Select"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-price" className="text-sm text-muted">
                Starting price (PKR)
              </label>
              <input
                id="partner-price"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-type" className="text-sm text-muted">
                Type
              </label>
              <Select id="partner-type" value={projectType} onChange={setProjectType} options={PROJECT_TYPES} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-grade" className="text-sm text-muted">
                Grade (optional)
              </label>
              <input
                id="partner-grade"
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. A+"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-active" className="text-sm text-muted">
                Status
              </label>
              <Select
                id="partner-active"
                value={isActive ? "active" : "inactive"}
                onChange={(v) => setIsActive(v === "active")}
                options={[
                  { id: "active", name: "Active" },
                  { id: "inactive", name: "Inactive" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-token" className="text-sm text-muted">
                Token (PKR)
              </label>
              <input
                id="partner-token"
                type="number"
                min="0"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-pdp" className="text-sm text-muted">
                Partial down payment (%)
              </label>
              <input
                id="partner-pdp"
                type="number"
                min="0"
                max="100"
                step="any"
                value={pdpPercent}
                onChange={(e) => setPdpPercent(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-cdp" className="text-sm text-muted">
                Complete down payment (%)
              </label>
              <input
                id="partner-cdp"
                type="number"
                min="0"
                max="100"
                step="any"
                value={cdpPercent}
                onChange={(e) => setCdpPercent(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="partner-description" className="text-sm text-muted">
              Details (optional)
            </label>
            <textarea
              id="partner-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Payment plan, features…"
              className={`${inputClass} resize-y`}
            />
          </div>

          {error && <p className="text-sm text-hot">{error}</p>}

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
              {isSaving ? "Saving…" : initial ? "Save changes" : "Add project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
