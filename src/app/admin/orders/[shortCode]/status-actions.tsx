"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setOrderStatusAction, deleteOrderAction } from "../actions";

type Status =
  | "PENDING_PAYMENT"
  | "PENDING_CONFIRMATION"
  | "PAID"
  | "CONFIRMED"
  | "DELIVERED"
  | "CANCELLED"
  | "HOLD_EXPIRED";

// Happy-path transitions only — cancel is rendered separately in the
// Danger zone block below so it can't sit next to "Mark delivered" and
// invite a misclick. (Plan ticket X-08.)
const HAPPY_PATH: Record<
  Status,
  Array<{ label: string; next: Status; variant?: "default" | "outline" }>
> = {
  PENDING_PAYMENT: [{ label: "Verify payment", next: "PAID" }],
  // X-06: COD orders sit here until the admin confirms.
  PENDING_CONFIRMATION: [{ label: "Confirm order", next: "CONFIRMED" }],
  PAID: [
    { label: "Mark confirmed", next: "CONFIRMED" },
    { label: "Mark delivered", next: "DELIVERED" },
  ],
  CONFIRMED: [{ label: "Mark delivered", next: "DELIVERED" }],
  DELIVERED: [],
  CANCELLED: [{ label: "Reactivate (set to confirmed)", next: "CONFIRMED", variant: "outline" }],
  // X-04: terminal state for soft-hold timeouts. No happy-path transitions —
  // operator can still reactivate via the cancellation/reactivation pattern
  // if the customer comes back, but that path goes through Cancel → reset.
  HOLD_EXPIRED: [],
};

const CAN_CANCEL: ReadonlySet<Status> = new Set([
  "PENDING_PAYMENT",
  "PENDING_CONFIRMATION",
  "PAID",
  "CONFIRMED",
]);

export function OrderStatusActions({
  shortCode,
  status,
  paymentMethod,
  hasProof,
}: {
  shortCode: string;
  status: Status;
  paymentMethod: "QRIS" | "BANK_TRANSFER" | "COD";
  hasProof: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const happy = HAPPY_PATH[status];
  const canCancel = CAN_CANCEL.has(status);
  const canDelete = status === "CANCELLED";

  return (
    <div className="space-y-4">
      {paymentMethod !== "COD" && status === "PENDING_PAYMENT" && !hasProof && (
        <p className="rounded-md bg-[var(--badge-warning-bg)] p-3 text-sm text-[var(--badge-warning-fg)]">
          Customer hasn&apos;t uploaded payment proof yet.
        </p>
      )}

      {happy.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {happy.map((opt) => (
            <Button
              key={opt.next}
              variant={opt.variant ?? "default"}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setOrderStatusAction(shortCode, opt.next);
                  if (!result.ok) toast.error(result.error);
                  else toast.success(`Status → ${opt.next.replace("_", " ")}`);
                })
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}

      {happy.length === 0 && status !== "CANCELLED" && (
        <p className="text-sm text-[var(--muted)]">No further transitions.</p>
      )}

      {(canCancel || canDelete) && (
        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Danger zone</p>

          {canCancel && !confirmingCancel && (
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel order
            </Button>
          )}

          {canCancel && confirmingCancel && (
            <div className="space-y-2">
              <p className="rounded-md bg-[var(--badge-destructive-bg)] p-3 text-sm text-[var(--badge-destructive-fg)]">
                Cancel this order? Stock will be restored and the customer will need
                to be notified via WhatsApp.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await setOrderStatusAction(shortCode, "CANCELLED");
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Order cancelled.");
                      setConfirmingCancel(false);
                    })
                  }
                >
                  Yes, cancel
                </Button>
                <Button variant="outline" onClick={() => setConfirmingCancel(false)}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {canDelete && !confirmingDelete && (
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete order permanently
            </Button>
          )}

          {canDelete && confirmingDelete && (
            <div className="space-y-2">
              <p className="rounded-md bg-[var(--badge-destructive-bg)] p-3 text-sm text-[var(--badge-destructive-fg)]">
                Permanently removes this cancelled order and its line items from the database.
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteOrderAction(shortCode);
                      } catch (e) {
                        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return;
                        toast.error(e instanceof Error ? e.message : "Failed to delete.");
                      }
                    })
                  }
                >
                  Yes, delete
                </Button>
                <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
