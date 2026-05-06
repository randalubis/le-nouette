"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveProductAction, activateProductAction } from "../actions";

export function ActiveToggle({
  id,
  initialActive,
}: {
  id: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    setActive(next); // optimistic
    startTransition(async () => {
      const action = next ? activateProductAction : archiveProductAction;
      const result = await action(id);
      if (!result.ok) {
        setActive(!next);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Activated" : "Archived");
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={pending}
      onClick={toggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-60 ${
        active ? "bg-green-600" : "bg-zinc-300"
      }`}
      title={active ? "Active — click to archive" : "Archived — click to activate"}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          active ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
