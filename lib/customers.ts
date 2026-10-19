import type { CustomerStage } from "@/lib/api";

export const CUSTOMER_STAGES: { id: CustomerStage; label: string; className: string }[] = [
  { id: "inquiry", label: "Inquiry", className: "bg-status-inquiry text-white" },
  { id: "prospect", label: "Prospect", className: "bg-stage-contacted text-white" },
  { id: "mature", label: "Mature", className: "bg-status-visit text-white" },
  { id: "pre_closure", label: "Pre-Closure", className: "bg-status-negotiation text-white" },
  { id: "sold", label: "Sold", className: "bg-stage-sold text-white" },
  { id: "lost", label: "Closed Lost", className: "bg-stage-lost text-white" },
];

/** `dial` is the calling code without the plus. */
export const COUNTRIES = [
  { id: "PK", name: "Pakistan", dial: "92" },
  { id: "AE", name: "United Arab Emirates", dial: "971" },
  { id: "SA", name: "Saudi Arabia", dial: "966" },
  { id: "QA", name: "Qatar", dial: "974" },
  { id: "KW", name: "Kuwait", dial: "965" },
  { id: "OM", name: "Oman", dial: "968" },
  { id: "BH", name: "Bahrain", dial: "973" },
  { id: "GB", name: "United Kingdom", dial: "44" },
  { id: "US", name: "United States", dial: "1" },
  { id: "CA", name: "Canada", dial: "1" },
  { id: "AU", name: "Australia", dial: "61" },
];

export function flagUrl(country: string) {
  return `https://flagcdn.com/w20/${country.toLowerCase()}.png`;
}

/**
 * Splits a stored number into its country and the rest. "+971 50…" and "00971 50…" name their
 * country; a number without a code, like the 03xx numbers saved before codes were asked for, is Pakistani.
 */
export function splitPhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
    // Longest code first, so +971 isn't read as some shorter code.
    const country = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial));
    if (country) return { country: country.id, national: digits.slice(country.dial.length) };
  }
  return { country: "PK", national: trimmed };
}

/** The international form saved for a number, e.g. "+923001234567"; empty when no digits were typed. */
export function joinPhone(country: string, national: string) {
  // A trunk 0 (0300…) isn't dialled after the country code.
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  const dial = COUNTRIES.find((c) => c.id === country)?.dial ?? "92";
  return digits ? `+${dial}${digits}` : "";
}

/** wa.me needs the number in international form; local 03xx numbers are assumed to be Pakistani. */
export function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}
