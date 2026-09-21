"use client";

import { useTransition } from "react";
import { resetSeedAction } from "@/lib/domain/actions";

export function ResetSessionButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn btn-quiet"
      disabled={pending}
      onClick={() =>
        window.confirm("Hapus semua data dan mulai kosong? (Jalankan `npm run db:seed` setelahnya untuk data contoh.)") &&
        startTransition(() => {
          void resetSeedAction();
        })
      }
    >
      Reset data
    </button>
  );
}
