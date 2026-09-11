import { Sidebar } from "@/components/Sidebar";
import { WelcomeGate } from "@/components/WelcomeGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-dash-bg">
      <Sidebar />
      <main className="lg:pl-[256px]">{children}</main>
      <WelcomeGate />
    </div>
  );
}
