"use client";

import { useState, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { PartnerProject, PartnerProjectInput } from "@/lib/api";

const inputClass =
  "w-full min-w-0 rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

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
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-sidebar shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-4">
          <div className="min-w-0">
            <h2
              className="font-serif text-2xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {initial ? "Edit project" : "Partner project"}
            </h2>
            <p className="mt-0.5 text-xs text-dash-muted">
              A developer&apos;s project your team markets. Visible to everyone.
            </p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-project" className="text-sm text-dash-muted">
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
              <label htmlFor="partner-developer" className="text-sm text-dash-muted">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-city" className="text-sm text-dash-muted">
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
              <label htmlFor="partner-location" className="text-sm text-dash-muted">
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

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-category" className="text-sm text-dash-muted">
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
              <label htmlFor="partner-interest" className="text-sm text-dash-muted">
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
              <label htmlFor="partner-price" className="text-sm text-dash-muted">
                Price (PKR, optional)
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="partner-description" className="text-sm text-dash-muted">
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-dash-ink"
            >
              {isSaving ? "Saving…" : initial ? "Save changes" : "Add project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
