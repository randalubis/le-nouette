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

  const rounds = await prisma.preorderRound.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      items: { include: { product: true } },
      _count: { select: { orders: true } },
    },
  });

  const headers = [
    "id",
    "title",
    "status",
    "opens_at",
    "closes_at",
    "delivery_date",
    "total_orders",
    "products",
    "bank_name",
    "bank_account_number",
    "bank_account_holder",
    "qris_image_url",
    "created_at",
  ];

  const rows = rounds.map((r) => [
    r.id,
    r.title,
    r.status,
    r.opensAt.toISOString(),
    r.closesAt.toISOString(),
    r.deliveryDate.toISOString(),
    r._count.orders,
    r.items
      .map(
        (it) =>
          `${it.product.name} (${it.stockSold}/${it.stockLimit} @ ${it.price})`,
      )
      .join("; "),
    r.bankName ?? "",
    r.bankAccountNumber ?? "",
    r.bankAccountHolder ?? "",
    r.qrisImageUrl ?? "",
    r.createdAt.toISOString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="le-nouette-rounds-${today}.csv"`,
    },
  });
}
