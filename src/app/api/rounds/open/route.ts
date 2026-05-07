import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cheap public endpoint used by client components (e.g. the L-03 reorder
// button on /riwayat) to gate UI affordances on whether ordering is
// currently possible.
export async function GET() {
  const round = await prisma.preorderRound.findFirst({
    where: { status: "OPEN" },
    select: { id: true, title: true },
  });
  return NextResponse.json({
    ok: true,
    hasOpenRound: round !== null,
    roundId: round?.id ?? null,
    title: round?.title ?? null,
  });
}
