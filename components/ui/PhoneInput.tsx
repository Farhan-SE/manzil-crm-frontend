"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons/DashboardIcons";
import { Listbox } from "@/components/ui/Listbox";
import { COUNTRIES, flagUrl, joinPhone, splitPhone } from "@/lib/customers";

const CODE_OPTIONS = COUNTRIES.map((country) => ({ id: country.id, name: `${country.name} (+${country.dial})` }));

/**
 * A phone field with its country code chosen beside it. Hands back the number in international
 * form ("+923001234567"), or "" while it's empty.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  // What the user typed is kept as typed ("0300-1234567"); only the joined form goes to the parent.
  const [field, setField] = useState(() => ({ ...splitPhone(value), sent: value }));
  // A value set from outside, such as a client loaded into the edit form, replaces what's shown.
  if (value !== field.sent) setField({ ...splitPhone(value), sent: value });

  function update(country: string, national: string) {
    const joined = joinPhone(country, national);
    setField({ country, national, sent: joined });
    onChange(joined);
  }

  const dial = COUNTRIES.find((country) => country.id === field.country)?.dial;

  return (
    <div className="flex w-full items-center rounded-xl border border-border bg-white focus-within:border-muted/60">
      <Listbox
        value={field.country}
        onChange={(country) => update(country, field.national)}
        options={CODE_OPTIONS}
        label="Country code"
        className="flex shrink-0 items-center gap-1.5 border-r border-border py-2.5 pl-3 pr-2.5 text-sm text-ink"
      >
        {(isOpen) => (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(field.country)} alt="" className="h-3 w-[18px] shrink-0" />
            <span>+{dial}</span>
            <ChevronDownIcon className={`size-2 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </Listbox>
      <input
        id={id}
        type="tel"
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        value={field.national}
        onChange={(e) => update(field.country, e.target.value)}
        placeholder={placeholder ?? (field.country === "PK" ? "300 1234567" : "Phone number")}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-placeholder focus:outline-none"
      />
    </div>
  );
}
