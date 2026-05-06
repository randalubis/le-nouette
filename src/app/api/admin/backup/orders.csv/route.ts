import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      round: { select: { title: true } },
      items: { include: { roundProduct: { include: { product: true } } } },
      payment: true,
    },
  });

  const headers = [
    "short_code",
    "created_at",
    "round_title",
    "customer_name",
    "customer_whatsapp",
    "payment_method",
    "status",
    "total_amount_idr",
    "items",
    "customer_notes",
    "admin_notes",
    "payment_submitted_at",
    "payment_verified_at",
    "payment_verified_by",
    "payment_proof_url",
  ];

  const rows = orders.map((o) => [
    o.shortCode,
    o.createdAt.toISOString(),
    o.round.title,
    o.customerName,
    o.customerWhatsApp,
    o.paymentMethod,
    o.status,
    o.totalAmount,
    o.items
      .map((it) => `${it.quantity}× ${it.roundProduct.product.name} @ ${it.unitPrice}`)
      .join("; "),
    o.notes ?? "",
    o.adminNotes ?? "",
    o.payment?.paidAt?.toISOString() ?? "",
    o.payment?.verifiedAt?.toISOString() ?? "",
    o.payment?.verifiedBy ?? "",
    o.payment?.proofImageUrl ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="le-nouette-orders-${today}.csv"`,
    },
  });
}
