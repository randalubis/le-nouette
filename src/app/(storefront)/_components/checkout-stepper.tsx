// Three-dot stepper rendered at the top of each checkout-funnel page so
// the customer always knows how far they are. Labels collapse on
// viewports under 360px wide so the row still fits. (Plan ticket N-08.)
const STEPS = ["Keranjang", "Pembayaran", "Selesai"] as const;

export type CheckoutStep = 0 | 1 | 2;

export function CheckoutStepper({ current }: { current: CheckoutStep }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress checkout">
      {STEPS.map((label, i) => {
        const reached = i <= current;
        const isLast = i === STEPS.length - 1;
        return (
          <li
            key={label}
            className="flex flex-1 items-center gap-1.5"
            aria-current={i === current ? "step" : undefined}
          >
            <div className="flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                  reached ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                }`}
              />
              <span
                className={`hidden text-[11px] font-medium leading-none tracking-tight min-[360px]:inline ${
                  reached ? "text-[var(--primary)]" : "text-[var(--muted)]"
                }`}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden="true"
                className={`h-px flex-1 transition-colors ${
                  reached ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
