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
    // admin-shell rebinds the brand tokens to the denser admin variants
    // so primitives (Card, Table, Input) and var(--surface)/var(--background)
    // call sites pick up the admin look automatically. (X-01.)
    <div className="admin-shell flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-[var(--surface-warm-1)]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="flex items-baseline gap-1.5">
          <BrandLockup size="sm" />
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
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <BrandLockup size="sm" />
              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-[var(--surface-warm-1)]"
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
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-warm-1)]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-[var(--border)] p-3">
              <p className="mb-2 truncate px-2 text-xs text-[var(--muted)]">{email}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-warm-1)]"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
        <div className="border-b border-[var(--border)] p-4">
          <Link href="/admin" className="flex items-baseline gap-1.5">
            <BrandLockup />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-warm-1)]"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <p className="mb-2 truncate px-2 text-xs text-[var(--muted)]">{email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-warm-1)]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[var(--background)]">
        <div className="mx-auto max-w-6xl p-4 pt-20 md:p-6 md:pt-6">{children}</div>
      </main>
    </div>
  );
}

// Brand lockup matching the storefront header — Playfair italic wordmark
// with a small uppercase tag. "admin" replaces "bites" so the back office
// reads as the same product family without confusing the visual hierarchy.
function BrandLockup({ size = "md" }: { size?: "sm" | "md" }) {
  const wordmark =
    size === "sm"
      ? "text-xl italic leading-none tracking-tight"
      : "text-2xl italic leading-none tracking-tight";
  return (
    <>
      <span className={`font-serif ${wordmark} text-[var(--primary)]`}>Le Nouette</span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">admin</span>
    </>
  );
}
