"use client";

import { useState } from "react";
import { updateCustomer } from "@/lib/api";

// Matches the server's message when a payment is recorded for a client without a CNIC.
const CNIC_REQUIRED = "Add the client's CNIC before recording a payment";

const inputClass =
  "min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-1.5 text-sm text-ink placeholder:text-placeholder";

/**
 * A payment form's error. When the client's CNIC is what is missing, it can be added right
 * here, so the payment can be submitted again without leaving the form.
 */
export function PaymentError({ error, customerId }: { error: string | null; customerId?: string | null }) {
  const [cnic, setCnic] = useState("");
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!error) return null;
  if (error !== CNIC_REQUIRED || !customerId) return <p className="text-sm text-hot">{error}</p>;
  if (savedFor === error) {
    return <p className="text-sm text-ink">CNIC saved. Submit the payment again.</p>;
  }

  async function save() {
    if (!cnic.trim()) return setSaveError("Enter the CNIC.");
    setSaveError(null);
    setIsSaving(true);
    try {
      await updateCustomer(customerId!, { cnic_number: cnic.trim() });
      setSavedFor(error);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the CNIC.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hot/30 bg-hot/10 p-3">
      <p className="text-sm text-hot">{error}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="payment-cnic" className="sr-only">
          Client CNIC
        </label>
        <input
          id="payment-cnic"
          type="text"
          value={cnic}
          onChange={(e) => setCnic(e.target.value)}
          onKeyDown={(e) => {
            // Saving the CNIC must not submit the payment form around it.
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          placeholder="42101-1234567-1"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving}
          className="rounded-xl bg-ink px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save CNIC"}
        </button>
      </div>
      {saveError && <p className="text-xs text-hot">{saveError}</p>}
    </div>
  );
}
