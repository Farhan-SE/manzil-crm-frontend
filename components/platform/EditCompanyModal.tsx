"use client";

import { useState, type SubmitEvent } from "react";
import { LogoField } from "@/components/platform/LogoField";
import { apiAssetUrl, removeCompanyLogo, updateCompany, uploadCompanyLogo, type Company } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

export function EditCompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company: Company;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameChanged = name.trim() !== company.name;
  const hasChanges = nameChanged || logo !== null || logoRemoved;

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (nameChanged) await updateCompany(company.id, { name: name.trim() });
      if (logo) await uploadCompanyLogo(company.id, logo);
      else if (logoRemoved) await removeCompanyLogo(company.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-company-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2
            id="edit-company-title"
            className="font-serif text-2xl font-bold text-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Edit company
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-company-name" className="text-sm text-muted">
              Company name
              <span className="text-hot"> *</span>
            </label>
            <input
              id="edit-company-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-muted">Short name: {company.slug} — this stays the same.</p>
          </div>

          <LogoField
            currentUrl={company.logo_url ? apiAssetUrl(company.logo_url) : null}
            file={logo}
            removed={logoRemoved}
            onFile={(file) => {
              setError(null);
              setLogo(file);
              if (file) setLogoRemoved(false);
            }}
            onRemove={() => setLogoRemoved(true)}
            onError={setError}
          />
          <p className="-mt-3 text-xs text-muted">
            {company.name}&apos;s staff see this logo in their top bar. Without one, it just says &ldquo;Logo&rdquo;.
          </p>

          {error && <p className="text-sm text-hot">{error}</p>}

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !hasChanges}
              className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
