import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-dash-bg">
      <Sidebar />
      <main className="pl-[256px]">{children}</main>
    </div>
  );
}
