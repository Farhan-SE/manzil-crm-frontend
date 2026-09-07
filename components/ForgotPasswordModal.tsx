"use client";

import { useState, type SubmitEvent } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { forgotPassword } from "@/lib/api";

type Status = "idle" | "submitting" | "success" | "error";

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
};

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = "" }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setEmail(initialEmail);
      setStatus("idle");
      setError(null);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    try {
      await forgotPassword(email);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-white p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted hover:text-ink"
        >
          ✕
        </button>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-4 animate-[fade-in_300ms_ease-out]">
            <DotLottieReact
              src="/login/success.lottie"
              autoplay
              loop={false}
              style={{ width: 160, height: 160 }}
            />
            <p className="text-center font-serif text-xl text-ink">Reset link sent!</p>
            <p className="text-center text-sm text-muted">Check your email for the reset link.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-ink">Reset your password</h2>
              <p className="mt-1 text-sm text-muted">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="forgot-email"
                className="text-xs font-semibold uppercase tracking-[0.6px] text-muted"
              >
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@manzil.com"
                className="w-full rounded-lg border border-border bg-white px-[17px] py-[15px] text-base text-ink placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-ink/20"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary px-4 py-[14px] text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
