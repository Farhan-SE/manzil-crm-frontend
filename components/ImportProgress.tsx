"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons/DashboardIcons";
import { Icon } from "@/components/ui/Icon";
import { ImportDialog, ImportResultView } from "@/components/ImportCsvModal";
import { getActiveCustomerImport, getCustomerImport, getValidToken, type CustomerImportJob } from "@/lib/api";
import {
  announceImportFinished,
  forgetTrackedImport,
  isRunning,
  onCustomerImportStarted,
  trackedImportId,
} from "@/lib/customer-import";
import { useCan } from "@/lib/session";

const POLL_MS = 2_000;

/**
 * Follows the company's client import from any page: a progress card in the bottom-right corner
 * while it runs, then what it added. Picks a running import back up after a reload.
 */
export function ImportProgress() {
  const canImport = useCan("customers.import");
  const [job, setJob] = useState<CustomerImportJob | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (!canImport) return;
    let cancelled = false;

    async function resume() {
      if (!getValidToken()) return;
      try {
        const active = await getActiveCustomerImport();
        // Nothing running: this tab's last import may have finished while the page was reloading.
        const tracked = trackedImportId();
        const found = active ?? (tracked ? await getCustomerImport(tracked) : null);
        if (!cancelled && found) setJob(found);
      } catch {
        forgetTrackedImport();
      }
    }

    void resume();
    const stop = onCustomerImportStarted(setJob);
    return () => {
      cancelled = true;
      stop();
    };
  }, [canImport]);

  const running = job !== null && isRunning(job);
  const jobId = job?.id;
  useEffect(() => {
    if (!running || !jobId) return;
    const timer = setInterval(async () => {
      try {
        const latest = await getCustomerImport(jobId);
        setJob(latest);
        if (!isRunning(latest)) announceImportFinished(latest);
      } catch {
        // A failed poll just waits for the next one.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, jobId]);

  function dismiss() {
    forgetTrackedImport();
    setJob(null);
    setIsDetailsOpen(false);
  }

  if (!job) return null;

  const total = job.total_rows ?? 0;
  const percent = total ? Math.min(100, Math.round((job.processed_rows / total) * 100)) : 0;
  const failed = job.status === "failed";

  return (
    <>
      <div
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
            {running ? "Importing clients" : failed ? "Import failed" : "Import finished"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">{job.file_name}</p>

          {running && (
            <>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {total
                  ? `${job.processed_rows.toLocaleString()} of ${total.toLocaleString()} rows · ${percent}%`
                  : job.status === "queued" ? "Waiting to start…" : "Reading the file…"}
              </p>
            </>
          )}

          {failed && job.error_message && <p className="mt-1 text-[11px] text-hot">{job.error_message}</p>}

          {job.status === "completed" && (
            <>
              <p className="mt-1 text-[11px] text-ink">
                {job.added.toLocaleString()} added{job.skipped > 0 ? ` · ${job.skipped.toLocaleString()} skipped` : ""}
              </p>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="mt-1 text-[11px] text-cold hover:underline"
              >
                View details →
              </button>
            </>
          )}
        </div>

        {!running && (
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 p-1 text-muted hover:text-ink">
            <CloseIcon className="size-2" />
          </button>
        )}
      </div>

      {isDetailsOpen && (
        <ImportDialog title="Import clients" subtitle={job.file_name} onClose={() => setIsDetailsOpen(false)}>
          <ImportResultView
            result={{
              total: job.total_rows ?? 0,
              added: job.added,
              skipped: job.skipped,
              errors: job.errors,
              projects_created: job.projects_created,
              projects_matched: job.projects_matched,
            }}
            onDone={dismiss}
          />
        </ImportDialog>
      )}
    </>
  );
}
