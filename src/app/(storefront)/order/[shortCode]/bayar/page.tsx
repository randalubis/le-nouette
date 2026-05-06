import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import { ProofUploader } from "./proof-uploader";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const order = await prisma.order.findUnique({
    where: { shortCode },
    include: { round: { select: { qrisImageUrl: true, title: true } }, payment: true },
  });
  if (!order) notFound();

  if (order.status !== "PENDING_PAYMENT") {
    // Payment already done — redirect to confirmation
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium">Pembayaran sudah dikonfirmasi</p>
          <p className="mt-1 text-sm text-zinc-500">
            Pesanan {order.shortCode} sedang diproses.
          </p>
          <a
            href={`/order/${order.shortCode}`}
            className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Lihat ringkasan
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembayaran QRIS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600">
            Pesanan <span className="font-semibold">{order.shortCode}</span>
          </p>
          <p className="text-2xl font-semibold">{formatIDR(order.totalAmount)}</p>

          {order.round.qrisImageUrl ? (
            <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <Image
                src={order.round.qrisImageUrl}
                alt="QRIS"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
              QRIS belum diatur oleh admin. Hubungi admin via WhatsApp.
            </div>
          )}

          <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-700">
            <li>Buka aplikasi pembayaran (Gopay, OVO, BCA, dll).</li>
            <li>Scan QRIS di atas, transfer sesuai total.</li>
            <li>Screenshot bukti transfer dan upload di bawah ini.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload bukti transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <ProofUploader shortCode={order.shortCode} />
        </CardContent>
      </Card>
    </div>
  );
}
