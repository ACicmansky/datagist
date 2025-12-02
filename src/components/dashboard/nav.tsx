import Link from "next/link";
import { UserNav } from "@/components/dashboard/user-nav";

export function DashboardNav() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">DataGist</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/settings"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Settings
            </Link>
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
