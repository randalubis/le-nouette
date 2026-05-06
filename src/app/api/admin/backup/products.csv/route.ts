import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
  });

  const headers = [
    "id",
    "name",
    "description",
    "base_price_idr",
    "is_active",
    "image_url",
    "created_at",
    "updated_at",
  ];

  const rows = products.map((p) => [
    p.id,
    p.name,
    p.description ?? "",
    p.basePrice,
    p.isActive ? "true" : "false",
    p.imageUrl,
    p.createdAt.toISOString(),
    p.updatedAt.toISOString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="le-nouette-products-${today}.csv"`,
    },
  });
}
