"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setOrderStatusAction } from "../actions";

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
  const options = transitions[status];

  if (options.length === 0) {
    return <p className="text-sm text-zinc-500">No further transitions.</p>;
  }

  return (
    <div className="space-y-3">
      {paymentMethod !== "COD" && status === "PENDING_PAYMENT" && !hasProof && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Customer hasn&apos;t uploaded payment proof yet.
        </p>
      )}
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
    </div>
  );
}
