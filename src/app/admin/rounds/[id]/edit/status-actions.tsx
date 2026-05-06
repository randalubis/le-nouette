"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRoundStatusAction } from "../../actions";

const transitions: Record<string, { label: string; next: "OPEN" | "CLOSED" | "DELIVERED" | "DRAFT" }[]> = {
  DRAFT: [{ label: "Open round", next: "OPEN" }],
  OPEN: [{ label: "Close round", next: "CLOSED" }],
  CLOSED: [
    { label: "Reopen", next: "OPEN" },
    { label: "Mark delivered", next: "DELIVERED" },
  ],
  DELIVERED: [],
};

export function RoundStatusActions({
  id,
  status,
}: {
  id: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "DELIVERED";
}) {
  const [pending, startTransition] = useTransition();
  const options = transitions[status] ?? [];

  if (options.length === 0) {
    return <p className="text-sm text-zinc-500">No further transitions.</p>;
  }

  return (
    <div className="flex gap-2">
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
  );
}
