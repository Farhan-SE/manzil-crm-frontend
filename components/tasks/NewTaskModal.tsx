"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { createFollowUp, getLeads } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

function today() {
  return new Date().toLocaleDateString("en-CA");
}

export function NewTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [dueTime, setDueTime] = useState("10:00");

  const [leads, setLeads] = useState<SelectOption[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      try {
        const res = await getLeads({ limit: 200 });
        if (cancelled) return;
        setLeads(
          res.data.map((lead) => ({
            id: lead.id,
            name: `${lead.client_name} — ${lead.client_number}`,
          })),
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load leads.");
      } finally {
        if (!cancelled) setIsLoadingLeads(false);
      }
    }
    void loadLeads();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!leadId) {
      setError("Pick the lead this task belongs to.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createFollowUp({ lead_id: leadId, text, due_date: dueDate, due_time: dueTime });
      setIsSuccess(true);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-sidebar shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 animate-[fade-in_300ms_ease-out]">
            <DotLottieReact
              src="/login/success.lottie"
              autoplay
              loop={false}
              style={{ width: 160, height: 160 }}
            />
            <p
              className="font-serif text-xl font-bold text-dash-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Task added
            </p>
            <p className="text-sm text-dash-muted">It&apos;s on the schedule.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-dash-border px-6 py-4">
              <h2
                className="font-serif text-2xl font-bold text-dash-ink"
                style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                New task
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-dash-muted transition-colors hover:text-dash-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-lead" className="text-sm text-dash-muted">
                  Lead
                  <span className="text-hot"> *</span>
                </label>
                <Select
                  id="task-lead"
                  value={leadId}
                  onChange={setLeadId}
                  options={leads}
                  placeholder={isLoadingLeads ? "Loading..." : "Select a lead"}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-text" className="text-sm text-dash-muted">
                  Task
                  <span className="text-hot"> *</span>
                </label>
                <textarea
                  id="task-text"
                  rows={3}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Call to confirm the site visit…"
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-date" className="text-sm text-dash-muted">
                    Due date
                    <span className="text-hot"> *</span>
                  </label>
                  <input
                    id="task-date"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-time" className="text-sm text-dash-muted">
                    Due time
                    <span className="text-hot"> *</span>
                  </label>
                  <input
                    id="task-time"
                    type="time"
                    required
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-hot">{error}</p>}

              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-dash-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Adding..." : "Add task"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
