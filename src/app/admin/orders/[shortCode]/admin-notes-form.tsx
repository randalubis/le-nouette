"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateAdminNotesAction } from "../actions";

export function AdminNotesForm({
  shortCode,
  initial,
}: {
  shortCode: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== initial.trim();

  function save() {
    startTransition(async () => {
      const result = await updateAdminNotesAction(shortCode, value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Notes saved.");
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Catatan internal (tidak terlihat oleh customer). Misal: 'Diambil oleh suami', 'Bayar terakhir Sabtu', dll."
        className="text-sm"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">
          {value.length} / 2000 · only visible to admin
        </p>
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving…" : dirty ? "Save notes" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
