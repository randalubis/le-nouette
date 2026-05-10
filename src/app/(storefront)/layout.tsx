import { StorefrontHeader } from "./_components/storefront-header";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <StorefrontHeader />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">{children}</div>
    </div>
  );
}
