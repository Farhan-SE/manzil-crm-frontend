"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { checkCustomerPhone, type Customer, type PhoneCheck } from "@/lib/api";
import { useCan } from "@/lib/session";
import { PhoneInput } from "@/components/ui/PhoneInput";

type AddedBy = Extract<PhoneCheck, { status: "existing" }>["added_by"];

type Notice =
  | { kind: "error"; text: string }
  | { kind: "existing"; customer: Customer; addedBy: AddedBy }
  | { kind: "new-client" };

const fullName = (person: { first_name: string; last_name: string }) => `${person.first_name} ${person.last_name}`.trim();

/** Which agent added the client and who holds it now, e.g. "Added by Ali Khan · Assigned to Sara Ahmed". */
export function clientAgents(customer: Customer, addedBy: AddedBy) {
  return [
    addedBy && `Added by ${fullName(addedBy)}`,
    customer.assigned_to && `Assigned to ${fullName(customer.assigned_to)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The first step of adding a client or a lead: the number is checked before any other field is
 * shown, so a number another agent already holds is turned away up front.
 */
export function PhoneCheckStep({
  purpose,
  initialPhone = "",
  onCancel,
  onAvailable,
  onExisting,
}: {
  purpose: "customer" | "lead";
  initialPhone?: string;
  onCancel: () => void;
  onAvailable?: (phone: string) => void;
  onExisting?: (customer: Customer, addedBy: AddedBy) => void;
}) {
  const canCreateCustomer = useCan("customers.create");
  const [phone, setPhone] = useState(initialPhone);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const number = phone.trim();
    if (!number) return;
    setNotice(null);
    setIsChecking(true);
    try {
      const result = await checkCustomerPhone(number);
      if (result.status === "taken") setNotice({ kind: "error", text: result.message });
      else if (result.status === "existing") {
        if (purpose === "lead") onExisting?.(result.customer, result.added_by);
        else setNotice({ kind: "existing", customer: result.customer, addedBy: result.added_by });
      } else if (purpose === "customer") onAvailable?.(number);
      else setNotice({ kind: "new-client" });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone-check" className="text-sm text-muted">
          Client&apos;s phone number
          <span className="text-hot"> *</span>
        </label>
        <PhoneInput
          id="phone-check"
          required
          autoFocus
          value={phone}
          onChange={(value) => {
            setPhone(value);
            setNotice(null);
          }}
        />
        <p className="text-xs text-muted">
          {purpose === "lead"
            ? "The lead opens on the client with this number."
            : "Checked first, so a number another agent already has isn't added twice."}
        </p>
      </div>

      {notice?.kind === "error" && <p className="rounded-lg bg-hot/10 px-4 py-3 text-sm text-hot">{notice.text}</p>}

      {notice?.kind === "existing" && (
        <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-ink">
          <p>
            This number already belongs to{" "}
            <span className="font-semibold">{notice.customer.customer_name}</span>
            <span className="ml-1 text-stage-inquiry">#{notice.customer.customer_no}</span>.
          </p>
          {clientAgents(notice.customer, notice.addedBy) && (
            <p className="mt-0.5 text-xs text-muted">{clientAgents(notice.customer, notice.addedBy)}</p>
          )}
          <Link href={`/customers/${notice.customer.id}`} className="mt-1 inline-block font-semibold underline">
            Open client
          </Link>
        </div>
      )}

      {notice?.kind === "new-client" && (
        <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-ink">
          <p>No client has this number yet.</p>
          {canCreateCustomer ? (
            <Link
              href={`/customers/new?phone=${encodeURIComponent(phone.trim())}`}
              className="mt-1 inline-block font-semibold underline"
            >
              Add them as a client
            </Link>
          ) : (
            <p className="mt-1 text-muted">Ask a manager to add them as a client first.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isChecking || !phone.trim()}
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink"
        >
          {isChecking ? "Checking..." : "Next"}
        </button>
      </div>
    </form>
  );
}
