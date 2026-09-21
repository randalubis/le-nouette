"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatQuantity, formatRupiah, type ItemId } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate, jakartaNow, recommendReschedule, type DateStatus } from "@/lib/domain/schedule";
import { itemsLabel } from "@/components/order-board";
import { receiveStockAction, stockOpnameAction, setDateStatusAction, setStoreStatusAction, rescheduleOrderAction } from "@/lib/domain/actions";
import styles from "./founder.module.css";

const today = () => jakartaNow(new Date()).date;

// Raw cheese is entered in grams; everything else in pieces.
const toStored = (item: ItemId, input: string) => Math.round(Number(input) * (item === "raw_cheese" ? 100 : 1));

export function StockBoard({ session }: { session: op.State }) {
  const [draft, setDraft] = useState<Partial<Record<ItemId, string>>>({});
  const [message, setMessage] = useState<{ id: ItemId; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const act = (id: ItemId, action: Promise<{ error: string | null }>) => {
    startTransition(async () => {
      const { error } = await action;
      setMessage(error ? { id, text: error } : null);
      if (!error) setDraft((current) => ({ ...current, [id]: "" }));
    });
  };
  const items = op.balances(session);

  return (
    <>
      <div className={styles.stockHeader}><div><h2>Inventaris utama</h2><p>Stok fisik dikurangi reservasi pesanan. Peringatan hanya mengingatkan, tidak memesan otomatis.</p></div></div>
      <section className={styles.stockGrid}>
        {items.map((item) => {
          const low = item.available < item.threshold;
          const value = draft[item.id] ?? "";
          return (
            <article key={item.id} className={`${styles.stockCard} ${low ? styles.warn : ""}`}>
              <div className={styles.stockCardTop}><h3>{item.name}</h3>{low ? <span className="status status-warning"><WarningCircle size={13} /> Rendah</span> : <span className="status status-safe">Aman</span>}</div>
              <div className={styles.stockValue}>{formatQuantity(item.id, item.available)}</div>
              <p>tersedia · fisik {formatQuantity(item.id, item.onHand)} · reservasi {formatQuantity(item.id, item.reserved)}</p>
              <div className={styles.cardActions}>
                <input className={styles.search} style={{ minWidth: 0, flex: "1 1 100%" }} type="number" min={0} inputMode="decimal" aria-label={`Jumlah ${item.name}`} placeholder={item.id === "raw_cheese" ? "Gram" : "Pcs"} value={value} onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value }))} />
                <button className="btn btn-quiet" disabled={!value} onClick={() => act(item.id, receiveStockAction(item.id, toStored(item.id, value)))}>Terima stok</button>
                <button className="btn btn-quiet" disabled={value === ""} onClick={() => act(item.id, stockOpnameAction(item.id, toStored(item.id, value)))}>Hasil opname</button>
              </div>
              {message?.id === item.id && <p role="alert" className={styles.hint}>{message.text}</p>}
              <div className={styles.stockFooter}><span>Ambang {formatQuantity(item.id, item.threshold)}</span></div>
            </article>
          );
        })}
      </section>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Riwayat pergerakan stok</h2><p>Pergerakan tidak diubah atau dihapus; koreksi dicatat sebagai opname.</p></div></div>
        {session.movements.slice(-10).reverse().map((m) => (
          <div className={styles.paymentRow} key={m.id}><div><strong>{items.find((i) => i.id === m.itemId)!.name}</strong><small>{new Date(m.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</small></div><div>{{ RECEIPT: "Penerimaan", STOCK_OPNAME: "Opname", PACKING_CONSUMPTION: "Konsumsi packing" }[m.reason]}</div><strong>{m.delta > 0 ? "+" : ""}{formatQuantity(m.itemId, m.delta)}</strong></div>
        ))}
      </section>
    </>
  );
}

