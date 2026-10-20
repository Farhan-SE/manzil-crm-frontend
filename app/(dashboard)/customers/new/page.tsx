"use client";

import { Suspense, useEffect, useState, type ReactNode, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ViewTransition } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { PhoneCheckStep } from "@/components/PhoneCheckStep";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useCan } from "@/lib/session";
import { COUNTRIES, CUSTOMER_STAGES, splitPhone } from "@/lib/customers";
import { createCustomer, getAgents, getProjectOptions, getSources, type CustomerStage } from "@/lib/api";

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink placeholder:text-placeholder focus:outline-none";

const TYPE_OPTIONS: SelectOption[] = [
  { id: "buyer", name: "Buyer" },
  { id: "seller", name: "Seller" },
  { id: "investor", name: "Investor" },
];

const STAGE_OPTIONS: SelectOption[] = CUSTOMER_STAGES.map((s) => ({ id: s.id, name: s.label }));

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
      <label htmlFor={htmlFor} className="text-sm text-muted">
        {label}
        {required && <span className="text-hot"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[1px] text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function NewCustomerPage() {
  return (
    <Suspense fallback={null}>
      <NewCustomerForm />
    </Suspense>
  );
}

function NewCustomerForm() {
  const router = useRouter();
  const phoneFromLink = useSearchParams().get("phone") ?? "";
  const canAssign = useCan("customers.assign");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cnic, setCnic] = useState("");
  const [projectId, setProjectId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [isCheckingPhone, setIsCheckingPhone] = useState(true);
  const [altContactNumber, setAltContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [relationType, setRelationType] = useState("buyer");
  const [customerSince, setCustomerSince] = useState(today);
  const [sourceId, setSourceId] = useState("");
  const [subSource, setSubSource] = useState("");
  const [country, setCountry] = useState("PK");
  const [stage, setStage] = useState<CustomerStage>("inquiry");
  const [notes, setNotes] = useState("");
  const [assignTo, setAssignTo] = useState(UNASSIGNED_ID);

  const [agents, setAgents] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [projects, setProjects] = useState<SelectOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        // Only someone who can reassign clients picks an owner, so only they need the staff list.
        const [agentList, sourceList, projectList] = await Promise.all([
          canAssign ? getAgents() : Promise.resolve([]),
          getSources(),
          getProjectOptions(),
        ]);
        if (cancelled) return;
        setProjects(projectList.map((project) => ({ id: project.id, name: project.project_name })));
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
  }, [canAssign]);

  const assigneeOptions: SelectOption[] = [{ id: UNASSIGNED_ID, name: "Unassigned" }, ...agents];

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) return setError("Select the project this client is interested in.");
    setError(null);
    setIsSubmitting(true);
    try {
      const customer = await createCustomer({
        first_name: firstName,
        last_name: lastName || undefined,
        cnic_number: cnic || undefined,
        project_id: projectId,
        contact_number: contactNumber,
        alternate_contact_number: altContactNumber || undefined,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        relation_type: relationType,
        source_id: sourceId || undefined,
        sub_source: subSource,
        country,
        stage,
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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href="/customers"
        className="w-fit text-sm text-muted transition-colors hover:text-ink"
      >
        ← Customers
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1
            className="font-serif text-[28px] font-semibold text-ink sm:text-[34px]"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            New customer
          </h1>
          <p className="mt-1 text-sm text-muted">
            Someone who has transacted with you, or is about to.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/customers"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-dash-bg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="new-customer-form"
            disabled={isSubmitting}
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Adding..." : "Add customer"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{error}</p>}

      <form
        id="new-customer-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12"
      >
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <Section title="Identity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="customer-first-name" required>
                <input
                  id="customer-first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className={inputClass}
                />
              </Field>
              <Field label="Last name" htmlFor="customer-last-name">
                <input
                  id="customer-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={inputClass}
                />
              </Field>
              <Field label="CNIC" htmlFor="customer-cnic">
                <input
                  id="customer-cnic"
                  type="text"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="42101-1234567-1"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Phone" htmlFor="customer-phone" required>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-dash-bg px-4 py-2.5">
                  <input
                    id="customer-phone"
                    type="tel"
                    readOnly
                    value={contactNumber}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCheckingPhone(true)}
                    className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-ink"
                  >
                    Change
                  </button>
                </div>
              </Field>
              <Field label="Alternate phone" htmlFor="customer-alt-phone">
                <PhoneInput
                  id="customer-alt-phone"
                  value={altContactNumber}
                  onChange={setAltContactNumber}
                  placeholder="Optional"
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
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
              <Field label="Country" htmlFor="customer-country">
                <Select id="customer-country" value={country} onChange={setCountry} options={COUNTRIES} />
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

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <Section title="Relationship">
            <Field label="Project" htmlFor="customer-project" required>
              <Select
                id="customer-project"
                value={projectId}
                onChange={setProjectId}
                options={projects}
                placeholder={isLoadingOptions ? "Loading..." : "Select project"}
              />
            </Field>
            {projectId && <p className="-mt-2 text-xs text-muted">A lead on this project is opened with the client.</p>}
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
            <Field label="Sub-source" htmlFor="customer-sub-source">
              <input
                id="customer-sub-source"
                type="text"
                value={subSource}
                onChange={(e) => setSubSource(e.target.value)}
                placeholder="e.g. Client reference"
                className={inputClass}
              />
            </Field>
            <Field label="Stage" htmlFor="customer-stage">
              <Select
                id="customer-stage"
                value={stage}
                onChange={(v) => setStage(v as CustomerStage)}
                options={STAGE_OPTIONS}
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

          {canAssign ? (
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
              <p className="text-xs text-muted">
                The agent who owns this relationship. Leave unassigned to decide later.
              </p>
            </Section>
          ) : (
            <Section title="Ownership">
              <p className="text-xs text-muted">This client is assigned to you. A manager can reassign it later.</p>
            </Section>
          )}
        </div>
      </form>
    </div>

    {isCheckingPhone && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => (contactNumber ? setIsCheckingPhone(false) : router.push("/customers"))}
      >
        <div
          className="w-full max-w-md rounded-xl bg-sidebar shadow-lg"
          role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-6 py-4">
            <h2
              className="font-serif text-2xl font-bold text-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              New customer
            </h2>
          </div>
          <PhoneCheckStep
            purpose="customer"
            initialPhone={contactNumber || phoneFromLink}
            onCancel={() => (contactNumber ? setIsCheckingPhone(false) : router.push("/customers"))}
            onAvailable={(phone) => {
              setContactNumber(phone);
              // The client's country starts as the one their number is from.
              setCountry(splitPhone(phone).country);
              setIsCheckingPhone(false);
            }}
          />
        </div>
      </div>
    )}

    {isSuccess && (
      <SuccessModal title="Customer added" message={`${[firstName, lastName].filter(Boolean).join(" ")} is now in your customer list.`} />
    )}
    </ViewTransition>
  );
}
