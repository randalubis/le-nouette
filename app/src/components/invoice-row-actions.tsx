"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "@phosphor-icons/react";
import { deleteInvoiceAction, markInvoicePaidAction, undoInvoicePaidAction } from "@/lib/domain/invoice-actions";
import { rupiah } from "@/lib/domain/invoice";
import type { PaymentMethod } from "@/lib/domain/operations";
import s from "./invoice.module.css";

const methodLabel: Record<PaymentMethod, string> = { TRANSFER: "Transfer", QRIS: "QRIS", CASH: "Tunai" };

export type RowOrder = { id: string; receivable: number; paid: boolean; cancelled: boolean };
type Mode = "pay" | "undo" | "delete" | null;

export function InvoiceRowActions({ id, number, total, paid, order, orderPaymentId }: { id: number; number: string; total: number; paid: boolean; order: RowOrder | null; orderPaymentId: string | null }) {
  const [mode, setMode] = useState<Mode>(null);
  const [method, setMethod] = useState<PaymentMethod>("TRANSFER");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const run = (fn: () => Promise<{ error: string | null }>) => start(async () => {
    const res = await fn();
    if (res.error) { setError(res.error); router.refresh(); return; } // refresh: list may be stale after a rejection
    setError(null); setMode(null);
  });
  const open = (m: Mode) => { setError(null); setMode(m); };
  const cancelled = order?.cancelled ?? false;
  const recordsPayment = !!order && !order.paid && !cancelled;
  const mismatch = recordsPayment && order.receivable !== total;

  // keep the confirm panel clear of the fixed bottom nav
  useEffect(() => { if (mode) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [mode]);
  const blocked = !!error && mode === "undo"; // undo rejected (e.g. dispatched): retrying is pointless

  const lockId = `lock-${id}`;
  const lockText = "Invoice lunas terkunci; batalkan lunas untuk mengedit atau menghapus.";

  if (mode) return (
    <div ref={ref} className={s.confirm} role="group" aria-label={`Konfirmasi ${number}`}>
      {mode === "pay" && <>
        <label className={s.field}>Metode pembayaran
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(Object.keys(methodLabel) as PaymentMethod[]).map((m) => <option key={m} value={m}>{methodLabel[m]}</option>)}
          </select>
        </label>
        <p>Total invoice {rupiah(total)}.{recordsPayment ? ` Piutang pesanan ${order.id} ${rupiah(order.receivable)} akan dicatat lunas.` : order ? ` Pesanan ${order.id} tidak diubah.` : ""}</p>
        {mismatch && <p className={s.warn} role="alert">Total invoice berbeda dari piutang pesanan. Pembayaran pesanan mengikuti piutang pesanan.</p>}
      </>}
      {mode === "undo" && <p>Batalkan lunas {number}?{orderPaymentId ? " Catatan pembayaran yang dibuat invoice ini ikut dibatalkan." : order ? ` Pesanan ${order.id} tetap lunas.` : ""}</p>}
      {mode === "delete" && <p>Hapus {number}? Nomor ini tidak akan dipakai ulang.</p>}
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.confirmBtns}>
        <button type="button" className="btn btn-primary" disabled={pending || blocked} onClick={() => run(() => mode === "pay" ? markInvoicePaidAction(id, method) : mode === "undo" ? undoInvoicePaidAction(id) : deleteInvoiceAction(id))}>
          {pending ? "Memproses..." : mode === "pay" ? "Konfirmasi Lunas" : mode === "undo" ? "Batalkan Lunas" : "Hapus"}
        </button>
        <button type="button" className="btn btn-quiet" disabled={pending} onClick={() => setMode(null)}>{blocked ? "Tutup" : "Batal"}</button>
      </div>
    </div>
  );

  return (
    <div className={s.actions}>
      <a className="btn btn-quiet" href={`/founder/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">Unduh</a>
      {paid ? <>
        <button type="button" className="btn btn-quiet" disabled aria-describedby={lockId}>Edit</button>
        <button type="button" className={`btn btn-quiet ${s.danger}`} disabled aria-describedby={lockId}>Hapus</button>
        <button type="button" className={`btn btn-quiet ${s.lead}`} onClick={() => open("undo")}>Batalkan Lunas</button>
        <span className={s.lock} title={lockText}><Lock size={14} aria-hidden="true" />Terkunci<span id={lockId} className={s.sr}>{lockText}</span></span>
      </> : <>
        <Link className="btn btn-quiet" href={`/founder/invoices/${id}/edit`}>Edit</Link>
        <button type="button" className={`btn btn-quiet ${s.danger}`} onClick={() => open("delete")}>Hapus</button>
        {!cancelled && <button type="button" className={`btn btn-primary ${s.lead}`} onClick={() => open("pay")}>Tandai Lunas</button>}
        {cancelled && <small className={s.hint} title={`Pesanan ${order!.id} dibatalkan; tidak bisa ditandai lunas.`}>Pesanan dibatalkan</small>}
        {!cancelled && order?.paid && <small className={s.hint}>Pesanan sudah lunas</small>}
      </>}
    </div>
  );
}
