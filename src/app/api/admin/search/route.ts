import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeWhatsApp } from "@/lib/utils";

const MAX_RESULTS = 8;

export type SearchHit =
  | {
      kind: "order";
      shortCode: string;
      customerName: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    }
  | {
      kind: "customer";
      whatsapp: string;
      name: string;
      orderCount: number;
    }
  | {
      kind: "round";
      id: string;
      title: string;
      status: string;
    };

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  await requireAdmin();
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ ok: true, hits: [] });

  const digits = digitsOnly(q);
  const hits: SearchHit[] = [];

  // Orders by shortCode or name (case-insensitive contains).
  const orderRows = await prisma.order.findMany({
    where: {
      OR: [
        { shortCode: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: MAX_RESULTS,
    orderBy: { createdAt: "desc" },
    select: {
      shortCode: true,
      customerName: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
  });
  for (const o of orderRows) {
    hits.push({
      kind: "order",
      shortCode: o.shortCode,
      customerName: o.customerName,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
    });
  }

  // Customers by WhatsApp digit substring — group by normalizedWhatsApp.
  if (digits.length >= 3) {
    const normalized = normalizeWhatsApp(q);
    const waRows = await prisma.order.findMany({
      where: {
        OR: [
          { normalizedWhatsApp: { contains: digits } },
          { normalizedWhatsApp: { contains: normalized } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        normalizedWhatsApp: true,
        customerWhatsApp: true,
        customerName: true,
      },
    });
    const seen = new Set<string>();
    for (const row of waRows) {
      const key = row.normalizedWhatsApp ?? row.customerWhatsApp;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        kind: "customer",
        whatsapp: key,
        name: row.customerName,
        orderCount: waRows.filter(
          (r) => (r.normalizedWhatsApp ?? r.customerWhatsApp) === key,
        ).length,
      });
      if (seen.size >= MAX_RESULTS) break;
    }
  }

  // Rounds by title.
  const roundRows = await prisma.preorderRound.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    take: MAX_RESULTS,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true },
  });
  for (const r of roundRows) {
    hits.push({ kind: "round", id: r.id, title: r.title, status: r.status });
  }

  return NextResponse.json({ ok: true, hits });
}
