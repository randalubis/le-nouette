import Image from "next/image";
import { notFound } from "next/navigation";
import { Copy } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import { ProofUploader } from "./proof-uploader";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const order = await prisma.order.findUnique({
    where: { shortCode },
    include: {
      round: {
        select: {
          qrisImageUrl: true,
          title: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
        },
      },
      payment: true,
    },
  });
  if (!order) notFound();

  if (order.paymentMethod === "COD") {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium">Pesanan ini tidak butuh pembayaran online</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Bayar saat pesanan diantar (COD).
          </p>
          <a
            href={`/order/${order.shortCode}`}
            className="mt-4 inline-block rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)]"
          >
            Lihat ringkasan pesanan
          </a>
        </CardContent>
      </Card>
    );
  }

  if (order.status !== "PENDING_PAYMENT") {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium">Pembayaran sudah dikonfirmasi</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pesanan {order.shortCode} sedang diproses.
          </p>
          <a
            href={`/order/${order.shortCode}`}
            className="mt-4 inline-block rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)]"
          >
            Lihat ringkasan
          </a>
        </CardContent>
      </Card>
    );
  }

  const isBank = order.paymentMethod === "BANK_TRANSFER";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isBank ? "Pembayaran via Bank Transfer" : "Pembayaran via QRIS"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-[var(--muted)]">
              Pesanan <span className="font-semibold text-[var(--foreground)]">{order.shortCode}</span>
            </p>
            <p className="mt-1 font-serif text-3xl font-semibold text-[var(--primary)]">
              {formatIDR(order.totalAmount)}
            </p>
          </div>

          {isBank ? (
            <BankTransferDetails
              bankName={order.round.bankName}
              accountNumber={order.round.bankAccountNumber}
              accountHolder={order.round.bankAccountHolder}
            />
          ) : (
            <QrisDisplay qrisImageUrl={order.round.qrisImageUrl} />
          )}

          {isBank ? (
            <ol className="list-inside list-decimal space-y-1.5 text-sm text-[var(--foreground)]">
              <li>Buka aplikasi mobile banking atau e-wallet kamu.</li>
              <li>Transfer <span className="font-semibold">tepat sejumlah {formatIDR(order.totalAmount)}</span> ke rekening di atas.</li>
              <li>Screenshot bukti transfer dan upload di bawah ini.</li>
            </ol>
          ) : (
            <ol className="list-inside list-decimal space-y-1.5 text-sm text-[var(--foreground)]">
              <li>
                Buka aplikasi pembayaran kamu —{" "}
                <span className="font-semibold">Livin by Mandiri, Gopay, OVO, dll.</span>
              </li>
              <li>Scan kode QRIS di atas, lalu transfer sesuai total.</li>
              <li>Screenshot bukti transfer dan upload di bawah ini.</li>
            </ol>
          )}
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

function QrisDisplay({ qrisImageUrl }: { qrisImageUrl: string | null }) {
  if (!qrisImageUrl) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
        QRIS belum diatur oleh admin. Hubungi admin via WhatsApp.
      </div>
    );
  }
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <Image src={qrisImageUrl} alt="QRIS" fill className="object-contain" sizes="(max-width: 640px) 100vw, 320px" />
    </div>
  );
}

function BankTransferDetails({
  bankName,
  accountNumber,
  accountHolder,
}: {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
}) {
  if (!bankName || !accountNumber || !accountHolder) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
        Detail bank transfer belum diatur oleh admin. Hubungi admin via WhatsApp.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#fdf9f1] p-4 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Bank</p>
        <p className="font-medium">{bankName}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Atas Nama</p>
        <p className="font-medium">{accountHolder}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Nomor Rekening</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-mono text-lg font-semibold tabular-nums">{accountNumber}</p>
          <CopyButton value={accountNumber}>
            <Copy className="h-3.5 w-3.5" />
            <span className="ml-1 text-xs">Salin</span>
          </CopyButton>
        </div>
      </div>
    </div>
  );
}
