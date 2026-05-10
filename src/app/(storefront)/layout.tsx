import { StorefrontHeader } from "./_components/storefront-header";
import { BottomTabBar } from "./_components/bottom-tab-bar";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <StorefrontHeader />
      {/* pb-32 leaves room for the floating tabbar (~60px + safe-area).
          Pages with their own bottom CTA (/keranjang, /pembayaran) hide
          the tabbar via BottomTabBar's HIDE_ON set; their own CTAs sit
          inside this same padded zone. */}
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-4">{children}</div>
      <BottomTabBar />
    </div>
  );
}
