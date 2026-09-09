"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ViewTransition } from "react";
import { EmailIcon, MapPinIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { deleteCustomer, getCustomer, getSources, type Customer } from "@/lib/api";
import { useIsAdmin } from "@/lib/session";
import { getSessionUser } from "@/lib/api";

const CUSTOMER_TYPES = [
  { id: "buyer", label: "Buyer", className: "bg-cold/15 text-cold" },
  { id: "seller", label: "Seller", className: "bg-stage-site-visit/10 text-stage-site-visit" },
  { id: "investor", label: "Investor", className: "bg-warm/20 text-warm" },
];

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-dash-border bg-white p-6 shadow-sm">
      <h2 className="pb-4 text-xs font-bold uppercase tracking-[1px] text-dash-muted">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-dash-border py-3 last:border-b-0 last:pb-0">
      <p className="shrink-0 text-sm text-dash-muted">{label}</p>
      <div className="min-w-0 text-right text-sm text-dash-ink">{children}</div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const admin = useIsAdmin();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCustomer(params.id);
        if (cancelled) return;
        setCustomer(data);

        if (data.source_id) {
          const sources = await getSources();
          if (cancelled) return;
          setSourceName(sources.find((s) => s.id === data.source_id)?.name ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load customer.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteCustomer(params.id);
      router.push("/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer.");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-8 py-8">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-8 h-72 rounded-lg" />
          <Skeleton className="col-span-4 h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-8 py-8">
        <Link href="/customers" className="text-sm text-dash-muted transition-colors hover:text-dash-ink">
          ← Customers
        </Link>
        <p className="rounded-lg border border-dashed border-dash-border py-16 text-center text-sm text-dash-placeholder">
          {error ?? "That customer doesn't exist."}
        </p>
      </div>
    );
  }

  const type = CUSTOMER_TYPES.find((t) => t.id === customer.relation_type);
  const agentName = customer.assigned_to
    ? `${customer.assigned_to.first_name} ${customer.assigned_to.last_name}`
    : null;
  const fullAddress = [customer.address, customer.city].filter(Boolean).join(", ");
  const canEdit = admin || customer.assigned_to?.id === getSessionUser()?.id;

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-8 py-8">
      <Link
        href="/customers"
        className="w-fit text-sm text-dash-muted transition-colors hover:text-dash-ink"
      >
        ← Customers
      </Link>

      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-avatar/30 text-lg font-bold text-dash-ink">
            {initials(customer.customer_name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1
                className="truncate font-serif text-[34px] font-semibold text-dash-ink"
                style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                {customer.customer_name}
              </h1>
              {type && (
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.45px] ${type.className}`}
                >
                  {type.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-dash-muted">
              Customer since {formatDate(customer.customer_since)}
              {sourceName ? ` · via ${sourceName}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {canEdit && (
            <Link
              href={`/customers/${customer.id}/edit`}
              className="rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
            >
              Edit customer
            </Link>
          )}
          {admin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex w-fit items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TrashIcon className="size-3.5" />
              {isDeleting ? "Deleting..." : "Delete customer"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

      <div className="grid grid-cols-12 items-start gap-6">
        <div className="col-span-8 flex flex-col gap-6">
          <Section title="Identity">
            <InfoRow label="Full name">{customer.customer_name}</InfoRow>
            <InfoRow label="CNIC">{customer.cnic_number || "—"}</InfoRow>
            <InfoRow label="Type">
              {type ? (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.45px] ${type.className}`}
                >
                  {type.label}
                </span>
              ) : (
                "—"
              )}
            </InfoRow>
          </Section>

          <Section title="Contact">
            <InfoRow label="Phone">
              <a
                href={`tel:${customer.contact_number}`}
                className="transition-colors hover:text-warm hover:underline"
              >
                {customer.contact_number || "—"}
              </a>
            </InfoRow>
            <InfoRow label="Alternate phone">
              {customer.alternate_contact_number ? (
                <a
                  href={`tel:${customer.alternate_contact_number}`}
                  className="transition-colors hover:text-warm hover:underline"
                >
                  {customer.alternate_contact_number}
                </a>
              ) : (
                "—"
              )}
            </InfoRow>
            <InfoRow label="Email">
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center justify-end gap-1.5 transition-colors hover:text-warm hover:underline"
                >
                  <EmailIcon className="size-3 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </a>
              ) : (
                "—"
              )}
            </InfoRow>
            <InfoRow label="Address">
              {customer.address ? (
                <span className="flex items-start justify-end gap-1.5">
                  <MapPinIcon className="mt-0.5 size-3 shrink-0" />
                  <span>{customer.address}</span>
                </span>
              ) : (
                "—"
              )}
            </InfoRow>
            <InfoRow label="City">{customer.city || "—"}</InfoRow>
          </Section>

          <Section title="Notes">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-dash-ink">
              {customer.notes || <span className="text-dash-placeholder">No notes yet.</span>}
            </p>
          </Section>
        </div>

        <div className="col-span-4 flex flex-col gap-6">
          <Section title="Relationship">
            <InfoRow label="Customer since">{formatDate(customer.customer_since)}</InfoRow>
            <InfoRow label="Source">{sourceName ?? "—"}</InfoRow>
            <InfoRow label="Location">{fullAddress || "—"}</InfoRow>
          </Section>

          <Section title="Ownership">
            {agentName ? (
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-avatar/30 text-xs font-bold text-dash-ink">
                  {initials(agentName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-dash-ink">{agentName}</p>
                  <p className="text-[11px] text-dash-muted">Assigned agent</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-dash-placeholder">No agent assigned yet.</p>
                {admin && (
                  <Link
                    href={`/customers/${customer.id}/edit`}
                    className="rounded-lg border border-dash-border px-3 py-1.5 text-xs font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
                  >
                    Assign an agent
                  </Link>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
    </ViewTransition>
  );
}
