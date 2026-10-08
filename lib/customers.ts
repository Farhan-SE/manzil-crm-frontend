import type { CustomerStage } from "@/lib/api";

export const CUSTOMER_STAGES: { id: CustomerStage; label: string; className: string }[] = [
  { id: "inquiry", label: "Inquiry", className: "bg-status-inquiry text-white" },
  { id: "prospect", label: "Prospect", className: "bg-stage-contacted text-white" },
  { id: "mature", label: "Mature", className: "bg-status-visit text-white" },
  { id: "pre_closure", label: "Pre-Closure", className: "bg-status-negotiation text-white" },
  { id: "sold", label: "Sold", className: "bg-stage-sold text-white" },
  { id: "lost", label: "Closed Lost", className: "bg-stage-lost text-white" },
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
