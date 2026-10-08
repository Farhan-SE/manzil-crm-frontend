"use client";

import { useState, type ReactNode, type SubmitEvent } from "react";
import { Select } from "@/components/ui/Select";
import { LeadPicker } from "@/components/ui/LeadPicker";
import { createPayment, recordPayment, type Payment } from "@/lib/api";
import { PAYMENT_METHODS, PAYMENT_TYPES, paymentCode, paymentTypeLabel } from "@/lib/payments";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2
            className="font-serif text-2xl font-bold text-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormActions({ onClose, isSubmitting, label }: { onClose: () => void; isSubmitting: boolean; label: string }) {
  return (
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
        {isSubmitting ? "Saving..." : label}
      </button>
    </div>
  );
}

/** Adds an amount a client owes to the ledger. */
export function NewPaymentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0].id);
  const [dueDate, setDueDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!leadId) {
      setError("Pick the client this payment is due from.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createPayment({ lead_id: leadId, payment_type: paymentType, due_date: dueDate, amount: Number(amount) });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Add payment due" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment-lead" className="text-sm text-muted">
            Client / sale
            <span className="text-hot"> *</span>
          </label>
          <LeadPicker id="payment-lead" value={leadId} onChange={setLeadId} onError={setError} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment-type" className="text-sm text-muted">
            Payment type
          </label>
          <Select id="payment-type" value={paymentType} onChange={setPaymentType} options={PAYMENT_TYPES} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment-due" className="text-sm text-muted">
              Due date
              <span className="text-hot"> *</span>
            </label>
            <input
              id="payment-due"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment-amount" className="text-sm text-muted">
              Amount (PKR)
              <span className="text-hot"> *</span>
            </label>
            <input
              id="payment-amount"
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500000"
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-hot">{error}</p>}
        <FormActions onClose={onClose} isSubmitting={isSubmitting} label="Add payment" />
      </form>
    </ModalShell>
  );
}

/** Records money received against a payment. Accounts verifies the receipt afterwards. */
export function RecordPaymentModal({
  payment,
  onClose,
  onRecorded,
}: {
  payment: Payment;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState(String(payment.balance));
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await recordPayment(payment.id, {
        amount: Number(amount),
        method,
        reference: reference || undefined,
        note: note || undefined,
      });
      onRecorded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  const summary = [
    ["Total amount", payment.amount],
    ["Previously received", payment.received_amount],
    ["Current balance", payment.balance],
  ];

  return (
    <ModalShell title="Record payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-ink">
            {paymentCode(payment)} · {paymentTypeLabel(payment.payment_type)}
          </p>
          <p className="text-xs text-muted">
            {payment.lead.client_name} · Lead {payment.lead.lead_no}
          </p>
        </div>
        <dl className="flex flex-col gap-1.5 text-sm">
          {summary.map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="w-40 shrink-0 text-muted">{label}</dt>
              <dd className="text-ink">PKR {Number(value).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="record-amount" className="text-sm text-muted">
              Amount (PKR)
              <span className="text-hot"> *</span>
            </label>
            <input
              id="record-amount"
              type="number"
              required
              min="1"
              max={payment.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="record-method" className="text-sm text-muted">
              Payment method
            </label>
            <Select id="record-method" value={method} onChange={setMethod} options={PAYMENT_METHODS} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="record-reference" className="text-sm text-muted">
            Bank / transaction reference
          </label>
          <input
            id="record-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Exactly as shown on the receipt"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="record-note" className="text-sm text-muted">
            Payment note
          </label>
          <textarea
            id="record-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />
        </div>
        <p className="text-xs text-muted">
          Recorded payments remain unverified until Accounts confirms the receipt.
        </p>

        {error && <p className="text-sm text-hot">{error}</p>}
        <FormActions onClose={onClose} isSubmitting={isSubmitting} label="Record payment" />
      </form>
    </ModalShell>
  );
}
