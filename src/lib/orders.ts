import { prisma } from "@/lib/db";
import { generateShortCode, formatIDR } from "@/lib/utils";

export async function nextShortCode(): Promise<string> {
  const counter = await prisma.orderCounter.upsert({
    where: { id: 1 },
    create: { id: 1, value: 1 },
    update: { value: { increment: 1 } },
  });
  return generateShortCode(counter.value);
}

type PaymentMethodLabel = "QRIS" | "BANK_TRANSFER" | "COD";

type OrderForMessage = {
  shortCode: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: PaymentMethodLabel;
  items: Array<{ name: string; quantity: number }>;
  round: { title: string; deliveryDate: Date };
  orderUrl?: string;
};

export function paymentMethodLabel(method: PaymentMethodLabel): string {
  switch (method) {
    case "QRIS":
      return "QRIS";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    case "COD":
      return "Cash on Delivery";
  }
}

export function buildWhatsAppMessage(order: OrderForMessage): string {
  const lines = [
    `Halo, saya pesan ${order.shortCode}`,
    ``,
    `Nama: ${order.customerName}`,
    `Ronde: ${order.round.title}`,
    `Pengantaran: ${order.round.deliveryDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}`,
    `Pembayaran: ${paymentMethodLabel(order.paymentMethod)}`,
    ``,
    `Items:`,
    ...order.items.map((it) => `- ${it.quantity}× ${it.name}`),
    ``,
    `Total: ${formatIDR(order.totalAmount)}`,
    ...(order.orderUrl ? [``, `Cek pesanan: ${order.orderUrl}`] : []),
  ];
  return lines.join("\n");
}
