import { PlatformNav } from "@/components/platform/PlatformNav";
import { WelcomeGate } from "@/components/WelcomeGate";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-dash-bg">
      <PlatformNav />
      <main>{children}</main>
      <WelcomeGate />
    </div>
  );
}
