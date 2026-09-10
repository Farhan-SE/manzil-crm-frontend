"use client";

import { useState } from "react";
import { importCustomersCsv, importLeadsCsv, type ImportResult } from "@/lib/api";

export function ImportCsvModal({
  kind,
  onClose,
  onImported,
}: {
  kind: "customers" | "leads";
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const headers =
    kind === "customers"
      ? "Name, CNIC, Phone, Alt phone, Email, Address, City, Type, Since, Source, Notes"
      : "Name, Phone, Interest, Category, Source, City, Area, Budget, Temperature, Stage";

  function pickFile(picked: File) {
    setError("");
    setResult(null);
    if (!picked.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("That needs to be a .csv file — export the sheet as CSV first.");
      return;
    }
    setFile(picked);
  }

  async function handleImport() {
    if (!file) return;
    setIsImporting(true);
    setError("");
    try {
      const res = kind === "customers" ? await importCustomersCsv(file) : await importLeadsCsv(file);
      setResult(res);
      setFile(null);
      if (res.added > 0) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
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
              Import {kind}
            </h2>
            <p className="mt-0.5 text-xs text-dash-muted">
              Columns can be in any order. Recognised headers: {headers}.{" "}
              {kind === "customers"
                ? "Duplicate phone numbers are skipped."
                : "The same number can appear more than once — one client may raise several leads."}
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
          {!result && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-dash-border py-12 text-center transition-colors hover:border-dash-muted/50 hover:bg-white/50">
              <span className="text-sm font-semibold text-dash-ink">
                {file ? file.name : "Choose a file"}
              </span>
              <span className="text-xs text-dash-muted">.csv — up to 5 MB</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
              />
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {file && !result && (
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
              >
                Choose another
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>
          )}

          {result && (
            <>
              <p className="rounded-lg bg-stage-sold/10 px-4 py-3 text-sm text-stage-sold">
                Imported {result.added} of {result.total} rows
                {result.skipped > 0 ? ` — ${result.skipped} skipped.` : "."}
              </p>

              {result.errors.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-dash-border">
                  {result.errors.map((issue, i) => (
                    <div
                      key={`${issue.row}-${i}`}
                      className={`flex gap-3 bg-white px-4 py-2 text-[13px] ${
                        i > 0 ? "border-t border-dash-border" : ""
                      }`}
                    >
                      <span className="shrink-0 font-medium text-dash-muted">Row {issue.row}</span>
                      <span className="min-w-0 text-dash-ink">{issue.reason}</span>
                    </div>
                  ))}
                </div>
              )}

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
