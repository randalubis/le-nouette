"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setOrderStatusAction, deleteOrderAction } from "../actions";

type Status = "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "DELIVERED" | "CANCELLED";

const transitions: Record<
  Status,
  Array<{ label: string; next: Status; variant?: "default" | "destructive" | "outline" }>
> = {
  PENDING_PAYMENT: [
    { label: "Verify payment", next: "PAID" },
    { label: "Cancel order", next: "CANCELLED", variant: "destructive" },
  ],
  PAID: [
    { label: "Mark confirmed", next: "CONFIRMED" },
    { label: "Mark delivered", next: "DELIVERED" },
    { label: "Cancel order", next: "CANCELLED", variant: "destructive" },
  ],
  CONFIRMED: [
    { label: "Mark delivered", next: "DELIVERED" },
    { label: "Cancel order", next: "CANCELLED", variant: "destructive" },
  ],
  DELIVERED: [],
  CANCELLED: [{ label: "Reactivate (set to confirmed)", next: "CONFIRMED", variant: "outline" }],
};

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
  const options = transitions[status];

  return (
    <div className="space-y-4">
      {paymentMethod !== "COD" && status === "PENDING_PAYMENT" && !hasProof && (
        <p className="rounded-md bg-[var(--badge-warning-bg)] p-3 text-sm text-[var(--badge-warning-fg)]">
          Customer hasn&apos;t uploaded payment proof yet.
        </p>
      )}

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
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

      {options.length === 0 && status !== "CANCELLED" && (
        <p className="text-sm text-[var(--muted)]">No further transitions.</p>
      )}

      {status === "CANCELLED" && (
        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Danger zone</p>
          {!confirmingDelete ? (
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete order permanently
            </Button>
          ) : (
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
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
