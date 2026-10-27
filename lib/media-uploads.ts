import { saveMediaDraft, type MediaDraft } from "@/components/inventory/MediaField";
import type { MediaOwner } from "@/lib/api";

export type MediaUploadJob = {
  id: number;
  label: string;
  fileCount: number;
  percent: number;
  status: "uploading" | "done" | "failed";
  failures: string[];
};

let jobs: MediaUploadJob[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function patch(id: number, changes: Partial<MediaUploadJob>) {
  jobs = jobs.map((job) => (job.id === id ? { ...job, ...changes } : job));
  emit();
}

function warnBeforeLeaving(e: BeforeUnloadEvent) {
  e.preventDefault();
}

function syncLeaveWarning() {
  const busy = jobs.some((job) => job.status === "uploading");
  window.removeEventListener("beforeunload", warnBeforeLeaving);
  if (busy) window.addEventListener("beforeunload", warnBeforeLeaving);
}

export function subscribeMediaUploads(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const mediaUploadsSnapshot = () => jobs;
const NO_JOBS: MediaUploadJob[] = [];
export const emptyMediaUploads = () => NO_JOBS;

export function dismissMediaUpload(id: number) {
  jobs = jobs.filter((job) => job.id !== id);
  emit();
}

/** Uploads in the background so the form can close right away. Survives page changes, not a reload. */
export function startMediaUpload(owner: MediaOwner, draft: MediaDraft, label: string) {
  if (!draft.files.length && !draft.removed.length) return;
  const id = nextId++;
  jobs = [...jobs, { id, label, fileCount: draft.files.length, percent: 0, status: "uploading", failures: [] }];
  emit();
  syncLeaveWarning();

  void saveMediaDraft(owner, draft, (percent) => patch(id, { percent })).then((failures) => {
    patch(id, { percent: 100, status: failures.length ? "failed" : "done", failures });
    syncLeaveWarning();
    if (!failures.length) setTimeout(() => dismissMediaUpload(id), 4_000);
  });
}
