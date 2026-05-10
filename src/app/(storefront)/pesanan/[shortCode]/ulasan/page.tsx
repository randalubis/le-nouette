import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

export default async function UlasanPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const order = await prisma.order.findUnique({
    where: { shortCode },
    select: {
      shortCode: true,
      customerName: true,
      status: true,
      review: { select: { rating: true, comment: true } },
    },
  });
  if (!order) notFound();

  if (order.status !== "DELIVERED") {
    return (
      <div className="space-y-4 py-10 text-center">
        <h1 className="font-serif text-2xl italic text-[var(--primary)]">
          Belum bisa kasih ulasan
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Pesanan ini belum diantar. Coba lagi setelah pesanan sampai.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-[var(--foreground)] underline-offset-4 hover:underline"
        >
          Kembali ke menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-4">
      <div className="text-center">
        <h1 className="font-serif text-2xl italic text-[var(--primary)]">
          Halo {order.customerName.split(" ")[0]}, makasih sudah pesan
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Boleh kasih rating singkat? Bantu kami untuk ronde berikutnya.
        </p>
      </div>
      <ReviewForm
        shortCode={order.shortCode}
        initialRating={order.review?.rating ?? null}
        initialComment={order.review?.comment ?? null}
      />
    </div>
  );
}
