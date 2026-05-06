"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Package, CalendarDays, LayoutDashboard, Settings } from "lucide-react";

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="border-b border-zinc-200 p-4">
          <Link href="/admin" className="text-lg font-semibold">
            Le Nouette · Admin
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </NavLink>
          <NavLink href="/admin/products" icon={<Package className="h-4 w-4" />}>
            Products
          </NavLink>
          <NavLink href="/admin/rounds" icon={<CalendarDays className="h-4 w-4" />}>
            Rounds
          </NavLink>
          <NavLink href="/admin/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </NavLink>
        </nav>
        <div className="border-t border-zinc-200 p-3">
          <p className="mb-2 truncate px-2 text-xs text-zinc-500">{email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-zinc-50">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100"
    >
      {icon}
      {children}
    </Link>
  );
}
