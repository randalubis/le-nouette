import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Tiny endpoint polled by the order confirmation page every 30 seconds while
// the order is in flight. Returns just status + updatedAt so the page can
// flip the badge without a full reload. (Plan ticket X-13.)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const order = await prisma.order.findUnique({
    where: { shortCode },
    select: { status: true, updatedAt: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    status: order.status,
    updatedAt: order.updatedAt.toISOString(),
  });
}
