"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function SuccessModal({ title, message }: { title: string; message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-sidebar shadow-lg">
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
            {title}
          </p>
          {message && <p className="text-center text-sm text-dash-muted">{message}</p>}
        </div>
      </div>
    </div>
  );
}
