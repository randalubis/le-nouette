import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { errorMessage } from "@/lib/errors";
import { uploadImage } from "@/lib/storage";
import { normalizeWhatsApp } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  const order = await prisma.order.findUnique({
    where: { shortCode },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      customerWhatsApp: true,
    },
  });
  if (!order) {
    return NextResponse.json(
      { ok: false, error: errorMessage("ORDER_NOT_FOUND") },
      { status: 404 },
    );
  }
  if (order.paymentMethod === "COD") {
    return NextResponse.json(
      { ok: false, error: errorMessage("PAYMENT_NOT_REQUIRED") },
      { status: 400 },
    );
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { ok: false, error: errorMessage("ORDER_ALREADY_CONFIRMED") },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: errorMessage("UNKNOWN") }, { status: 400 });
  }

  const submittedWhatsApp = String(formData.get("whatsapp") ?? "");
  if (!submittedWhatsApp) {
    return NextResponse.json(
      { ok: false, error: errorMessage("WHATSAPP_REQUIRED") },
      { status: 400 },
    );
  }
  const normalizedSubmitted = normalizeWhatsApp(submittedWhatsApp);
  if (normalizedSubmitted !== order.customerWhatsApp) {
    return NextResponse.json(
      { ok: false, error: errorMessage("WHATSAPP_MISMATCH") },
      { status: 403 },
    );
  }

  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json(
      { ok: false, error: errorMessage("PROOF_FILE_REQUIRED") },
      { status: 400 },
    );
  }

  let imageUrl: string;
  try {
    const uploaded = await uploadImage("payment-proofs", proof);
    imageUrl = uploaded.url;
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage("UPLOAD_FAILED", {
          reason: e instanceof Error ? e.message : undefined,
        }),
      },
      { status: 400 },
    );
  }

  // X-04: clear the soft hold once proof is in. The order stays in
  // PENDING_PAYMENT until the admin verifies; the reconciler will skip
  // it because stockHoldExpiresAt is null.
  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId: order.id },
      data: { proofImageUrl: imageUrl, paidAt: new Date() },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { stockHoldExpiresAt: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
