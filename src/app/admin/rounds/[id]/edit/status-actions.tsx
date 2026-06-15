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

const JKT_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function RoundStatusActions({
  id,
  status,
  opensAtIso,
}: {
  id: string;
  status: Status;
  opensAtIso: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // When the admin clicks "Open round" but opensAt is still in the
  // future, we pause and ask whether to honor the schedule or override.
  const [confirmingOpen, setConfirmingOpen] = useState(false);
  const options = transitions[status] ?? [];
  const canCancel = status === "DRAFT" || status === "OPEN" || status === "CLOSED";
  const opensAt = new Date(opensAtIso);

  function runStatusChange(next: NextStatus, options?: { openNow?: boolean }) {
    startTransition(async () => {
      const result = await setRoundStatusAction(id, next, options);
      setConfirmingOpen(false);
      if (!result.ok) toast.error(result.error);
      else toast.success(`Round → ${next}`);
    });
  }

  function handleOptionClick(next: NextStatus) {
    // Only the DRAFT → OPEN and CLOSED → OPEN transitions warrant the
    // schedule-vs-now choice. For all others, fire immediately.
    // eslint-disable-next-line react-hooks/purity -- read at click time inside an event handler, not during render.
    if (next === "OPEN" && opensAt.getTime() > Date.now()) {
      setConfirmingOpen(true);
      return;
    }
    runStatusChange(next);
  }

  return (
    <div className="space-y-4">
      {options.length > 0 && !confirmingOpen && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <Button
              key={opt.next}
              variant="outline"
              disabled={pending}
              onClick={() => handleOptionClick(opt.next)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}

      {confirmingOpen && (
        <div className="space-y-3 rounded-md border-[0.5px] border-[var(--border-strong)] bg-[var(--surface-warm-1)] p-3">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Buka ronde ini sekarang atau ikuti jadwal?
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Jadwal buka: {JKT_FMT.format(opensAt)} WIB. Kalau ikut jadwal, ronde
              baru muncul di sisi pelanggan tepat waktu itu. Kalau buka sekarang,
              ronde langsung tampil dan jadwal akan ditimpa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => runStatusChange("OPEN", { openNow: false })}
            >
              Ikuti jadwal
            </Button>
            <Button
              disabled={pending}
              onClick={() => runStatusChange("OPEN", { openNow: true })}
            >
              Buka sekarang
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmingOpen(false)}
            >
              Batal
            </Button>
          </div>
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
