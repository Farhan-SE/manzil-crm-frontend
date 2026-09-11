"use client";

import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";
import { ViewTransition } from "react";
import { TaxonomyModal } from "@/components/settings/TaxonomyModal";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  changePassword,
  getCategories,
  getInterests,
  getSessionUser,
  getSources,
  type TaxonomyKind,
} from "@/lib/api";
import { useIsAdmin, useSessionFullName } from "@/lib/session";

const inputClass =
  "w-full min-w-0 rounded-xl border border-dash-border bg-white px-4 py-2.5 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

type TaxonomyItem = { id: string; name: string };

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-dash-muted">
        {label}
        {required && <span className="text-hot"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-dash-border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[1px] text-dash-muted">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dash-border py-3 last:border-b-0 last:pb-0 sm:gap-6">
      <p className="shrink-0 text-sm text-dash-muted">{label}</p>
      <div className="min-w-0 text-right text-sm text-dash-ink">{children}</div>
    </div>
  );
}

const FETCHERS = {
  interests: getInterests,
  sources: getSources,
  categories: getCategories,
};

function TaxonomySummary({
  title,
  kind,
  hint,
  refreshKey,
  onManage,
}: {
  title: string;
  kind: TaxonomyKind;
  hint: string;
  /** Bumped by the modal on every change so the card recounts. */
  refreshKey: number;
  onManage: () => void;
}) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    FETCHERS[kind]()
      .then((list) => !cancelled && setItems(list))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [kind, refreshKey]);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-dash-border bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[1px] text-dash-muted">{title}</h2>
        {!isLoading && <span className="text-xs text-dash-muted">{items.length}</span>}
      </div>

      <p className="text-xs text-dash-muted">{hint}</p>

      <div className="flex min-h-[60px] flex-wrap content-start gap-1.5">
        {isLoading && <Skeleton className="h-6 w-full" />}

        {!isLoading && items.length === 0 && (
          <p className="text-sm text-dash-placeholder">Nothing here yet.</p>
        )}

        {!isLoading &&
          items.slice(0, 6).map((item) => (
            <span
              key={item.id}
              className="rounded bg-badge-neutral px-2 py-0.5 text-[11px] text-dash-ink"
            >
              {item.name}
            </span>
          ))}

        {!isLoading && items.length > 6 && (
          <span className="px-1 py-0.5 text-[11px] text-dash-muted">
            +{items.length - 6} more
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onManage}
        className="w-full rounded-lg border border-dash-border px-4 py-2 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
      >
        Manage
      </button>
    </section>
  );
}

const TAXONOMIES: { title: string; kind: TaxonomyKind; hint: string }[] = [
  {
    title: "Interests",
    kind: "interests",
    hint: "What the client is looking for — plot, house, shop.",
  },
  {
    title: "Categories",
    kind: "categories",
    hint: "How the property is classified — residential, commercial.",
  },
  {
    title: "Sources",
    kind: "sources",
    hint: "Where the lead came from — referral, website, walk-in.",
  },
];

export default function SettingsPage() {
  const admin = useIsAdmin();
  const fullName = useSessionFullName();

  const [managing, setManaging] = useState<TaxonomyKind | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const managingTaxonomy = TAXONOMIES.find((t) => t.kind === managing) ?? null;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <h1
          className="font-serif text-[28px] font-semibold text-dash-ink sm:text-[34px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <Section title="Change password">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Current password" htmlFor="current-password" required>
                <input
                  id="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className={inputClass}
                />
              </Field>

              <Field label="New password" htmlFor="new-password" required>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password (at least 8 characters)"
                  className={inputClass}
                />
              </Field>

              <Field label="Confirm new password" htmlFor="confirm-password" required>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className={inputClass}
                />
              </Field>

              {error && <p className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting ? "Saving..." : "Change password"}
                </button>
              </div>
            </form>
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
          <Section title="Account">
            <div className="flex flex-col">
              <InfoRow label="Name">{fullName || "—"}</InfoRow>
              <InfoRow label="Email">
                <span className="break-all">{getSessionUser()?.email ?? "—"}</span>
              </InfoRow>
              <InfoRow label="Role">{admin ? "Admin" : "Agent"}</InfoRow>
            </div>
          </Section>
        </div>
      </div>

      {admin && (
        <div className="flex flex-col gap-4">
          <div>
            <h2
              className="font-serif text-xl font-semibold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Lead options
            </h2>
            <p className="mt-1 text-sm text-dash-muted">
              The dropdown choices your team picks from. Click a name to rename it.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {TAXONOMIES.map((taxonomy) => (
              <TaxonomySummary
                key={taxonomy.kind}
                title={taxonomy.title}
                kind={taxonomy.kind}
                hint={taxonomy.hint}
                refreshKey={refreshKey}
                onManage={() => setManaging(taxonomy.kind)}
              />
            ))}
          </div>
        </div>
      )}
    </div>

    {managingTaxonomy && (
      <TaxonomyModal
        title={managingTaxonomy.title}
        kind={managingTaxonomy.kind}
        hint={managingTaxonomy.hint}
        onClose={() => setManaging(null)}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    )}

    {isSuccess && (
      <SuccessModal
        title="Password changed"
        message="Use your new password the next time you sign in."
      />
    )}
    </ViewTransition>
  );
}
