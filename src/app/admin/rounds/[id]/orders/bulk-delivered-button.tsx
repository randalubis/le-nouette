"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bulkMarkDeliveredAction } from "@/app/admin/orders/actions";

export function BulkDeliveredButton({ roundId }: { roundId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Mark all delivered
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
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
        Confirm
      </Button>
      <Button variant="outline" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
