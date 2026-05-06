"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/rounds", label: "Rounds", icon: CalendarDays },
  { href: "/admin/orders", label: "All orders", icon: Receipt },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setMobileOpen(false);
    router.replace("/admin/login");
    router.refresh();
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-zinc-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="text-base font-semibold">
          Le Nouette · Admin
        </Link>
        <span className="w-9" /> {/* spacer for symmetry */}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 p-4">
              <span className="text-base font-semibold">Le Nouette · Admin</span>
              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-zinc-200 p-3">
              <p className="mb-2 truncate px-2 text-xs text-zinc-500">{email}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="border-b border-zinc-200 p-4">
          <Link href="/admin" className="text-lg font-semibold">
            Le Nouette · Admin
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
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
        <div className="mx-auto max-w-6xl p-4 pt-20 md:p-6 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
