"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiAssetUrl, getSharedUnit, type MediaItem, type SharedUnit } from "@/lib/api";
import { formatMoney } from "@/lib/money";

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

function Lightbox({ images, index, onClose, onMove }: {
  images: MediaItem[];
  index: number;
  onClose: () => void;
  onMove: (next: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove((index + 1) % images.length);
      if (e.key === "ArrowLeft") onMove((index - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, index, onClose, onMove]);

  const arrow = "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose} role="dialog" aria-modal="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
      <img src={images[index].url} alt="" className="max-h-[90dvh] max-w-[92vw] object-contain" onClick={(e) => e.stopPropagation()} />
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-2xl text-white">✕</button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Previous" className={`${arrow} left-3`}
            onClick={(e) => { e.stopPropagation(); onMove((index - 1 + images.length) % images.length); }}>‹</button>
          <button type="button" aria-label="Next" className={`${arrow} right-3`}
            onClick={(e) => { e.stopPropagation(); onMove((index + 1) % images.length); }}>›</button>
          <p className="absolute bottom-4 text-sm text-white/80">{index + 1} / {images.length}</p>
        </>
      )}
    </div>
  );
}

export default function SharedUnitPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedUnit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    let cancelled = false;
    getSharedUnit(token)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "expired"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-cream px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-serif text-2xl font-semibold text-ink" style={headingStyle}>
            {error === "expired" ? "This link has expired" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {error === "expired"
              ? "Photo links work for 2 days. Message us on WhatsApp and we'll send you a new one."
              : error}
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-dvh bg-cream px-4 py-8">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="h-8 w-2/3 rounded-lg bg-border/60" />
          <div className="h-4 w-1/3 rounded-lg bg-border/60" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-square rounded-xl bg-border/60" />)}
          </div>
        </div>
      </main>
    );
  }

  const { unit } = data;
  const images = data.media.filter((m) => m.kind === "image");
  const videos = data.media.filter((m) => m.kind === "video");
  const facts = [
    unit.unit_type,
    unit.beds ? `${unit.beds} bed` : null,
    unit.area_sqft ? `${unit.area_sqft.toLocaleString()} sq ft` : null,
    unit.floor,
  ].filter(Boolean) as string[];
  const validUntil = new Date(data.expires_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <main className="min-h-dvh bg-cream">
      {data.company && (
        <header className="border-b border-border bg-white/70">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            {data.company.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- company logo served by the API
              <img src={apiAssetUrl(data.company.logo_url)} alt="" className="h-8 w-auto" />
            )}
            <p className="text-sm font-bold text-ink">{data.company.name}</p>
          </div>
        </header>
      )}

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[32px]" style={headingStyle}>
            {data.project} · {unit.unit_number}
          </h1>
          {data.location && <p className="mt-1 text-sm text-muted">{data.location}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {unit.price != null && (
              <span className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-white">{formatMoney(unit.price)}</span>
            )}
            {facts.map((fact) => (
              <span key={fact} className="rounded-full border border-border bg-white px-3 py-1 text-sm text-ink">{fact}</span>
            ))}
          </div>
          {unit.features && <p className="mt-3 text-sm text-ink">{unit.features}</p>}
        </div>

        {data.media.length === 0 && <p className="text-sm text-muted">No photos or videos are available for this property right now.</p>}

        {images.length > 0 && (
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setOpen(i)}
                className={`overflow-hidden rounded-xl bg-white ${i === 0 ? "col-span-2 aspect-[16/10] sm:col-span-3" : "aspect-square"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                <img src={image.url} alt="" loading={i < 3 ? "eager" : "lazy"} className="size-full object-cover transition-transform hover:scale-[1.02]" />
              </button>
            ))}
          </section>
        )}

        {videos.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[1px] text-muted">Videos</h2>
            {videos.map((video) => (
              <video key={video.id} src={video.url} controls playsInline preload="metadata" className="w-full rounded-xl bg-black" />
            ))}
          </section>
        )}

        <p className="pb-4 text-center text-xs text-muted">This link works until {validUntil}.</p>
      </div>

      {open !== null && <Lightbox images={images} index={open} onClose={close} onMove={setOpen} />}
    </main>
  );
}
