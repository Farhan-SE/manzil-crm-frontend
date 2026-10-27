"use client";

import { useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/icons/DashboardIcons";
import { Icon } from "@/components/ui/Icon";
import {
  dismissMediaUpload,
  emptyMediaUploads,
  mediaUploadsSnapshot,
  subscribeMediaUploads,
} from "@/lib/media-uploads";

/** A card per background photo/video upload started from a unit or project form. */
export function MediaUploadProgress() {
  const jobs = useSyncExternalStore(subscribeMediaUploads, mediaUploadsSnapshot, emptyMediaUploads);

  return jobs.map((job) => {
    const running = job.status === "uploading";
    const failed = job.status === "failed";
    const files = `${job.fileCount} ${job.fileCount === 1 ? "file" : "files"}`;
    return (
      <div
        key={job.id}
        aria-live="polite"
        className="flex w-[320px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-[4px] border border-border bg-white p-3 shadow-lg"
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            failed ? "bg-hot/10 text-hot" : running ? "bg-nav-active text-nav-active-fg" : "bg-stage-sold/10 text-stage-sold"
          }`}
        >
          <Icon name={running ? "upload" : failed ? "file" : "check-circle"} className="size-4" />
        </span>

        <div className="min-w-0 flex-1 leading-[1.4]">
          <p className="truncate text-xs font-bold text-ink">
            {running ? `Uploading ${files}` : failed ? "Some files didn't upload" : "Photos & videos uploaded"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">{job.label}</p>

          {running && (
            <>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={job.percent}
              >
                <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${job.percent}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted">{job.percent}% · keep this tab open</p>
            </>
          )}

          {failed && (
            <ul className="mt-1 space-y-0.5 text-[11px] text-hot">
              {job.failures.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          )}
        </div>

        {!running && (
          <button type="button" onClick={() => dismissMediaUpload(job.id)} aria-label="Dismiss" className="shrink-0 p-1 text-muted hover:text-ink">
            <CloseIcon className="size-2" />
          </button>
        )}
      </div>
    );
  });
}
