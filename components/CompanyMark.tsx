"use client";

import { apiAssetUrl } from "@/lib/api";
import { useCompanyBranding } from "@/lib/session";

const wordmarkStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

/** The company's own logo where the platform set one, otherwise a "Logo" placeholder. */
export function CompanyMark() {
  const company = useCompanyBranding();

  if (company?.logo_url) {
    return (
      <img
        src={apiAssetUrl(company.logo_url)}
        alt={company.name}
        className="block h-9 w-auto max-w-[160px] object-contain object-left"
      />
    );
  }

  return (
    <span className="font-serif text-2xl font-bold tracking-[-0.48px] text-ink" style={wordmarkStyle}>
      Logo
    </span>
  );
}
