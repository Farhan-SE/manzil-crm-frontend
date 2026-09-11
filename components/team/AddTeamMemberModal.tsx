"use client";

import { useState, type SubmitEvent } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { addUser, type TeamMember } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

const ROLE_OPTIONS: SelectOption[] = [
  { id: "agent", name: "Agent" },
  { id: "admin", name: "Admin" },
];

export function AddTeamMemberModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ user: TeamMember; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await addUser({
        first_name: firstName,
        last_name: lastName,
        email,
        user_role: role,
      });
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
        onClick={(e) => e.stopPropagation()}
      >
        {created ? (
          // Deliberately no auto-close: this is the only time the password is ever shown.
          <div className="flex flex-col items-center gap-3 px-4 py-8 animate-[fade-in_300ms_ease-out] sm:px-6">
            <DotLottieReact
              src="/login/success.lottie"
              autoplay
              loop={false}
              style={{ width: 140, height: 140 }}
            />
            <p
              className="font-serif text-xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {created.user.first_name} added
            </p>
            <p className="text-center text-sm text-dash-muted">
              Share this password with them — it won&apos;t be shown again.
            </p>

            <div className="mt-1 flex w-full items-center gap-3 rounded-xl border border-dash-border bg-white px-4 py-3">
              <code className="flex-1 select-all break-all font-mono text-sm font-semibold text-dash-ink">
                {created.password}
              </code>
              <button
                type="button"
                onClick={copyPassword}
                className="shrink-0 rounded-lg border border-dash-border px-3 py-1.5 text-xs font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="text-xs text-dash-muted">{created.user.email}</p>

            {error && <p className="text-sm text-hot">{error}</p>}

            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-dash-border px-4 py-4 sm:px-6">
              <h2
                className="font-serif text-2xl font-bold text-dash-ink"
                style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                Add team member
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-dash-muted transition-colors hover:text-dash-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="member-first-name" className="text-sm text-dash-muted">
                    First name
                    <span className="text-hot"> *</span>
                  </label>
                  <input
                    id="member-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sara"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="member-last-name" className="text-sm text-dash-muted">
                    Last name
                    <span className="text-hot"> *</span>
                  </label>
                  <input
                    id="member-last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Iqbal"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="member-email" className="text-sm text-dash-muted">
                  Email
                  <span className="text-hot"> *</span>
                </label>
                <input
                  id="member-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@manzil.com"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="member-role" className="text-sm text-dash-muted">
                  Role
                  <span className="text-hot"> *</span>
                </label>
                <Select
                  id="member-role"
                  value={role}
                  onChange={(v) => setRole(v as "admin" | "agent")}
                  options={ROLE_OPTIONS}
                />
                <p className="text-xs text-dash-muted">
                  Admins see every lead, customer and listing. Agents see only what&apos;s assigned
                  to them.
                </p>
              </div>

              {error && <p className="text-sm text-hot">{error}</p>}

              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Adding..." : "Add member"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
