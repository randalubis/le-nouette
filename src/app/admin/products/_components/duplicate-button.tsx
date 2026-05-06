"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { duplicateProductAction } from "../actions";

export function DuplicateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await duplicateProductAction(id);
          } catch (e) {
            if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return;
            toast.error(e instanceof Error ? e.message : "Failed to duplicate.");
          }
        })
      }
      title="Duplicate this product"
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}
