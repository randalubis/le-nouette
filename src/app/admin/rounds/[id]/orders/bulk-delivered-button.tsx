"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bulkMarkDeliveredAction } from "@/app/admin/orders/actions";

export function BulkDeliveredButton({
  roundId,
  eligibleCount,
}: {
  roundId: string;
  eligibleCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        variant="outline"
        disabled={eligibleCount === 0}
        title={
          eligibleCount === 0
            ? "No paid or confirmed orders to mark delivered"
            : `Mark all ${eligibleCount} eligible orders as delivered`
        }
        onClick={() => setConfirming(true)}
      >
        Mark all delivered
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--muted)]">
        Mark {eligibleCount} {eligibleCount === 1 ? "order" : "orders"} delivered?
      </span>
      <Button
        variant="default"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await bulkMarkDeliveredAction(roundId);
            setConfirming(false);
            if (!result.ok) toast.error(result.error);
            else toast.success("Pesanan ditandai sebagai delivered.");
          })
        }
      >
        Yes, mark delivered
      </Button>
      <Button variant="outline" onClick={() => setConfirming(false)}>
        Back
      </Button>
    </div>
  );
}
