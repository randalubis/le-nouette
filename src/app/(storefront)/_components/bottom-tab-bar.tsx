"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, Menu as MenuIcon, Receipt, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

// Routes that own a bottom-fixed CTA (cart total + checkout, create-order
// button). The tabbar would visually clash, so it self-hides on these.
const HIDE_ON: ReadonlySet<string> = new Set(["/keranjang", "/pembayaran"]);

type TabKey = "beranda" | "menu" | "keranjang" | "pesanan";

function activeTab(pathname: string): TabKey | null {
  if (pathname === "/") return "beranda";
  if (pathname === "/keranjang") return "keranjang";
  if (pathname === "/riwayat") return "pesanan";
  if (pathname.startsWith("/pesanan/")) return "pesanan";
  return null;
}

export function BottomTabBar() {
  const pathname = usePathname();
  const { totalItems, hydrated, addPulse } = useCart();

  // DS pop on add-to-cart — same pattern as the home hero icon.
  const [popKey, setPopKey] = useState(0);
  const lastPulseRef = useRef(addPulse);
  useEffect(() => {
    if (addPulse !== lastPulseRef.current && addPulse > 0) {
      lastPulseRef.current = addPulse;
      setPopKey((k) => k + 1);
    }
  }, [addPulse]);

  if (HIDE_ON.has(pathname)) return null;
  const tab = activeTab(pathname);

  return (
    <nav
      aria-label="Navigasi utama"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto mx-auto flex h-[60px] max-w-md items-center justify-around rounded-[var(--radius-xl)] border-[0.5px] border-[var(--border)] bg-[var(--surface)]/95 px-1 shadow-[0_8px_30px_rgba(42,31,22,0.12)] backdrop-blur-md">
        <Tab
          href="/"
          label="Beranda"
          icon={<Home className="h-[22px] w-[22px]" strokeWidth={1.6} />}
          active={tab === "beranda"}
        />
        <Tab
          href="/#menu-anchor"
          label="Menu"
          icon={<MenuIcon className="h-[22px] w-[22px]" strokeWidth={1.6} />}
          active={false}
        />
        <Tab
          href="/keranjang"
          label="Keranjang"
          icon={
            <span key={popKey} className={popKey > 0 ? "ln-anim-pop relative" : "relative"}>
              <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.6} />
              {hydrated && totalItems > 0 && (
                <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-ink)]">
                  {totalItems}
                </span>
              )}
            </span>
          }
          active={tab === "keranjang"}
        />
        <Tab
          href="/riwayat"
          label="Pesanan"
          icon={<Receipt className="h-[22px] w-[22px]" strokeWidth={1.6} />}
          active={tab === "pesanan"}
        />
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-md)] py-2 transition-colors ${
        active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
      }`}
    >
      <span className={active ? "text-[var(--accent)]" : undefined}>{icon}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
        {label}
      </span>
    </Link>
  );
}
