"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRoundStatusAction, cancelRoundAction } from "../../actions";

type Status = "DRAFT" | "OPEN" | "CLOSED" | "DELIVERED" | "CANCELLED";
type NextStatus = "OPEN" | "CLOSED" | "DELIVERED" | "DRAFT";

const transitions: Record<Status, { label: string; next: NextStatus }[]> = {
  DRAFT: [{ label: "Open round", next: "OPEN" }],
  OPEN: [{ label: "Close round", next: "CLOSED" }],
  CLOSED: [
    { label: "Reopen", next: "OPEN" },
    { label: "Mark delivered", next: "DELIVERED" },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

export function RoundStatusActions({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const options = transitions[status] ?? [];
  const canCancel = status === "DRAFT" || status === "OPEN" || status === "CLOSED";

  return (
    <div className="space-y-4">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <Button
              key={opt.next}
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setRoundStatusAction(id, opt.next);
                  if (!result.ok) toast.error(result.error);
                  else toast.success(`Round → ${opt.next}`);
                })
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}

      {options.length === 0 && !canCancel && (
        <p className="text-sm text-[var(--muted)]">No further transitions.</p>
      )}

      {canCancel && (
        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Danger zone</p>
          {!confirmingCancel ? (
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel round
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="rounded-md bg-[var(--badge-destructive-bg)] p-3 text-sm text-[var(--badge-destructive-fg)]">
                This cancels every non-cancelled order in this round and restores their stock.
                Customers&apos; orders will be marked as cancelled. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await cancelRoundAction(id);
                      setConfirmingCancel(false);
                      if (!result.ok) toast.error(result.error);
                      else toast.success("Round cancelled.");
                    })
                  }
                >
                  Yes, cancel everything
                </Button>
                <Button variant="outline" onClick={() => setConfirmingCancel(false)}>
                  Keep round
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
