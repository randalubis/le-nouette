import { Croissant } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProductCard, type StorefrontProduct } from "./_components/product-card";
import { RoundBanner } from "./_components/round-banner";
import { CheckoutBar } from "./_components/checkout-bar";

export const dynamic = "force-dynamic";

export default async function StorefrontHome() {
  const round = await prisma.preorderRound.findFirst({
    where: { status: "OPEN" },
    include: {
      items: {
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      },
    },
  });

  if (!round) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3ede1]">
          <Croissant className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[var(--primary)]">Lagi tutup dulu</h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
          Preorder belum dibuka. Pantengin terus, ya — ronde berikutnya segera datang.
        </p>
      </div>
    );
  }

  const products: StorefrontProduct[] = round.items.map((it) => ({
    roundId: round.id,
    roundProductId: it.id,
    productId: it.productId,
    name: it.product.name,
    description: it.product.description,
    imageUrl: it.product.imageUrl,
    price: it.price,
    stockLeft: Math.max(0, it.stockLimit - it.stockSold),
  }));

  return (
    <div className="space-y-5">
      <div className="space-y-1 pt-2">
        <h1 className="font-serif text-3xl font-semibold leading-tight text-[var(--primary)]">
          Cemilan minggu ini
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Pilih cemilanmu, tambah ke keranjang, kirim pesananmu.
        </p>
      </div>

      <RoundBanner
        title={round.title}
        closesAt={round.closesAt.toISOString()}
        deliveryDate={round.deliveryDate.toISOString()}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <ProductCard key={p.roundProductId} product={p} />
        ))}
      </div>
      <CheckoutBar />
    </div>
  );
}
