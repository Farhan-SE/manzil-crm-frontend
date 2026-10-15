"use client";

import { useState, type SubmitEvent } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { createCompany, uploadCompanyLogo, type Company } from "@/lib/api";
import { LogoField } from "@/components/platform/LogoField";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

type Created = { company: Company; admin: { first_name: string; email: string }; password: string };

export function AddCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createCompany({
        name: name.trim(),
        slug: slug.trim() || undefined,
        admin_first_name: firstName.trim(),
        admin_last_name: lastName.trim(),
        admin_email: email.trim(),
      });
      if (logo) {
        try {
          result.company = await uploadCompanyLogo(result.company.id, logo);
        } catch (err) {
          // The company exists either way; the logo can be added from Edit company.
          setError(`The company was added, but the logo didn't upload: ${err instanceof Error ? err.message : "unknown error"}. Add it from Edit company.`);
        }
      }
      setCreated(result);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the password and copy it manually.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-company-title"
        onClick={(e) => e.stopPropagation()}
      >
        {created ? (
          // Deliberately no auto-close: this is the only time the admin's password is ever shown.
          <div className="flex flex-col items-center gap-3 px-4 py-8 animate-[fade-in_300ms_ease-out] sm:px-6">
            <DotLottieReact src="/login/success.lottie" autoplay loop={false} style={{ width: 140, height: 140 }} />
            <p className="font-serif text-xl font-bold text-ink" style={headingStyle}>
              {created.company.name} is ready
            </p>
            <p className="text-center text-sm text-muted">
              Send {created.admin.first_name} this password — it won&apos;t be shown again. They&apos;ll replace it
              when they first sign in.
            </p>

            <div className="mt-1 flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
              <code className="flex-1 select-all break-all font-mono text-sm font-semibold text-ink">
                {created.password}
              </code>
              <button
                type="button"
                onClick={copyPassword}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-dash-bg"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="text-xs text-muted">{created.admin.email}</p>

            {error && <p className="text-sm text-hot">{error}</p>}

            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
              <h2 id="add-company-title" className="font-serif text-2xl font-bold text-ink" style={headingStyle}>
                Add company
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="company-name" className="text-sm text-muted">
                    Company name
                    <span className="text-hot"> *</span>
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Manzil Properties"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="company-slug" className="text-sm text-muted">
                    Short name
                  </label>
                  <input
                    id="company-slug"
                    type="text"
                    maxLength={60}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    title="Lowercase letters, digits and single dashes"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="Made from the name"
                    className={inputClass}
                  />
                </div>
              </div>

              <LogoField
                currentUrl={null}
                file={logo}
                removed={false}
                onFile={(file) => {
                  setError(null);
                  setLogo(file);
                }}
                onRemove={() => setLogo(null)}
                onError={setError}
              />

              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-ink">Company admin</p>
                <p className="text-xs text-muted">
                  They get the Admin role with full access, and set up the company&apos;s staff and roles.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="company-admin-first" className="text-sm text-muted">
                    First name
                    <span className="text-hot"> *</span>
                  </label>
                  <input
                    id="company-admin-first"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ali"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="company-admin-last" className="text-sm text-muted">
                    Last name
                    <span className="text-hot"> *</span>
                  </label>
                  <input
                    id="company-admin-last"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Khan"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="company-admin-email" className="text-sm text-muted">
                  Email
                  <span className="text-hot"> *</span>
                </label>
                <input
                  id="company-admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className={inputClass}
                />
              </div>

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
                  disabled={isSubmitting}
                  className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Adding..." : "Add company"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
