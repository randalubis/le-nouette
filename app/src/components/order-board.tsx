"use client";

import { Clock, MapPin, Truck } from "@phosphor-icons/react";
import { useState } from "react";
import { formatRupiah } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate } from "@/lib/domain/schedule";
import { run, useSession } from "@/lib/session-store";
import styles from "./founder.module.css";

const tabs = [
  { status: "NEEDS_PREPARATION", title: "Perlu Disiapkan" },
  { status: "READY_FOR_HANDOVER", title: "Siap Diserahkan" },
  { status: "COMPLETED", title: "Selesai" },
  { status: "CANCELLED", title: "Dibatalkan" },
] as const;

export const placeLabel: Record<op.Fulfillment, string> = { PICKUP_MANDIRI: "Mandiri", PICKUP_BI: "BI", DELIVERY: "Delivery" };
const methodLabel: Record<op.PaymentMethod, string> = { TRANSFER: "Transfer", QRIS: "QRIS", CASH: "Tunai" };
export const itemsLabel = (order: op.Order) => order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");

export function OrderBoard({ initialTab }: { initialTab: op.OrderStatus }) {
  const session = useSession();
  const [tab, setTab] = useState<op.OrderStatus>(initialTab);
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  if (!session) return null;

  const act = (id: string, command: (state: op.State, now: Date) => op.State) => {
    const message = run(command);
    setError(message ? { id, message } : null);
  };
  const needle = query.trim().toLowerCase();
  const visible = session.orders
    .filter((order) => order.status === tab && (!needle || `${order.id} ${order.customer.name}`.toLowerCase().includes(needle)))
    .sort((a, b) => (tab === "COMPLETED" || tab === "CANCELLED" ? b.createdAt.localeCompare(a.createdAt) : a.currentReadyDate.localeCompare(b.currentReadyDate)));

  return (
    <>
      <div className={styles.orderToolbar}>
        <div className={styles.tabs} role="tablist">
          {tabs.map(({ status, title }) => (
            <button key={status} role="tab" aria-selected={tab === status} className={tab === status ? styles.tabActive : ""} onClick={() => setTab(status)}>
              {title} <span className={styles.tabCount}>{session.orders.filter((order) => order.status === status).length}</span>
            </button>
          ))}
        </div>
        <input className={styles.search} type="search" aria-label="Cari pesanan" placeholder="Cari nama atau nomor pesanan" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <section className={styles.orderList} aria-live="polite">
        {visible.length === 0 && <p className={styles.empty}>{needle ? "Tidak ada pesanan yang cocok." : "Tidak ada pesanan di sini."}</p>}
        {visible.map((order) => {
          const paid = op.isPaid(order);
          const lastPayment = order.payments.filter((payment) => !payment.reversedAt).at(-1);
          const delivery = order.fulfillment === "DELIVERY";
          const active = order.status === "NEEDS_PREPARATION" || order.status === "READY_FOR_HANDOVER";
          return (
            <article className={styles.orderCard} key={order.id}>
              <div className={styles.orderHead}>
                <strong>{order.id}</strong>
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
                    <button key={method} className="btn btn-quiet" onClick={() => { act(order.id, (s, now) => op.recordPayment(s, order.id, method, now)); setPaying(null); }}>{methodLabel[method]}</button>
                  ))}
                  <button className={styles.textLink} onClick={() => setPaying(null)}>Batal</button>
                </div>
              ) : (
                <div className={styles.cardActions}>
                  {order.status === "NEEDS_PREPARATION" && <small className={styles.hint}>Pindah otomatis saat batch packing {formatDate(order.currentReadyDate, "short")} diselesaikan.</small>}
                  {order.status === "READY_FOR_HANDOVER" && delivery && !order.dispatchedAt && <button className="btn btn-primary" onClick={() => act(order.id, (s, now) => op.dispatchOrder(s, order.id, now))}>Tandai Dikirim</button>}
                  {order.status === "READY_FOR_HANDOVER" && (!delivery || order.dispatchedAt) && <button className="btn btn-primary" onClick={() => act(order.id, (s, now) => op.completeOrder(s, order.id, now))}>Tandai Selesai</button>}
                  {!paid && order.status !== "CANCELLED" && <button className="btn btn-quiet" onClick={() => setPaying(order.id)}>Tandai Lunas</button>}
                  {paid && lastPayment && !order.dispatchedAt && <button className={styles.textLink} onClick={() => window.confirm(`Batalkan catatan pembayaran ${order.id}?`) && act(order.id, (s, now) => op.reversePayment(s, order.id, lastPayment.id, now))}>Koreksi pembayaran</button>}
                  {active && !order.dispatchedAt && <button className={styles.textLink} onClick={() => window.confirm(`Batalkan pesanan ${order.id}?`) && act(order.id, (s, now) => op.cancelOrder(s, order.id, now))}>Batalkan pesanan</button>}
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
