import { invalidateApiCache, type CustomerImportJob } from "@/lib/api";

const STARTED_EVENT = "customer-import:started";
const FINISHED_EVENT = "customer-import:finished";
// Remembered for the tab so a result that finished during a reload is still shown.
const TRACKED_KEY = "customer_import";

export const isRunning = (job: CustomerImportJob) => job.status === "queued" || job.status === "processing";

export function trackCustomerImport(job: CustomerImportJob) {
  try {
    sessionStorage.setItem(TRACKED_KEY, job.id);
  } catch {}
  window.dispatchEvent(new CustomEvent<CustomerImportJob>(STARTED_EVENT, { detail: job }));
}

export function trackedImportId() {
  try {
    return sessionStorage.getItem(TRACKED_KEY);
  } catch {
    return null;
  }
}

export function forgetTrackedImport() {
  try {
    sessionStorage.removeItem(TRACKED_KEY);
  } catch {}
}

export function announceImportFinished(job: CustomerImportJob) {
  invalidateApiCache("/customers");
  window.dispatchEvent(new CustomEvent<CustomerImportJob>(FINISHED_EVENT, { detail: job }));
}

function listen(event: string, handler: (job: CustomerImportJob) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<CustomerImportJob>).detail);
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}

export const onCustomerImportStarted = (handler: (job: CustomerImportJob) => void) => listen(STARTED_EVENT, handler);
export const onCustomerImportFinished = (handler: (job: CustomerImportJob) => void) => listen(FINISHED_EVENT, handler);
