import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { uploadImage } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  const order = await prisma.order.findUnique({
    where: { shortCode },
    select: { id: true, status: true, paymentMethod: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
  }
  if (order.paymentMethod === "COD") {
    return NextResponse.json(
      { ok: false, error: "Pesanan COD tidak butuh upload bukti pembayaran." },
      { status: 400 },
    );
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { ok: false, error: "Pesanan sudah dikonfirmasi." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json({ ok: false, error: "File bukti dibutuhkan." }, { status: 400 });
  }

  let imageUrl: string;
  try {
    const uploaded = await uploadImage("payment-proofs", proof);
    imageUrl = uploaded.url;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Upload failed." },
      { status: 400 },
    );
  }

  await prisma.payment.update({
    where: { orderId: order.id },
    data: { proofImageUrl: imageUrl, paidAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
