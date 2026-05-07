import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifySubscribeSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Format permintaan tidak valid. Coba refresh halaman lalu coba lagi.",
      },
      { status: 400 },
    );
  }

  const parsed = notifySubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error:
          parsed.error.issues[0]?.message ??
          "Nomor WhatsApp tidak valid. Pakai format 0812... atau 628...",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.notifySubscriber.create({
      data: { whatsapp: parsed.data.whatsapp },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // Already subscribed: re-activate if previously opted out, otherwise
      // succeed idempotently with a friendlier flag for the UI to show
      // a "kamu sudah terdaftar" message.
      await prisma.notifySubscriber.update({
        where: { whatsapp: parsed.data.whatsapp },
        data: { optedOutAt: null },
      });
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }
    return NextResponse.json(
      {
        ok: false,
        error: "Maaf, gagal menyimpan. Coba lagi sebentar.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
