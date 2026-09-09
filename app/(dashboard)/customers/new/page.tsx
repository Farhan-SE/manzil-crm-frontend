"use client";

import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewTransition } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { createCustomer, getAgents, getSources } from "@/lib/api";

const inputClass =
  "w-full min-w-0 rounded-xl border border-dash-border bg-white px-4 py-2.5 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

const TYPE_OPTIONS: SelectOption[] = [
  { id: "buyer", name: "Buyer" },
  { id: "seller", name: "Seller" },
  { id: "investor", name: "Investor" },
];

const UNASSIGNED_ID = "unassigned";

function today() {
  return new Date().toLocaleDateString("en-CA");
}

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
    <section className="flex flex-col gap-4 rounded-lg border border-dash-border bg-white p-6 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[1px] text-dash-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function NewCustomerPage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [cnic, setCnic] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [altContactNumber, setAltContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [relationType, setRelationType] = useState("buyer");
  const [customerSince, setCustomerSince] = useState(today);
  const [sourceId, setSourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [assignTo, setAssignTo] = useState(UNASSIGNED_ID);

  const [agents, setAgents] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const [agentList, sourceList] = await Promise.all([getAgents(), getSources()]);
        if (cancelled) return;
        setAgents(
          agentList.map((agent) => ({
            id: String(agent.id),
            name: `${agent.first_name} ${agent.last_name}`,
          })),
        );
        setSources(sourceList.map((source) => ({ id: source.id, name: source.name })));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load form options.");
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const assigneeOptions: SelectOption[] = [{ id: UNASSIGNED_ID, name: "Unassigned" }, ...agents];

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const customer = await createCustomer({
        customer_name: customerName,
        cnic_number: cnic,
        contact_number: contactNumber,
        alternate_contact_number: altContactNumber || undefined,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        relation_type: relationType,
        source_id: sourceId || undefined,
        customer_since: customerSince || undefined,
        notes: notes || undefined,
        assigned_to_id: assignTo !== UNASSIGNED_ID ? Number(assignTo) : undefined,
      });
      setIsSuccess(true);
      setTimeout(() => router.push(`/customers/${customer.id}`), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <ViewTransition>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-8 py-8">
      <Link
        href="/customers"
        className="w-fit text-sm text-dash-muted transition-colors hover:text-dash-ink"
      >
        ← Customers
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="font-serif text-[34px] font-semibold text-dash-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            New customer
          </h1>
          <p className="mt-1 text-sm text-dash-muted">
            Someone who has transacted with you, or is about to.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/customers"
            className="rounded-lg border border-dash-border px-4 py-2.5 text-sm font-semibold text-dash-ink transition-colors hover:bg-dash-bg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="new-customer-form"
            disabled={isSubmitting}
            className="rounded-lg bg-dash-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Adding..." : "Add customer"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

      <form
        id="new-customer-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-12 items-start gap-6"
      >
        <div className="col-span-8 flex flex-col gap-6">
          <Section title="Identity">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name" htmlFor="customer-name" required>
                <input
                  id="customer-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                />
              </Field>
              <Field label="CNIC" htmlFor="customer-cnic" required>
                <input
                  id="customer-cnic"
                  type="text"
                  required
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="42101-1234567-1"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" htmlFor="customer-phone" required>
                <input
                  id="customer-phone"
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="03xx-xxxxxxx"
                  className={inputClass}
                />
              </Field>
              <Field label="Alternate phone" htmlFor="customer-alt-phone">
                <input
                  id="customer-alt-phone"
                  type="tel"
                  value={altContactNumber}
                  onChange={(e) => setAltContactNumber(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Email" htmlFor="customer-email">
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-[2fr_1fr] gap-4">
              <Field label="Address" htmlFor="customer-address">
                <input
                  id="customer-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / street / area"
                  className={inputClass}
                />
              </Field>
              <Field label="City" htmlFor="customer-city">
                <input
                  id="customer-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Karachi"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section title="Notes">
            <textarea
              id="customer-notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferences, history, anything worth remembering…"
              className={`${inputClass} resize-y`}
            />
          </Section>
        </div>

        <div className="col-span-4 flex flex-col gap-6">
          <Section title="Relationship">
            <Field label="Type" htmlFor="customer-type" required>
              <Select
                id="customer-type"
                value={relationType}
                onChange={setRelationType}
                options={TYPE_OPTIONS}
              />
            </Field>
            <Field label="Source" htmlFor="customer-source">
              <Select
                id="customer-source"
                value={sourceId}
                onChange={setSourceId}
                options={sources}
                placeholder={isLoadingOptions ? "Loading..." : "Select"}
              />
            </Field>
            <Field label="Customer since" htmlFor="customer-since">
              <input
                id="customer-since"
                type="date"
                value={customerSince}
                onChange={(e) => setCustomerSince(e.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title="Ownership">
            <Field label="Assign to" htmlFor="customer-assign-to">
              <Select
                id="customer-assign-to"
                value={assignTo}
                onChange={setAssignTo}
                options={assigneeOptions}
                placeholder={isLoadingOptions ? "Loading..." : "Select agent"}
              />
            </Field>
            <p className="text-xs text-dash-muted">
              The agent who owns this relationship. Leave unassigned to decide later.
            </p>
          </Section>
        </div>
      </form>
    </div>

    {isSuccess && (
      <SuccessModal title="Customer added" message={`${customerName} is now in your customer list.`} />
    )}
    </ViewTransition>
  );
}
