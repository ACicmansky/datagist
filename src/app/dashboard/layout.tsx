import { DashboardNav } from "@/components/dashboard/nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <DashboardNav />
      <main className="flex w-full flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
