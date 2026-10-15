"use client";

import { useEffect, useMemo, useRef } from "react";
import { COMPANY_LOGO_MAX_BYTES, COMPANY_LOGO_TYPES } from "@/lib/api";

/**
 * Picks a company logo and previews it. `currentUrl` is the logo already saved; `file` is a new one
 * waiting to upload, and `removed` means the saved one should be cleared.
 */
export function LogoField({
  currentUrl,
  file,
  removed,
  onFile,
  onRemove,
  onError,
}: {
  currentUrl: string | null;
  file: File | null;
  removed: boolean;
  onFile: (file: File | null) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shown = previewUrl ?? (removed ? null : currentUrl);

  function choose(picked: File | undefined) {
    if (!picked) return;
    if (!COMPANY_LOGO_TYPES.includes(picked.type)) return onError("Choose a PNG, JPG or WebP image.");
    if (picked.size > COMPANY_LOGO_MAX_BYTES) return onError("The logo must be 1 MB or smaller.");
    onFile(picked);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-muted">Logo</p>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white px-3">
          {shown ? (
            <img src={shown} alt="Company logo preview" className="max-h-12 w-auto max-w-full object-contain" />
          ) : (
            <span className="text-xs text-placeholder">No logo</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-dash-bg"
            >
              {shown ? "Replace" : "Choose logo"}
            </button>
            {shown && (
              <button
                type="button"
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = "";
                  if (file) onFile(null);
                  else onRemove();
                }}
                className="text-xs font-medium text-muted transition-colors hover:text-hot"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted">PNG, JPG or WebP, up to 1 MB. A wide logo on a transparent background works best.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={COMPANY_LOGO_TYPES.join(",")}
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
    </div>
  );
}
