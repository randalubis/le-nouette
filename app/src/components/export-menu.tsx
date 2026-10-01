"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./founder.module.css";

// <details> that closes on Escape or an outside click.
export function ExportMenu({ summary, links, children }: { summary: React.ReactNode; links: { href: string; label: string }[]; children?: React.ReactNode }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !el.contains(event.target as Node)) el.open = false;
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, []);
  const href = (base: string) => {
    const q = new URLSearchParams(base.split("?")[1]);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return q.size ? `${base.split("?")[0]}?${q}` : base;
  };
  const reversed = !!from && !!to && from > to;
  return (
    <details ref={ref} className={styles.exportMenu}>
      {summary}
      <div className={styles.exportList}>
        <div className={styles.exportRange}>
          <label>Dari<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Sampai<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          <button type="button" onClick={() => { setFrom(""); setTo(""); }} disabled={!from && !to}>Kosongkan</button>
          {reversed && <p role="alert" className={styles.exportError}>Tanggal akhir sebelum tanggal awal</p>}
          <p className={styles.exportHint}>Tanggal pesanan untuk pesanan &amp; pelanggan, tanggal bayar untuk pembayaran, tanggal mutasi untuk stok. Saldo stok tidak terpengaruh.</p>
        </div>
        {links.map((l) => reversed
          ? <a key={l.href} role="link" aria-disabled="true" className={styles.exportDisabled}>{l.label}</a>
          : <a key={l.href} href={href(l.href)}>{l.label}</a>)}
        {children}
      </div>
    </details>
  );
}
