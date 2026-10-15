"use client";

import { useState, type SubmitEvent } from "react";
import { Select } from "@/components/ui/Select";
import type { StagePayment } from "@/lib/api";
import { leadStageLabel } from "@/lib/leads";
import { PAYMENT_METHODS, PAYMENT_TYPES } from "@/lib/payments";
import { PaymentError } from "@/components/leads/PaymentError";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

const labelClass = "text-sm text-muted";

export type StagePaymentDraft = {
  payment_type: string;
  amount: string;
  method: string;
  reference: string;
  received_on: string;
  note: string;
};

export function emptyStagePayment(stage: string): StagePaymentDraft {
  return {
    // A deal reaches Pre-Closure on its token and is sold on its down payment.
    payment_type: stage === "sold" ? "down_payment" : "token",
    amount: "",
    method: PAYMENT_METHODS[0].id,
    reference: "",
    received_on: new Date().toLocaleDateString("en-CA"),
    note: "",
  };
}

export function toStagePayment(draft: StagePaymentDraft): StagePayment {
  return {
    payment_type: draft.payment_type,
    amount: Number(draft.amount),
    method: draft.method,
    reference: draft.reference.trim() || undefined,
    received_on: draft.received_on,
    note: draft.note.trim() || undefined,
  };
}

/** The payment that justifies moving a lead into Pre-Closure or Sold. */
export function StagePaymentFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: StagePaymentDraft;
  onChange: (value: StagePaymentDraft) => void;
}) {
  const set = (patch: Partial<StagePaymentDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-type`} className={labelClass}>
          Payment type<span className="text-hot"> *</span>
        </label>
        <Select id={`${idPrefix}-type`} value={value.payment_type} onChange={(next) => set({ payment_type: next })} options={PAYMENT_TYPES} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-amount`} className={labelClass}>
          Amount received (PKR)<span className="text-hot"> *</span>
        </label>
        <input
          id={`${idPrefix}-amount`}
          type="number"
          required
          min="1"
          value={value.amount}
          onChange={(e) => set({ amount: e.target.value })}
          placeholder="e.g. 500000"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-method`} className={labelClass}>
          Method<span className="text-hot"> *</span>
        </label>
        <Select id={`${idPrefix}-method`} value={value.method} onChange={(next) => set({ method: next })} options={PAYMENT_METHODS} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-date`} className={labelClass}>
          Received on<span className="text-hot"> *</span>
        </label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          required
          value={value.received_on}
          onChange={(e) => set({ received_on: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-reference`} className={labelClass}>
          Receipt / bank reference
        </label>
        <input
          id={`${idPrefix}-reference`}
          type="text"
          value={value.reference}
          onChange={(e) => set({ reference: e.target.value })}
          placeholder="e.g. TRX-204518"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-note`} className={labelClass}>
          Note
        </label>
        <input
          id={`${idPrefix}-note`}
          type="text"
          value={value.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Anything accounts should know"
          className={inputClass}
        />
      </div>
    </div>
  );
}

/** Asks for the payment before a stage move that needs one. `onSubmit` performs the move and closes it; `onClose` is cancel. */
export function StagePaymentModal({
  clientName,
  customerId,
  stage,
  onClose,
  onSubmit,
}: {
  clientName: string;
  /** The client, so a missing CNIC can be added from the error. */
  customerId?: string | null;
  stage: string;
  onClose: () => void;
  onSubmit: (payment: StagePayment) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => emptyStagePayment(stage));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(toStagePayment(draft));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-serif text-2xl font-bold text-ink" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
            Payment received
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
          <p className="text-sm text-muted">
            Moving {clientName} to {leadStageLabel(stage)} records this payment and sends it for verification.
          </p>
          <StagePaymentFields idPrefix="stage-payment" value={draft} onChange={setDraft} />
          <PaymentError error={error} customerId={customerId} />
          <div className="flex items-center justify-end gap-4">
            <button type="button" onClick={onClose} className="text-sm font-medium text-muted transition-colors hover:text-ink">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : `Move to ${leadStageLabel(stage)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
