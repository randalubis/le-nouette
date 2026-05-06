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

type OrderForMessage = {
  shortCode: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: "QRIS" | "COD";
  items: Array<{ name: string; quantity: number }>;
  round: { title: string; deliveryDate: Date };
};

export function buildWhatsAppMessage(order: OrderForMessage): string {
  const lines = [
    `Halo, saya pesan ${order.shortCode}`,
    ``,
    `Nama: ${order.customerName}`,
    `Ronde: ${order.round.title}`,
    `Pengantaran: ${order.round.deliveryDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}`,
    `Pembayaran: ${order.paymentMethod}`,
    ``,
    `Items:`,
    ...order.items.map((it) => `- ${it.quantity}× ${it.name}`),
    ``,
    `Total: ${formatIDR(order.totalAmount)}`,
  ];
  return lines.join("\n");
}
