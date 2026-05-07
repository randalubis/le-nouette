import { CheckCircle2, ShoppingBag, Wallet, type LucideIcon } from "lucide-react";

// Three-step stepper at the top of every checkout-funnel page. Icons sit
// at 0% / 50% / 100% of the row width via justify-between so the visual
// rhythm reads as centered rather than left-flushed within each segment.
// Connector lines render in an absolute layer behind the icons so they
// terminate cleanly at icon centers regardless of icon width.
// (Plan ticket N-08; positioning + iconography polish.)
type Step = { label: string; Icon: LucideIcon };

const STEPS: Step[] = [
  { label: "Keranjang", Icon: ShoppingBag },
  { label: "Pembayaran", Icon: Wallet },
  { label: "Selesai", Icon: CheckCircle2 },
];

export type CheckoutStep = 0 | 1 | 2;

export function CheckoutStepper({ current }: { current: CheckoutStep }) {
  return (
    <nav aria-label="Progress checkout" className="mx-auto w-full max-w-md">
      <div className="relative">
        {/* Connector lane — sits behind the icons, top-aligned to icon
            vertical center (icon is h-8 = 32px, half = 16px, minus half a
            pixel for the line). Inset from each side by half an icon so
            the segment terminates at the icon edges. */}
        <div className="pointer-events-none absolute left-4 right-4 top-[15px] flex h-0.5">
          {STEPS.slice(0, -1).map((_, i) => {
            const reached = i < current;
            return (
              <span
                key={i}
                className={`flex-1 transition-colors ${
                  reached ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                }`}
              />
            );
          })}
        </div>

        <ol className="relative flex items-start justify-between">
          {STEPS.map((step, i) => {
            const isCurrent = i === current;
            const reached = i <= current;
            const Icon = step.Icon;
            return (
              <li
                key={step.label}
                className="flex flex-col items-center gap-1.5"
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    reached
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                  } ${isCurrent ? "ring-2 ring-[var(--primary)]/15 ring-offset-2 ring-offset-[var(--background)]" : ""}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <span
                  className={`text-[11px] font-medium leading-none tracking-tight ${
                    reached ? "text-[var(--primary)]" : "text-[var(--muted)]"
                  }`}
                >
                  {/* Numbered prefix for very narrow viewports where the
                      label is collapsed via CSS — renders as just "1/2/3"
                      when the label hides. */}
                  <span className="hidden min-[360px]:inline">{step.label}</span>
                  <span className="inline min-[360px]:hidden">{i + 1}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
