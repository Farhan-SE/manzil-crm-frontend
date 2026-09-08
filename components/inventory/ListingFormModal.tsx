"use client";

import { useState, type SubmitEvent } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { Listing, ListingInput } from "@/lib/api";

const inputClass =
  "w-full min-w-0 rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

export type ListingDraft = ListingInput;

type ListingFormModalProps = {
  initial: Listing | null;
  categories: SelectOption[];
  interests: SelectOption[];
  agents: SelectOption[];
  showAssignee: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (draft: ListingDraft) => void;
};

export function ListingFormModal({
  initial,
  categories,
  interests,
  agents,
  showAssignee,
  isSaving,
  error,
  onClose,
  onSubmit,
}: ListingFormModalProps) {
  const [clientName, setClientName] = useState(initial?.client_name ?? "");
  const [clientNumber, setClientNumber] = useState(initial?.client_number ?? "");
  const [areaName, setAreaName] = useState(initial?.area_name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [category, setCategory] = useState(initial?.category_id ?? "");
  const [interest, setInterest] = useState(initial?.interest_id ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assignedTo, setAssignedTo] = useState(
    initial?.assigned_to ? String(initial.assigned_to.id) : "",
  );

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      area_name: areaName,
      client_name: clientName,
      client_number: clientNumber,
      category_id: category || undefined,
      interest_id: interest || undefined,
      city: city || undefined,
      location: location || undefined,
      price: price ? Number(price) : undefined,
      description: description || undefined,
      assigned_to_id: assignedTo ? Number(assignedTo) : undefined,
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
              {initial ? "Edit listing" : "Seller lead"}
            </h2>
            <p className="mt-0.5 text-xs text-dash-muted">
              A client selling their property. Contact stays visible to admins and the assigned agent.
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
              <label htmlFor="listing-client" className="text-sm text-dash-muted">
                Client name
              </label>
              <input
                id="listing-client"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Seller's name"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="listing-number" className="text-sm text-dash-muted">
                Client number
              </label>
              <input
                id="listing-number"
                type="tel"
                required
                value={clientNumber}
                onChange={(e) => setClientNumber(e.target.value)}
                placeholder="03xx-xxxxxxx"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="listing-area" className="text-sm text-dash-muted">
              Area name
            </label>
            <input
              id="listing-area"
              type="text"
              required
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="e.g. Bahria Town, Precinct 5"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="listing-city" className="text-sm text-dash-muted">
                City
              </label>
              <input
                id="listing-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Karachi"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="listing-location" className="text-sm text-dash-muted">
                Block / sector
              </label>
              <input
                id="listing-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Block C"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="listing-category" className="text-sm text-dash-muted">
                Category
              </label>
              <Select
                id="listing-category"
                value={category}
                onChange={setCategory}
                options={categories}
                placeholder="Select"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="listing-interest" className="text-sm text-dash-muted">
                Property type
              </label>
              <Select
                id="listing-interest"
                value={interest}
                onChange={setInterest}
                options={interests}
                placeholder="Select"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="listing-price" className="text-sm text-dash-muted">
                Asking price (PKR)
              </label>
              <input
                id="listing-price"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {showAssignee && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="listing-assignee" className="text-sm text-dash-muted">
                Assign to
              </label>
              <Select
                id="listing-assignee"
                value={assignedTo}
                onChange={setAssignedTo}
                options={agents}
                placeholder="Unassigned"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="listing-description" className="text-sm text-dash-muted">
              Description (optional)
            </label>
            <textarea
              id="listing-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Size, features, notes…"
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
              {isSaving ? "Saving…" : initial ? "Save changes" : "Add to inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
