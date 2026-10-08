import { NotificationToasts } from "@/components/NotificationToasts";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { WelcomeGate } from "@/components/WelcomeGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-dash-bg">
      <TopNav />
      <Sidebar />
      <main className="lg:pl-24">{children}</main>
      <NotificationToasts />
      <WelcomeGate />
    </div>
  );
}
