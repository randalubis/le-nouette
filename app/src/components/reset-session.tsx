"use client";

import { useState, useTransition } from "react";
import { resetSeedAction } from "@/lib/domain/actions";
import { ActionCard } from "@/components/ui/action-card";
import styles from "./founder.module.css";

const PHRASE = "HAPUS DATA";

export function ResetSessionCard() {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <ActionCard
      title="Reset data"
      subtitle="Menghapus semua pesanan, pembayaran, stok, dan riwayat. Jalankan `npm run db:seed` setelahnya untuk data contoh."
      note={`Ketik "${PHRASE}" untuk mengaktifkan tombol.`}
    >
      <input className={styles.search} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={PHRASE} aria-label="Ketik untuk konfirmasi reset" />
      <button className="btn btn-primary" disabled={pending || confirm !== PHRASE} onClick={() => startTransition(() => void resetSeedAction())}>Reset data</button>
    </ActionCard>
  );
}
