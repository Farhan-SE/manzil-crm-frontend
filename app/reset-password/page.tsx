"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type SubmitEvent } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { resetPassword } from "@/lib/api";

type Status = "idle" | "submitting" | "success" | "error";

const MIN_LENGTH = 8;

const inputClass =
  "w-full rounded-lg border border-border bg-white py-[13px] pl-[17px] pr-[49px] text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink/20";
const labelClass = "text-xs font-semibold uppercase tracking-[0.6px] text-muted";
const primaryButtonClass =
  "w-full rounded-lg bg-primary px-4 py-[14px] text-center text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-dvh w-full items-center justify-center overflow-y-auto bg-cream p-8 md:p-12">
      <div className="w-full max-w-[448px]">
        {/* useSearchParams needs a Suspense boundary so the page can still be prerendered. */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`New password must be at least ${MIN_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await resetPassword(token, password);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-[-1px] text-ink">Link not valid</h1>
        <p className="text-sm text-muted">
          This reset link is incomplete. Request a new one from the log in page.
        </p>
        <Link href="/" className={primaryButtonClass}>
          Back to log in
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center animate-[fade-in_300ms_ease-out]">
        <DotLottieReact src="/login/success.lottie" autoplay loop={false} style={{ width: 200, height: 200 }} />
        <p className="font-serif text-xl text-ink">Password updated</p>
        <p className="text-sm text-muted">You can now log in with your new password.</p>
        <Link href="/" className={`${primaryButtonClass} mt-4`}>
          Back to log in
        </Link>
      </div>
    );
  }

  const isSubmitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8">
      <div className="text-center">
        <h1
          className="font-serif text-3xl font-semibold tracking-[-1px] text-ink md:text-[40px]"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Set a new password
        </h1>
        {email && <p className="mt-2 text-sm text-muted">for {email}</p>}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="new-password" className={labelClass}>
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_LENGTH} characters`}
              className={`${inputClass} placeholder:text-placeholder`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center pr-4"
            >
              <Image src={showPassword ? "/login/eye.svg" : "/login/eye-off.svg"} alt="" width={20} height={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirm-password" className={labelClass}>
            Confirm password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-hot">{error}</p>}

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "Saving..." : "Reset password"}
        </button>

        <Link href="/" className="text-center text-sm font-medium text-muted hover:text-ink">
          Back to log in
        </Link>
      </div>
    </form>
  );
}
