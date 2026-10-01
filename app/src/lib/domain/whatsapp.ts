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

/** Paragraphs are separated by a blank line so the message reads well in WhatsApp; *x* is WhatsApp bold. */
export function waMessage(kind: WaKind, order: Order): string {
  const first = order.customer.name.trim().split(/\s+/)[0];
  const head = first ? `Halo ${first}, ini Le Nouette.` : "Halo, ini Le Nouette.";
  const details = (when?: string, title = true) =>
    [
      ...(title ? [`Pesanan *${order.id}*`] : []),
      ...order.items.map((i) => `• ${i.quantity} × ${i.name}`),
      `Total: ${formatRupiah(order.total)}`,
      ...(when ? [`${when}: ${formatDate(order.currentReadyDate)}`] : []),
    ].join("\n");
  const due = receivable(order);
  const paid = amountPaid(order);
  const paragraphs: string[] = [head];
  switch (kind) {
    case "confirmation":
      paragraphs.push("Terima kasih sudah memesan!", `${details("Siap")}\n${place(order)}`);
      paragraphs.push(isPaid(order) ? "Pembayaran sudah kami terima, terima kasih!" : "Pembayaran bisa lewat transfer, QRIS, atau tunai saat serah terima. Kabari kami ya kalau sudah transfer.");
      break;
    case "ready":
      paragraphs.push(`Pesanan *${order.id}* sudah siap${order.fulfillment === "DELIVERY" ? " dan segera kami antar" : " untuk diambil"}.`, details(undefined, false));
      if (due > 0) paragraphs.push(`Sisa pembayaran ${formatRupiah(due)}.`);
      paragraphs.push("Terima kasih!");
      break;
    case "rescheduled":
      paragraphs.push(`Mohon maaf, jadwal pesanan *${order.id}* berubah.`, details("Kini siap", false), "Terima kasih atas pengertiannya!");
      break;
    case "cancelled":
      paragraphs.push(`Mohon maaf, pesanan *${order.id}* kami batalkan.`);
      if (paid > 0) paragraphs.push(`Pembayaran ${formatRupiah(paid)} akan kami kembalikan, kami hubungi untuk pengembaliannya.`);
      paragraphs.push("Terima kasih atas pengertiannya, semoga bisa melayani lain waktu.");
      break;
  }
  return paragraphs.join("\n\n");
}

export function waLink(kind: WaKind, order: Order): string | null {
  const num = toWaNumber(order.customer.whatsapp);
  return num && `https://wa.me/${num}?text=${encodeURIComponent(waMessage(kind, order))}`;
}
