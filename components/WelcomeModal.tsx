"use client";

import { useState, type SubmitEvent } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  ArrowRightIcon,
  CustomersIcon,
  InventoryIcon,
  LeadsIcon,
  TasksIcon,
} from "@/components/icons/DashboardIcons";
import { changePassword } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-dash-border bg-white px-4 py-2.5 text-sm text-dash-ink placeholder:text-dash-placeholder focus:outline-none";

const SLIDES = [
  {
    Icon: LeadsIcon,
    title: "Leads are where it starts",
    body: "Every enquiry lands here with a temperature and a stage. Work it from inquiry through to sold, and the pipeline board moves with you.",
  },
  {
    Icon: TasksIcon,
    title: "Today keeps you honest",
    body: "Follow-ups you schedule on a lead show up on Today and Tasks. Anything you miss turns up under Overdue rather than quietly disappearing.",
  },
  {
    Icon: CustomersIcon,
    title: "Customers are the people who stayed",
    body: "Customers with their CNIC, contact details and history in one place so you can work with their inquiries.",
  },
  {
    Icon: InventoryIcon,
    title: "Inventory is shared",
    body: "Client listings and partner projects are visible to the whole team so you can match a buyer to a property.",
  },
];

export function WelcomeModal({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const [step, setStep] = useState(0);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPasswordStep = step === SLIDES.length;
  const totalSteps = SLIDES.length + 1;

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setIsDone(true);
      setTimeout(onDone, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    // No overlay click-to-close and no ✕ — the password step is the point of the flow.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-sidebar shadow-lg">
        {isDone ? (
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
              You&apos;re all set
            </p>
            <p className="text-sm text-dash-muted">Welcome to Manzil CRM.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6 px-8 pb-6 pt-8">
              {isPasswordStep ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <h2
                      className="font-serif text-2xl font-bold text-dash-ink"
                      style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
                    >
                      Pick your own password
                    </h2>
                    <p className="mt-1 text-sm text-dash-muted">
                      You signed in with a password we generated. Replace it with one only you know.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="welcome-current" className="text-sm text-dash-muted">
                      Generated password
                      <span className="text-hot"> *</span>
                    </label>
                    <input
                      id="welcome-current"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="The one you were given"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="welcome-new" className="text-sm text-dash-muted">
                      New password
                      <span className="text-hot"> *</span>
                    </label>
                    <input
                      id="welcome-new"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="welcome-confirm" className="text-sm text-dash-muted">
                      Confirm new password
                      <span className="text-hot"> *</span>
                    </label>
                    <input
                      id="welcome-confirm"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Type it again"
                      className={inputClass}
                    />
                  </div>

                  {error && <p className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 w-full rounded-xl bg-dash-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Save password and start"}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  {step === 0 && (
                    <p className="text-sm font-semibold uppercase tracking-[1px] text-dash-muted">
                      Welcome{firstName ? `, ${firstName}` : ""}
                    </p>
                  )}

                  <span className="flex size-14 items-center justify-center rounded-full bg-avatar/30 text-dash-ink">
                    {(() => {
                      const { Icon } = SLIDES[step];
                      return <Icon className="size-6" />;
                    })()}
                  </span>

                  <h2
                    className="font-serif text-2xl font-bold text-dash-ink"
                    style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
                  >
                    {SLIDES[step].title}
                  </h2>
                  <p className="max-w-sm text-sm leading-relaxed text-dash-muted">
                    {SLIDES[step].body}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-dash-border px-8 py-4">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-5 bg-dash-ink" : "w-1.5 bg-dash-border"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="text-sm font-medium text-dash-muted transition-colors hover:text-dash-ink"
                  >
                    Back
                  </button>
                )}
                {!isPasswordStep && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    className="flex items-center gap-2 rounded-lg bg-dash-ink px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-dash-ink/90"
                  >
                    {step === SLIDES.length - 1 ? "Set your password" : "Next"}
                    <ArrowRightIcon className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
