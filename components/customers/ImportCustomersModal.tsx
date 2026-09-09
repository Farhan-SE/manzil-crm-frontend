"use client";

import { useState } from "react";
// Self-contained until the bulk-import endpoint exists — nothing here talks to the API yet.
type CustomerType = "buyer" | "seller" | "investor";

type CustomerFields = {
  full_name: string;
  cnic: string;
  phone: string;
  alt_phone: string;
  email: string;
  address: string;
  city: string;
  type: CustomerType;
  customer_since: string;
  source: string;
  notes: string;
};

type CustomerInput = CustomerFields;

/** Header aliases, lowercased. Order within a list doesn't matter. */
const FIELD_ALIASES: Record<keyof CustomerFields, string[]> = {
  full_name: ["name", "full name", "customer", "customer name", "client name"],
  cnic: ["cnic", "nic", "id", "id card"],
  phone: ["phone", "number", "mobile", "contact", "phone number", "whatsapp"],
  alt_phone: ["alt phone", "alternate phone", "phone 2", "landline"],
  email: ["email", "email address"],
  address: ["address", "street"],
  city: ["city"],
  type: ["type", "customer type"],
  customer_since: ["since", "customer since", "date"],
  source: ["source", "lead source"],
  notes: ["notes", "remarks", "comments"],
};

const VALID_TYPES: CustomerType[] = ["buyer", "seller", "investor"];

/** Minimal RFC-4180-ish reader — handles quoted fields containing commas and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        value += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function mapRows(rows: string[][]): CustomerInput[] {
  const [headerRow, ...bodyRows] = rows;
  const headers = headerRow.map((h) => h.trim().toLowerCase());

  const indexOf = (field: keyof CustomerFields) =>
    headers.findIndex((h) => FIELD_ALIASES[field].includes(h));

  const columns = Object.fromEntries(
    (Object.keys(FIELD_ALIASES) as (keyof CustomerFields)[]).map((f) => [f, indexOf(f)]),
  ) as Record<keyof CustomerFields, number>;

  return bodyRows.map((row) => {
    const cell = (field: keyof CustomerFields) =>
      columns[field] === -1 ? "" : (row[columns[field]] ?? "").trim();

    const rawType = cell("type").toLowerCase() as CustomerType;

    return {
      full_name: cell("full_name"),
      cnic: cell("cnic"),
      phone: cell("phone"),
      alt_phone: cell("alt_phone"),
      email: cell("email"),
      address: cell("address"),
      city: cell("city"),
      type: VALID_TYPES.includes(rawType) ? rawType : "buyer",
      customer_since: cell("customer_since") || new Date().toLocaleDateString("en-CA"),
      source: cell("source") || "Import",
      notes: cell("notes"),
    };
  });
}

type ImportCustomersModalProps = {
  onClose: () => void;
  /** Returns how many actually landed, so the modal can report skipped duplicates. */
  onImport: (rows: CustomerInput[]) => number;
};

export function ImportCustomersModal({ onClose, onImport }: ImportCustomersModalProps) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CustomerInput[] | null>(null);
  const [error, setError] = useState("");
  const [imported, setImported] = useState<{ added: number; total: number } | null>(null);

  function handleFile(file: File) {
    setError("");
    setImported(null);
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setRows(null);
      setError(
        "Excel parsing isn't wired up yet — export the sheet as .csv for now, or say the word and I'll add the .xlsx reader.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const parsed = parseCsv(text);
        if (parsed.length < 2) {
          setError("That file has a header but no rows.");
          return;
        }
        const mapped = mapRows(parsed).filter((r) => r.full_name || r.phone);
        if (mapped.length === 0) {
          setError("Couldn't find a name or phone column. Check the headers and try again.");
          return;
        }
        setRows(mapped);
      } catch {
        setError("That file couldn't be read. Try re-exporting it as .csv.");
      }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!rows) return;
    const added = onImport(rows);
    setImported({ added, total: rows.length });
    setRows(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-4">
          <div className="min-w-0">
            <h2
              className="font-serif text-2xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Import customers
            </h2>
            <p className="mt-0.5 text-xs text-dash-muted">
              Columns can be in any order. Recognised headers: Name, CNIC, Phone, Email, Address,
              City, Type, Source, Notes. Duplicate phone numbers are skipped.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-dash-muted transition-colors hover:text-dash-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          {!rows && !imported && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-dash-border py-12 text-center transition-colors hover:border-dash-muted/50 hover:bg-white/50">
              <span className="text-sm font-semibold text-dash-ink">Choose a file</span>
              <span className="text-xs text-dash-muted">.csv — up to a few thousand rows</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {rows && (
            <>
              <p className="text-sm text-dash-ink">
                <span className="font-semibold">{fileName}</span> — {rows.length} row
                {rows.length === 1 ? "" : "s"} ready.
              </p>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-dash-border">
                {rows.slice(0, 20).map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-4 gap-3 bg-white px-4 py-2.5 text-[13px] ${
                      i > 0 ? "border-t border-dash-border" : ""
                    }`}
                  >
                    <span className="truncate font-medium text-dash-ink">
                      {row.full_name || <em className="text-dash-placeholder">no name</em>}
                    </span>
                    <span className="truncate text-dash-muted">
                      {row.phone || <em className="text-dash-placeholder">no phone</em>}
                    </span>
                    <span className="truncate text-dash-muted">{row.city}</span>
                    <span className="truncate capitalize text-dash-muted">{row.type}</span>
                  </div>
                ))}
                {rows.length > 20 && (
                  <p className="bg-white px-4 py-2.5 text-xs text-dash-muted">
                    + {rows.length - 20} more…
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setRows(null);
                    setFileName("");
                  }}
                  className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
                >
                  Choose another
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
                >
                  Import {rows.length}
                </button>
              </div>
            </>
          )}

          {imported && (
            <>
              <p className="rounded-lg bg-stage-sold/10 px-4 py-3 text-sm text-stage-sold">
                Imported {imported.added} of {imported.total} rows
                {imported.total - imported.added > 0
                  ? ` — ${imported.total - imported.added} skipped as duplicates.`
                  : "."}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
