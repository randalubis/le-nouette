"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/domain/auth-actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn btn-quiet"
      disabled={pending}
      onClick={() => startTransition(() => { void logoutAction(); })}
    >
      Keluar
    </button>
  );
}
