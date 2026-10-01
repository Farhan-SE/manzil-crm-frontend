import type { CustomerStage } from "@/lib/api";

export const CUSTOMER_STAGES: { id: CustomerStage; label: string; className: string }[] = [
  { id: "inquiry", label: "Inquiry", className: "bg-stage-inquiry/10 text-stage-inquiry" },
  { id: "prospect", label: "Prospect", className: "bg-stage-contacted/10 text-stage-contacted" },
  { id: "mature", label: "Mature", className: "bg-stage-site-visit/10 text-stage-site-visit" },
  { id: "pre_closure", label: "Pre-Closure", className: "bg-stage-negotiation/10 text-stage-negotiation" },
  { id: "sold", label: "Sold", className: "bg-stage-sold/10 text-stage-sold" },
];

export const COUNTRIES = [
  { id: "PK", name: "Pakistan" },
  { id: "AE", name: "United Arab Emirates" },
  { id: "SA", name: "Saudi Arabia" },
  { id: "QA", name: "Qatar" },
  { id: "KW", name: "Kuwait" },
  { id: "OM", name: "Oman" },
  { id: "BH", name: "Bahrain" },
  { id: "GB", name: "United Kingdom" },
  { id: "US", name: "United States" },
  { id: "CA", name: "Canada" },
  { id: "AU", name: "Australia" },
];

export function flagUrl(country: string) {
  return `https://flagcdn.com/w20/${country.toLowerCase()}.png`;
}

/** wa.me needs the number in international form; local 03xx numbers are assumed to be Pakistani. */
export function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}
