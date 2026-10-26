import type { Metadata } from "next";

// The token is in the URL: keep it out of search engines and out of the Referer sent when photos load.
export const metadata: Metadata = {
  title: "Property photos",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SharedUnitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
