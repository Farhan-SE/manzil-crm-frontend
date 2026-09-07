"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, ViewTransition, type SubmitEvent } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { login } from "@/lib/api";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";

type Status = "idle" | "submitting" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    if (!dotLottie) return;
    const handleComplete = () => router.push("/dashboard");
    dotLottie.addEventListener("complete", handleComplete);
    return () => dotLottie.removeEventListener("complete", handleComplete);
  }, [dotLottie, router]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    try {
      await login(email, password, keepSignedIn);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  return (
    <ViewTransition>
      <div className="flex h-dvh w-full overflow-hidden">
        <div className="relative hidden flex-1 items-start justify-center overflow-hidden md:flex">
          <Image
            src="/login/hero.jpg"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          <div className="relative flex h-full w-full flex-col items-start justify-between p-12">
            <p
              className="font-serif text-[28px] font-bold tracking-[-0.7px] text-white"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              manzil.com
            </p>
            <blockquote
              className="max-w-[448px] font-serif text-[30px] leading-[1.25] text-white"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              &quot;Every great deal starts with the right follow-up.&quot;
            </blockquote>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-cream p-8 md:p-12">
          <div className="relative w-full max-w-[448px]">
            <form
              onSubmit={handleSubmit}
              className={`flex w-full flex-col gap-8 transition-opacity duration-300 ${isSuccess ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
            >
              <h1
                className="font-serif text-3xl font-semibold tracking-[-1px] text-ink md:text-[40px]"
                style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                Welcome back
              </h1>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-[0.6px] text-muted"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@manzil.com"
                    className="w-full rounded-lg border border-border bg-white px-[17px] py-[15px] text-base text-ink placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-ink/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-[0.6px] text-muted"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white py-[13px] pl-[17px] pr-[49px] text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center pr-4"
                    >
                      <Image
                        src={showPassword ? "/login/eye.svg" : "/login/eye-off.svg"}
                        alt=""
                        width={20}
                        height={20}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    Keep me signed in
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-sm font-medium text-muted hover:text-ink"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-primary px-4 py-[14px] text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Logging in..." : "Log in"}
                </button>
              </div>
            </form>

            {isSuccess && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-[fade-in_300ms_ease-out]">
                <DotLottieReact
                  src="/login/success.lottie"
                  autoplay
                  loop={false}
                  dotLottieRefCallback={setDotLottie}
                  style={{ width: 200, height: 200 }}
                />
                <p className="font-serif text-xl text-ink">Welcome back!</p>
              </div>
            )}
          </div>
        </div>

        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
          initialEmail={email}
        />
      </div>
    </ViewTransition>
  );
}
