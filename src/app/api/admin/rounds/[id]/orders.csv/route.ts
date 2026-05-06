import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const round = await prisma.preorderRound.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "asc" },
        include: {
          items: { include: { roundProduct: { include: { product: true } } } },
          payment: true,
        },
      },
    },
  });
  if (!round) return new Response("Not found", { status: 404 });

  const headers = [
    "short_code",
    "created_at",
    "customer_name",
    "customer_whatsapp",
    "payment_method",
    "status",
    "total_amount_idr",
    "items",
    "notes",
    "payment_submitted_at",
    "payment_verified_at",
    "payment_proof_url",
  ];

  const rows = round.orders.map((o) => {
    const itemsStr = o.items
      .map((it) => `${it.quantity}× ${it.roundProduct.product.name} @ ${it.unitPrice}`)
      .join("; ");
    return [
      o.shortCode,
      o.createdAt.toISOString(),
      o.customerName,
      o.customerWhatsApp,
      o.paymentMethod,
      o.status,
      o.totalAmount,
      itemsStr,
      o.notes ?? "",
      o.payment?.paidAt?.toISOString() ?? "",
      o.payment?.verifiedAt?.toISOString() ?? "",
      o.payment?.proofImageUrl ?? "",
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const safeTitle = round.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `${safeTitle || "round"}-orders.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
