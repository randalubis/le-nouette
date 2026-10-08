"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { products } from "@/lib/domain/catalog";
import { createInvoiceAction, updateInvoiceAction } from "@/lib/domain/invoice-actions";
import { catalogLine, computeTotals, formatInvoiceDate, rupiah, type InvoiceDraft, type InvoiceLine } from "@/lib/domain/invoice";
import styles from "./founder.module.css";
import s from "./invoice.module.css";

type OrderOpt = { id: string; label: string; draft: InvoiceDraft };
export type EditInvoice = InvoiceDraft & { id: number; number: string; orderId: string | null; issuedAt: string; dueDate: string };
const stepNames = ["Pembeli", "Produk", "Biaya", "Pratinjau"];
const blank: InvoiceLine = { name: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxPercent: 0 };
const n = (v: string) => (v === "" ? 0 : Number(v));

export function InvoiceWizard({ orders, initialOrderId, today, defaultNotes, invoice }: { orders: OrderOpt[]; initialOrderId: string | null; today: string; defaultNotes: string; invoice?: EditInvoice }) {
  const first = orders.find((o) => o.id === initialOrderId);
  const [step, setStep] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(first?.id ?? null);
  const seed = invoice ?? first?.draft; // edit mode seeds from the saved invoice
  const [buyer, setBuyer] = useState({ name: seed?.buyerName ?? "", phone: seed?.buyerPhone ?? "", address: seed?.buyerAddress ?? "" });
  const [lines, setLines] = useState<InvoiceLine[]>(seed?.lines ?? [{ ...blank }]);
  const [deliveryFee, setDeliveryFee] = useState(seed?.deliveryFee ?? 0);
  const [paid, setPaid] = useState(seed?.paid ?? 0);
  const [vat, setVat] = useState(invoice?.lines[0]?.taxPercent ?? 0);
  const [issuedAt, setIssuedAt] = useState(invoice?.issuedAt ?? today);
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? today);
  const [notes, setNotes] = useState(seed?.notes ?? defaultNotes);
  const [refreshCompany, setRefreshCompany] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | string | null>(null);
  const [pending, start] = useTransition();

  const pick = (id: string) => {
    const o = orders.find((x) => x.id === id);
    setOrderId(o?.id ?? null);
    if (!o) return;
    setBuyer({ name: o.draft.buyerName, phone: o.draft.buyerPhone, address: o.draft.buyerAddress });
    setLines(o.draft.lines); setDeliveryFee(o.draft.deliveryFee); setPaid(o.draft.paid);
  };
  const setLine = (i: number, patch: Partial<InvoiceLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  // VAT % from step 3 applies to every line.
  const taxed = lines.map((l) => ({ ...l, taxPercent: vat }));
  const t = computeTotals({ lines: taxed, deliveryFee, paid });

  const next = () => {
    if (step === 0 && !buyer.name.trim()) return setError("Nama pembeli wajib diisi.");
    if (step === 1 && !lines.some((l) => l.name.trim() && l.quantity > 0)) return setError("Tambahkan minimal satu produk.");
    setError(null); setStep(step + 1);
  };
  const submit = () => start(async () => {
    if (invoice) {
      const r = await updateInvoiceAction(invoice.id, { buyerName: buyer.name, buyerPhone: buyer.phone, buyerAddress: buyer.address, lines: taxed, deliveryFee, paid, notes, issuedAt, dueDate, refreshCompany });
      if (r.error) return setError(r.error);
      return setCreatedId(invoice.id);
    }
    const res = await createInvoiceAction({ orderId, buyerName: buyer.name, buyerPhone: buyer.phone, buyerAddress: buyer.address, lines: taxed, deliveryFee, paid, notes, issuedAt, dueDate });
    if (res.error || !res.id) return setError(res.error ?? "Gagal membuat invoice.");
    setCreatedId(res.id);
    window.open(`/founder/invoices/${res.id}/pdf`, "_blank", "noopener"); // may be popup-blocked; the success panel has a fallback link

  });

  if (createdId !== null) return (
    <section className={styles.panel}>
      <div className={s.form}>
        <p className={s.ok} role="status">{invoice ? `Invoice ${invoice.number} diperbarui.` : "Invoice dibuat."}</p>
        <div className={s.nav}>
          <a className="btn btn-primary" href={`/founder/invoices/${createdId}/pdf`} target="_blank" rel="noopener noreferrer">Unduh PDF</a>
          <Link className="btn btn-quiet" href="/founder/invoices">Ke daftar invoice</Link>
        </div>
      </div>
    </section>
  );

  return (
    <section className={styles.panel}>
      <ol className={s.steps} aria-label="Langkah">{stepNames.map((name, i) => <li key={name} aria-current={i === step ? "step" : undefined}>{i + 1}<span className={s.stepName}>. {name}</span></li>)}</ol>
      <div className={s.form}>
        {step === 0 && <>
          {invoice ? <p className={s.summary}>Invoice <strong>{invoice.number}</strong>{invoice.orderId ? ` · Pesanan ${invoice.orderId}` : ""}</p> : <label className={s.field}>Dari pesanan (opsional)
            <select value={orderId ?? ""} onChange={(e) => pick(e.target.value)}>
              <option value="">Invoice manual</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>}
          <label className={s.field}>Nama pembeli<input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} autoComplete="off" /></label>
          <label className={s.field}>Nomor telepon<input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} inputMode="tel" /></label>
          <label className={s.field}>Alamat<textarea value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} /></label>
        </>}
        {step === 1 && <>
          {lines.map((l, i) => (
            <fieldset key={i} className={s.line}>
              <legend>Produk {i + 1}</legend>
              <label className={s.field}>Pilih produk (opsional)
                <select value="" onChange={(e) => e.target.value && setLine(i, { ...catalogLine(e.target.value as "milieu" | "grande"), quantity: l.quantity || 1 })}>
                  <option value="">Ketik manual</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.netGrams} g)</option>)}
                </select>
              </label>
              <label className={s.field}>Nama<input value={l.name} onChange={(e) => setLine(i, { name: e.target.value })} /></label>
              <label className={s.field}>Deskripsi<input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} /></label>
              <div className={s.row}>
                <label className={s.field}>Qty<input type="number" min={1} inputMode="numeric" value={l.quantity} onChange={(e) => setLine(i, { quantity: n(e.target.value) })} /></label>
                <label className={s.field}>Harga (Rp)<input type="number" min={0} inputMode="numeric" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: n(e.target.value) })} /></label>
                <label className={s.field}>Diskon (Rp)<input type="number" min={0} inputMode="numeric" value={l.discount} onChange={(e) => setLine(i, { discount: n(e.target.value) })} /></label>
              </div>
              {lines.length > 1 && <button type="button" className={styles.textLink} onClick={() => setLines(lines.filter((_, j) => j !== i))}>Hapus produk</button>}
            </fieldset>
          ))}
          <button type="button" className="btn btn-quiet" onClick={() => setLines([...lines, { ...blank }])}>Tambah Produk</button>
        </>}
        {step === 2 && <>
          <div className={s.row}>
            <label className={s.field}>Ongkir (Rp)<input type="number" min={0} inputMode="numeric" value={deliveryFee} onChange={(e) => setDeliveryFee(n(e.target.value))} /></label>
            <label className={s.field}>Pajak / PPN (%)<input type="number" min={0} max={100} inputMode="decimal" value={vat} onChange={(e) => setVat(n(e.target.value))} /></label>
            <label className={s.field}>Sudah dibayar (Rp)<input type="number" min={0} inputMode="numeric" value={paid} onChange={(e) => setPaid(n(e.target.value))} /></label>
          </div>
          <div className={s.row}>
            <label className={s.field}>Tanggal<input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value || today)} style={{ minWidth: 0 }} /></label>
            <label className={s.field}>Tgl. jatuh tempo<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value || issuedAt)} style={{ minWidth: 0 }} /></label>
          </div>
          <label className={s.field}>Keterangan / promo<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /><small>Informasi pembayaran diambil dari halaman Pengaturan.</small></label>
          {invoice && <label className={`${s.field} ${s.check}`}><input type="checkbox" checked={refreshCompany} onChange={(e) => setRefreshCompany(e.target.checked)} />Perbarui info perusahaan dari Pengaturan</label>}
        </>}
        {step === 3 && <>
          <p className={s.summary}><strong>{buyer.name}</strong>{buyer.phone ? ` · ${buyer.phone}` : ""}<br />{formatInvoiceDate(issuedAt)} · jatuh tempo {formatInvoiceDate(dueDate)}</p>
          <div className={s.tableWrap}><table className={s.table}>
            <thead><tr><th>Produk</th><th>Qty</th><th>Jumlah</th></tr></thead>
            <tbody>{taxed.filter((l) => l.name.trim()).map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.quantity}</td><td>{rupiah(Math.max(l.quantity * l.unitPrice - l.discount, 0))}</td></tr>)}</tbody>
          </table></div>
          <div className={s.sum}>
            <div><span>Subtotal</span><span>{rupiah(t.subtotal)}</span></div>
            <div><span>Pajak</span><span>{rupiah(t.tax)}</span></div>
            <div><span>Ongkir</span><span>{rupiah(t.deliveryFee)}</span></div>
            <div className={s.grand}><span>Total</span><span>{rupiah(t.total)}</span></div>
            <div><span>Lunas</span><span>{rupiah(t.paid)}</span></div>
            <div className={s.grand}><span>Jumlah Tertagih</span><span>{rupiah(t.amountDue)}</span></div>
          </div>
        </>}
        {error && <p role="alert" className={s.error}>{error}</p>}
        <div className={s.nav}>
          {step > 0 && <button type="button" className="btn btn-quiet" onClick={() => { setError(null); setStep(step - 1); }}>Kembali</button>}
          {step < 3 ? <button type="button" className="btn btn-primary" onClick={next}>Lanjut</button>
            : <button type="button" className="btn btn-primary" disabled={pending} onClick={submit}>{pending ? (invoice ? "Menyimpan..." : "Membuat...") : invoice ? "Simpan Perubahan" : "Buat & Unduh PDF"}</button>}
        </div>
      </div>
    </section>
  );
}
