import { formatRupiah } from "./catalog.ts";
import { amountPaid, isPaid, receivable, type Order } from "./operations.ts";
import { formatDate } from "./schedule.ts";

export type WaKind = "confirmation" | "ready" | "rescheduled" | "cancelled";

/** Normalise an Indonesian mobile number to wa.me digits (62…), or null if invalid. Same rule as createOrder. */
export function toWaNumber(raw: string): string | null {
  const n = raw.replace(/[\s-]/g, "");
  if (!/^(\+62|62|0)8\d{7,13}$/.test(n)) return null;
  return n.replace(/^\+?62/, "62").replace(/^0/, "62");
}

/** Which message the founder should send for this order's current state; null when nothing to send. */
export function waKindFor(order: Order): WaKind | null {
  if (order.status === "COMPLETED") return null;
  if (order.status === "CANCELLED") return "cancelled";
  if (order.status === "READY_FOR_HANDOVER") return "ready";
  return order.currentReadyDate !== order.promisedReadyDate ? "rescheduled" : "confirmation";
}

const place = (o: Order) =>
  o.fulfillment === "DELIVERY" ? `Pesanan akan kami antar${o.address ? ` ke ${o.address}` : ""}.` : `Pengambilan di Kantor ${o.fulfillment === "PICKUP_BI" ? "BI" : "Mandiri"}.`;

export function waMessage(kind: WaKind, order: Order): string {
  const first = order.customer.name.trim().split(/\s+/)[0];
  const items = order.items.map((i) => `${i.quantity} × ${i.name}`).join(", ");
  const date = formatDate(order.currentReadyDate);
  const head = first ? `Halo ${first}, ini Le Nouette.` : "Halo, ini Le Nouette.";
  const summary = `${items}. Total ${formatRupiah(order.total)}.`;
  const due = receivable(order);
  const paid = amountPaid(order);
  switch (kind) {
    case "confirmation":
      return `${head} Terima kasih sudah memesan! Pesanan ${order.id}: ${summary} Siap ${date}. ${place(order)} ${isPaid(order) ? "Pembayaran sudah kami terima, terima kasih!" : "Pembayaran bisa lewat transfer, QRIS, atau tunai saat serah terima. Kabari kami ya kalau sudah transfer."}`;
    case "ready":
      return `${head} Pesanan ${order.id} sudah siap${order.fulfillment === "DELIVERY" ? " dan segera kami antar" : " untuk diambil"}. ${summary}${due > 0 ? ` Sisa pembayaran ${formatRupiah(due)}.` : ""} Terima kasih!`;
    case "rescheduled":
      return `${head} Mohon maaf, jadwal pesanan ${order.id} berubah. Pesanan kini siap ${date}. ${summary} Terima kasih atas pengertiannya!`;
    case "cancelled":
      return `${head} Mohon maaf, pesanan ${order.id} kami batalkan.${paid > 0 ? ` Pembayaran ${formatRupiah(paid)} akan kami kembalikan, kami hubungi untuk pengembaliannya.` : ""} Terima kasih atas pengertiannya, semoga bisa melayani lain waktu.`;
  }
}

export function waLink(kind: WaKind, order: Order): string | null {
  const num = toWaNumber(order.customer.whatsapp);
  return num && `https://wa.me/${num}?text=${encodeURIComponent(waMessage(kind, order))}`;
}
