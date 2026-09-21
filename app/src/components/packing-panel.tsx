"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatQuantity, formatRupiah, products } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate, jakartaNow } from "@/lib/domain/schedule";
import { completeBatchAction } from "@/lib/domain/actions";
import styles from "./founder.module.css";

const shortMoney = (value: number) => (value >= 1_000_000 ? `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt` : value >= 1000 ? `Rp${Math.round(value / 1000)} rb` : formatRupiah(value));

export function DashboardSummary({ session }: { session: op.State }) {
  const month = jakartaNow(new Date()).date.slice(0, 7);
  const active = session.orders.filter((o) => o.status === "NEEDS_PREPARATION" || o.status === "READY_FOR_HANDOVER");
  const unpaid = session.orders.filter((o) => o.status !== "CANCELLED" && !op.isPaid(o));
  const revenue = session.orders.filter((o) => o.status !== "CANCELLED" && jakartaNow(new Date(o.createdAt)).date.startsWith(month)).reduce((sum, o) => sum + o.total, 0);
  const lowStock = op.balances(session).filter((item) => item.available < item.threshold);
  const nextBatch = op.pendingBatchDates(session)[0];

  return (
    <>
      {session.storeStatus === "PAUSED" && <p className={`status status-danger ${styles.banner}`}><WarningCircle size={15} /> Pemesanan sedang dijeda. <Link href="/founder/availability">Buka kalender</Link></p>}
      <section className={styles.metricGrid}>
        <Link href="/founder/orders" className={styles.metric}><span>Pesanan aktif</span><strong>{active.length}</strong><small>{active.filter((o) => o.status === "NEEDS_PREPARATION").length} perlu disiapkan</small></Link>
        <Link href="/founder/finance" className={styles.metric}><span>Omzet bulan ini</span><strong>{shortMoney(revenue)}</strong><small>Pesanan tidak dibatalkan</small></Link>
        <Link href="/founder/finance" className={`${styles.metric} ${unpaid.length ? styles.metricAlert : ""}`}><span>Belum dibayar</span><strong>{shortMoney(unpaid.reduce((sum, o) => sum + op.receivable(o), 0))}</strong><small>{unpaid.length} pesanan · lihat piutang</small></Link>
        <Link href="/founder/availability" className={styles.metric}><span>Batch packing berikutnya</span><strong>{nextBatch ? formatDate(nextBatch, "short") : "—"}</strong><small>Cut-off harian 18.00 WIB</small></Link>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Perlu perhatian</h2><p>Tindakan yang disarankan hari ini</p></div></div>
          <div className={styles.attentionList}>
            {lowStock.map((item) => (
              <div className={styles.attention} key={item.id}><Link href="/founder/stock"><strong><WarningCircle size={16} /> {item.name} di bawah ambang</strong></Link><span>{formatQuantity(item.id, item.available)} tersedia setelah reservasi</span><span className={`status ${item.available < 0 ? "status-danger" : "status-warning"}`}>Pesan ulang</span></div>
            ))}
            {unpaid.filter((o) => o.status === "READY_FOR_HANDOVER").map((o) => (
              <div className={styles.attention} key={o.id}><Link href="/founder/orders?tab=READY_FOR_HANDOVER"><strong>Pembayaran {o.id}</strong></Link><span>{o.fulfillment === "DELIVERY" ? "Wajib lunas sebelum dikirim" : "Jatuh tempo saat serah terima"}</span><span className="status status-danger">{formatRupiah(op.receivable(o))}</span></div>
            ))}
            {lowStock.length === 0 && !unpaid.some((o) => o.status === "READY_FOR_HANDOVER") && <p className={styles.empty}>Tidak ada yang mendesak.</p>}
          </div>
        </article>
        <PackingPanel session={session} />
      </section>
    </>
  );
}

export function PackingPanel({ session }: { session: op.State }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const date = op.pendingBatchDates(session)[0];
  const orders = session.orders.filter((o) => o.status === "NEEDS_PREPARATION" && o.currentReadyDate === date);
  const ids = new Set(orders.map((o) => o.id));
  const units = Object.fromEntries(products.map((p) => [p.id, orders.flatMap((o) => o.items).filter((i) => i.productId === p.id).reduce((sum, i) => sum + i.quantity, 0)]));
  const rawCheese = session.reservations.filter((r) => ids.has(r.orderId) && r.state === "ACTIVE" && r.itemId === "raw_cheese").reduce((sum, r) => sum + r.quantity, 0);
  const cheese = op.balances(session)[0];

  const complete = () => {
    if (!window.confirm(`Semua produk untuk ${orders.length} pesanan sudah dipacking? Stok bahan akan dikurangi dan pesanan pindah ke Siap Diserahkan.`)) return;
    startTransition(async () => {
      const { error } = await completeBatchAction(date);
      setError(error);
    });
  };

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}><div><h2>Batch packing berikutnya</h2><p>{date ? `${formatDate(date)} · ${orders.length} pesanan` : "Belum ada pesanan untuk dipacking"}</p></div><Link href="/founder/orders" className={styles.textLink}>Buka pesanan <ArrowRight size={15} /></Link></div>
      {date ? <>
        <div className={styles.packing}>
          {products.map((p) => <div key={p.id} className={styles.packItem}><div><strong>{units[p.id]}</strong><span>{p.name} · {p.netGrams}g</span></div><small>{(units[p.id] * p.netGrams).toLocaleString("id-ID")}g bersih</small></div>)}
        </div>
        <div className={styles.materials}><span>Kebutuhan bahan baku</span><b>{formatQuantity("raw_cheese", rawCheese)} cheese stick</b></div>
        <div className={styles.materials}><span>Quality-selection Milieu</span><b>±{formatQuantity("raw_cheese", units.milieu * (products[0].recipe.raw_cheese - products[0].netGrams * 100))} untuk konsumsi pribadi</b></div>
        {cheese.onHand < rawCheese && <p className={styles.hint}>Stok fisik {formatQuantity("raw_cheese", cheese.onHand)} belum cukup untuk batch ini.</p>}
        <button className={`btn btn-primary ${styles.batchButton}`} disabled={pending} onClick={complete}>Selesaikan batch · {orders.length} pesanan</button>
        {error && <p role="alert" className={styles.hint}>{error}</p>}
      </> : <p className={styles.batchDone}><CheckCircle size={18} weight="fill" /> Semua batch selesai.</p>}
    </article>
  );
}