export function FinanceBoard({ session }: { session: op.State }) {
  const orders = session.orders.filter((o) => o.status !== "CANCELLED");
  const payments = session.orders.flatMap((o) => o.payments.filter((p) => !p.reversedAt));
  const received = payments.reduce((sum, p) => sum + p.amount, 0);
  const share = (method: op.PaymentMethod) => (received ? `${Math.round((payments.filter((p) => p.method === method).reduce((s, p) => s + p.amount, 0) / received) * 100)}%` : "—");

  return (
    <>
      <section className={styles.financeHero}>
        <div><span>Omzet (sesi ini)</span><h2>{formatRupiah(orders.reduce((sum, o) => sum + o.total, 0))}</h2><p>{orders.length} pesanan · {orders.flatMap((o) => o.items).reduce((s, i) => s + i.quantity, 0)} produk</p></div>
        <div className={styles.financeSide}>
          <div><strong>{formatRupiah(received)}</strong><span>Sudah diterima</span></div>
          <div><strong>{formatRupiah(orders.reduce((sum, o) => sum + op.receivable(o), 0))}</strong><span>Belum dibayar</span></div>
          <div><strong>{share("TRANSFER")}</strong><span>Transfer</span></div>
          <div><strong>{share("QRIS")}</strong><span>QRIS · Tunai {share("CASH")}</span></div>
        </div>
      </section>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Pesanan & piutang</h2><p>Pesanan selesai boleh belum dibayar; konfirmasi pembayaran dilakukan founder di Pesanan.</p></div></div>
        {[...orders].reverse().map((o) => (
          <div className={styles.paymentRow} key={o.id}><div><strong>{o.customer.name}</strong><small>{o.id} · {itemsLabel(o)}</small></div><div><span className={`status ${op.isPaid(o) ? "status-safe" : "status-danger"}`}>{op.isPaid(o) ? "Lunas" : `Piutang ${formatRupiah(op.receivable(o))}`}</span></div><strong>{formatRupiah(o.total)}</strong></div>
        ))}
      </section>
    </>
  );
}

export function AvailabilityBoard({ session }: { session: op.State }) {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<DateStatus>("HOLIDAY");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const affected = date ? op.ordersOnDate(session, date) : [];
  const suggestion = affected.length ? recommendReschedule(date, { ...session.calendar, [date]: status }, today()) : null;
  const act = (action: Promise<{ error: string | null }>) => startTransition(async () => setError((await action).error));
  const block = () => act(setDateStatusAction(date, status));
  const moveAndBlock = () => act((async () => {
    for (const order of affected) {
      const { error } = await rescheduleOrderAction(order.id, suggestion!);
      if (error) return { error };
    }
    return setDateStatusAction(date, status);
  })());
  const upcoming = Object.entries(session.calendar).filter(([d]) => d >= today()).sort();
  const paused = session.storeStatus === "PAUSED";

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2>Status toko</h2><p>{paused ? "Pesanan baru ditolak. Pesanan yang ada tetap berjalan." : "Toko menerima pesanan. Tanggal tertutup dilewati otomatis."}</p></div>
          <button className={`btn ${paused ? "btn-primary" : "btn-quiet"}`} onClick={() => act(setStoreStatusAction(paused ? "OPEN" : "PAUSED"))}>{paused ? "Buka pemesanan" : "Jeda pemesanan"}</button>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Tutup tanggal</h2><p>Libur nasional atau keperluan keluarga. Pesanan pada tanggal itu harus dipindahkan dulu.</p></div></div>
        <div className={styles.cardActions}>
          <input className={styles.search} type="date" min={today()} aria-label="Tanggal" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className={styles.search} aria-label="Jenis" value={status} onChange={(event) => setStatus(event.target.value as DateStatus)}><option value="HOLIDAY">Libur nasional</option><option value="UNAVAILABLE">Tidak tersedia</option></select>
          {affected.length === 0 && <button className="btn btn-primary" disabled={!date} onClick={block}>Tutup tanggal</button>}
        </div>
        {affected.length > 0 && (
          <div className={styles.attention}>
            <strong><WarningCircle size={16} /> {affected.length} pesanan pada {formatDate(date)}</strong>
            <span>{affected.map((o) => `${o.id} (${itemsLabel(o)})`).join(" · ")}</span>
            {suggestion
              ? <button className="btn btn-primary" onClick={moveAndBlock}>Pindahkan ke {formatDate(suggestion)} & tutup</button>
              : <span className="status status-danger">Tidak ada tanggal pengganti otomatis. Sepakati tanggal dengan pelanggan atau batalkan pesanan.</span>}
          </div>
        )}
        {error && <p role="alert" className={styles.hint}>{error}</p>}
      </section>

      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Tanggal tertutup</h2><p>Mandiri, BI, dan pengiriman memakai kalender yang sama.</p></div></div>
        {upcoming.length === 0 && <p className={styles.empty}>Belum ada tanggal tertutup.</p>}
        {upcoming.map(([d, s]) => (
          <div className={styles.paymentRow} key={d}><div><strong>{formatDate(d)}</strong><small>{s === "HOLIDAY" ? "Libur nasional" : "Tidak tersedia"}</small></div><div /><button className={styles.textLink} onClick={() => act(setDateStatusAction(d, null))}>Buka kembali</button></div>
        ))}
      </section>
    </>
  );
}
