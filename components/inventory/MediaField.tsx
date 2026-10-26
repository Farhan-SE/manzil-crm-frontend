"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deleteMedia, getMedia, MEDIA_ACCEPT, uploadMedia, type MediaItem, type MediaOwner } from "@/lib/api";

/** Changes to apply once the unit or project itself has been saved. */
export type MediaDraft = { files: File[]; removed: string[] };

export const EMPTY_MEDIA_DRAFT: MediaDraft = { files: [], removed: [] };

const LIMITS = { image: 10 * 1024 * 1024, video: 100 * 1024 * 1024 };

function checkFile(file: File): string | null {
  if (!MEDIA_ACCEPT.split(",").includes(file.type)) return `${file.name}: only JPG, PNG, WebP, MP4 or MOV files`;
  const kind = file.type.startsWith("video/") ? "video" : "image";
  if (file.size > LIMITS[kind]) return `${file.name}: a ${kind} can be up to ${LIMITS[kind] / 1024 / 1024} MB`;
  return null;
}

/** Uploads the new files and deletes the removed ones. Returns a message for each one that failed. */
export async function saveMediaDraft(owner: MediaOwner, draft: MediaDraft): Promise<string[]> {
  const failures: string[] = [];
  for (const id of draft.removed) {
    await deleteMedia(id).catch((err) => failures.push(err instanceof Error ? err.message : "A file couldn't be removed"));
  }
  for (const file of draft.files) {
    await uploadMedia(owner, file).catch((err) => failures.push(err instanceof Error ? err.message : `${file.name} couldn't be uploaded`));
  }
  return failures;
}

function Tile({ kind, src, label, onRemove }: { kind: "image" | "video"; src: string; label?: string; onRemove: () => void }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-white">
      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs, not optimisable assets
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <video src={src} muted preload="metadata" className="size-full object-cover" />
      )}
      {kind === "video" && (
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-white">Video</span>
      )}
      {label && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-warm px-1.5 py-0.5 text-[10px] font-bold text-ink">{label}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-ink/80 text-xs text-white transition-colors hover:bg-hot"
      >
        ✕
      </button>
    </div>
  );
}

export function MediaField({
  owner,
  value,
  onChange,
}: {
  /** Null for a unit or project that hasn't been saved yet. */
  owner: MediaOwner | null;
  value: MediaDraft;
  onChange: (draft: MediaDraft) => void;
}) {
  const [existing, setExisting] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(Boolean(owner));
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const ownerKey = owner ? JSON.stringify(owner) : null;

  useEffect(() => {
    if (!ownerKey) return;
    let cancelled = false;
    getMedia(JSON.parse(ownerKey))
      .then((items) => !cancelled && setExisting(items))
      .catch(() => !cancelled && setError("Couldn't load the photos and videos."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ownerKey]);

  const previews = useMemo(() => value.files.map((file) => URL.createObjectURL(file)), [value.files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const problems = picked.map(checkFile).filter((p): p is string => Boolean(p));
    setError(problems.length ? problems.join(" · ") : null);
    onChange({ ...value, files: [...value.files, ...picked.filter((file) => !checkFile(file))] });
    if (input.current) input.current.value = "";
  }

  const shown = existing.filter((item) => !value.removed.includes(item.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">Photos &amp; videos</p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-dash-bg"
        >
          + Add files
        </button>
        <input ref={input} type="file" multiple accept={MEDIA_ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {loading ? (
        <p className="text-xs text-muted">Loading…</p>
      ) : shown.length === 0 && value.files.length === 0 ? (
        <p className="text-xs text-placeholder">No photos or videos yet. JPG, PNG or WebP up to 10 MB; MP4 or MOV up to 100 MB.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {shown.map((item) => (
            <Tile
              key={item.id}
              kind={item.kind}
              src={item.url}
              onRemove={() => onChange({ ...value, removed: [...value.removed, item.id] })}
            />
          ))}
          {value.files.map((file, i) => (
            <Tile
              key={`${file.name}-${i}`}
              kind={file.type.startsWith("video/") ? "video" : "image"}
              src={previews[i]}
              label="New"
              onRemove={() => onChange({ ...value, files: value.files.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
      )}
      {value.files.length > 0 && <p className="text-xs text-muted">New files upload when you save.</p>}
      {error && <p className="text-xs text-hot">{error}</p>}
    </div>
  );
}
