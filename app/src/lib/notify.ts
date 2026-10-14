// Server-side only (uses secret env vars). Telegram push for new orders.
// Privacy: third-party service, so the message carries no phone, address or note.
import { formatRupiah } from "./domain/catalog.ts";
import type { Order } from "./domain/operations.ts";
import { formatDate } from "./domain/schedule.ts";

// ponytail: no site-URL env exists in the codebase, so the founder link line is omitted.
export const formatNewOrderMessage = (o: Pick<Order, "id" | "customer" | "items" | "total" | "fulfillment" | "promisedReadyDate">) =>
  [
    `🧀 Pesanan baru ${o.id}`,
    `${o.customer.name.trim().split(/\s+/)[0]} · ${o.items.reduce((n, i) => n + i.quantity, 0)} item · ${formatRupiah(o.total)}`,
    `${o.fulfillment === "DELIVERY" ? "Antar" : "Ambil sendiri"} · siap ${formatDate(o.promisedReadyDate, "short")}`,
  ].join("\n");

export async function notifyNewOrder(order: Parameters<typeof formatNewOrderMessage>[0]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: formatNewOrderMessage(order) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`Telegram notify failed: HTTP ${res.status}`);
  } catch (e) {
    console.error("Telegram notify failed:", e instanceof Error ? e.name : "error"); // never log the URL (contains token)
  }
}
