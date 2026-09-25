"use client";

import { Clock, MapPin, Truck } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate } from "@/lib/domain/schedule";
import { recordPaymentAction, dispatchOrderAction, dispatchOrdersAction, completeOrderAction, reversePaymentAction, cancelOrderAction } from "@/lib/domain/actions";
import { ActionCard } from "@/components/ui/action-card";
import styles from "./founder.module.css";

const tabs = [
  { status: "NEEDS_PREPARATION", title: "Perlu Disiapkan" },
  { status: "READY_FOR_HANDOVER", title: "Siap Diserahkan" },
  { status: "COMPLETED", title: "Selesai" },
  { status: "CANCELLED", title: "Dibatalkan" },
] as const;

export const placeLabel: Record<op.Fulfillment, string> = { PICKUP_MANDIRI: "Mandiri", PICKUP_BI: "BI", DELIVERY: "Delivery" };
const methodLabel: Record<op.PaymentMethod, string> = { TRANSFER: "Transfer", QRIS: "QRIS", CASH: "Tunai" };
export const itemsLabel = (order: op.Order) => order.items.map((item) => `${item.quantity} × ${item.name}${item.readyQuantity ? ` (${item.readyQuantity} dari stok siap)` : ""}`).join(", ");

export function OrderBoard({ session, initialTab }: { session: op.State; initialTab: op.OrderStatus }) {
  const [tab, setTab] = useState<op.OrderStatus>(initialTab);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"ready" | "created">("ready");
  const [fulfillment, setFulfillment] = useState<op.Fulfillment | "ALL">("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const changeTab = (status: op.OrderStatus) => { setTab(status); setSelected(new Set()); };
  const act = (id: string, action: Promise<{ error: string | null }>) => {
    startTransition(async () => {
      const { error } = await action;
      setError(error ? { id, message: error } : null);
    });
  };
  const toggleSelected = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const bulkDispatch = () => {
    setBulkError(null);
    startTransition(async () => {
      const { error } = await dispatchOrdersAction([...selected]);
      if (error) setBulkError(error); else setSelected(new Set());
    });
  };

  const needle = query.trim().toLowerCase();
  const visible = session.orders
    .filter((order) => order.status === tab && (fulfillment === "ALL" || order.fulfillment === fulfillment) && (!needle || `${order.id} ${order.customer.name}`.toLowerCase().includes(needle)))
    .sort((a, b) => (sort === "created" ? b.createdAt.localeCompare(a.createdAt) : a.currentReadyDate.localeCompare(b.currentReadyDate)));

  return (
    <>
      <div className={styles.orderToolbar}>
        <div className={`${styles.tabs} ${styles.chips}`} role="tablist">
          {tabs.map(({ status, title }) => (
            <button key={status} role="tab" aria-selected={tab === status} className={tab === status ? styles.tabActive : ""} onClick={() => changeTab(status)}>
              {title} <span className={styles.tabCount}>{session.orders.filter((order) => order.status === status).length}</span>
            </button>
          ))}
        </div>
        <input className={styles.search} type="search" aria-label="Cari pesanan" placeholder="Cari nama atau nomor pesanan" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className={`${styles.tabs} ${styles.chips}`} role="group" aria-label="Filter tujuan">
        <button aria-pressed={fulfillment === "ALL"} className={fulfillment === "ALL" ? styles.tabActive : ""} onClick={() => setFulfillment("ALL")}>Semua</button>
        {(Object.keys(placeLabel) as op.Fulfillment[]).map((id) => (
          <button key={id} aria-pressed={fulfillment === id} className={fulfillment === id ? styles.tabActive : ""} onClick={() => setFulfillment(id)}>{placeLabel[id]}</button>
        ))}
        <select className={styles.search} style={{ minWidth: 0 }} aria-label="Urutkan" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
          <option value="ready">Tanggal siap terdekat</option>
          <option value="created">Terbaru dibuat</option>
        </select>
      </div>

      {selected.size > 0 && (
        <ActionCard
          title={`${selected.size} pesanan dipilih`}
          headerAction={<button className={styles.textLink} onClick={() => setSelected(new Set())}>Batal pilih</button>}
          note={bulkError}
        >
          <button className="btn btn-primary" onClick={bulkDispatch}>Tandai Dikirim ({selected.size})</button>
        </ActionCard>
      )}

      <section className={styles.orderList} aria-live="polite">
        {visible.length === 0 && <p className={styles.empty}>{needle ? "Tidak ada pesanan yang cocok." : "Tidak ada pesanan di sini."}</p>}
        {visible.map((order) => {
          const paid = op.isPaid(order);
          const lastPayment = order.payments.filter((payment) => !payment.reversedAt).at(-1);
          const delivery = order.fulfillment === "DELIVERY";
          const active = order.status === "NEEDS_PREPARATION" || order.status === "READY_FOR_HANDOVER";
          const bulkEligible = order.status === "READY_FOR_HANDOVER" && delivery && !order.dispatchedAt && paid;
          return (
            <article className={styles.orderCard} key={order.id}>
              <div className={styles.orderHead}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {bulkEligible && <input type="checkbox" aria-label={`Pilih ${order.id}`} checked={selected.has(order.id)} onChange={() => toggleSelected(order.id)} />}
                  <strong>{order.id}</strong>
                </span>
                <span className={`status ${paid ? "status-safe" : "status-danger"}`}>{paid ? `Lunas${lastPayment ? ` · ${methodLabel[lastPayment.method]}` : ""}` : "Belum dibayar"}</span>
              </div>
              <h3>{order.customer.name}</h3>
              <p>{itemsLabel(order)}{order.note ? ` · “${order.note}”` : ""}</p>
              <div className={styles.orderMeta}>
                <span><MapPin size={13} /> {placeLabel[order.fulfillment]}</span>
                <span><Clock size={13} /> {formatDate(order.currentReadyDate, "short")}</span>
                {order.dispatchedAt && <span><Truck size={13} /> Dikirim</span>}
              </div>
              {delivery && order.address && <p className={styles.hint}>{order.address}</p>}
              <div className={styles.stockFooter}><span>Total</span><strong>{formatRupiah(order.total)}</strong></div>

              {paying === order.id ? (
                <div className={styles.cardActions} role="group" aria-label={`Metode pembayaran ${order.id}`}>
                  {(Object.keys(methodLabel) as op.PaymentMethod[]).map((method) => (
                    <button key={method} className="btn btn-quiet" onClick={() => { act(order.id, recordPaymentAction(order.id, method)); setPaying(null); }}>{methodLabel[method]}</button>
                  ))}
                  <button className={styles.textLink} onClick={() => setPaying(null)}>Batal</button>
                </div>
              ) : (
                <div className={styles.cardActions}>
                  {order.status === "NEEDS_PREPARATION" && <small className={styles.hint}>Pindah otomatis saat batch packing {formatDate(order.currentReadyDate, "short")} diselesaikan.</small>}
                  {order.status === "READY_FOR_HANDOVER" && delivery && !order.dispatchedAt && <button className="btn btn-primary" onClick={() => act(order.id, dispatchOrderAction(order.id))}>Tandai Dikirim</button>}
                  {order.status === "READY_FOR_HANDOVER" && (!delivery || order.dispatchedAt) && <button className="btn btn-primary" onClick={() => act(order.id, completeOrderAction(order.id))}>Tandai Selesai</button>}
                  {!paid && order.status !== "CANCELLED" && <button className="btn btn-quiet" onClick={() => setPaying(order.id)}>Tandai Lunas</button>}
                  {paid && lastPayment && !order.dispatchedAt && <button className={styles.textLink} onClick={() => window.confirm(`Batalkan catatan pembayaran ${order.id}?`) && act(order.id, reversePaymentAction(order.id, lastPayment.id))}>Koreksi pembayaran</button>}
                  {active && !order.dispatchedAt && <button className={styles.textLink} onClick={() => window.confirm(`Batalkan pesanan ${order.id}?`) && act(order.id, cancelOrderAction(order.id))}>Batalkan pesanan</button>}
                  {order.status === "CANCELLED" && amountPaidNote(order)}
                  {error?.id === order.id && <small role="alert" className={styles.hint}>{error.message}</small>}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}

const amountPaidNote = (order: op.Order) => op.amountPaid(order) > 0 && <small className={styles.hint}>Sudah dibayar {formatRupiah(op.amountPaid(order))}: proses refund manual.</small>;
