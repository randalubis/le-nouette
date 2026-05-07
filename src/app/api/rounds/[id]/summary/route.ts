import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const round = await prisma.preorderRound.findUnique({
    where: { id },
    select: { title: true, deliveryDate: true, status: true },
  });
  if (!round) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    title: round.title,
    deliveryDate: round.deliveryDate.toISOString(),
    status: round.status,
  });
}
