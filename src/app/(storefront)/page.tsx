import Image from "next/image";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProductCard, type StorefrontProduct } from "./_components/product-card";
import { RoundBanner } from "./_components/round-banner";
import { CheckoutBar } from "./_components/checkout-bar";
import { NotifyForm } from "./_components/notify-form";
import { getBusinessSettings } from "@/lib/settings";

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
    return await ClosedRoundTeaser();
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
      <div className="pt-2">
        <h1 className="font-serif text-3xl font-semibold leading-tight text-[var(--primary)]">
          Cemilan minggu ini
        </h1>
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

async function ClosedRoundTeaser() {
  // Hero photo + past-products strip come from the most recent round that
  // actually shipped — falling back to CLOSED if nothing's been delivered
  // yet. We grab a small bunch of items and let the layout pick a hero.
  const pastRound = await prisma.preorderRound.findFirst({
    where: { status: { in: ["DELIVERED", "CLOSED"] } },
    orderBy: { deliveryDate: "desc" },
    include: {
      items: {
        take: 6,
        include: { product: true },
        orderBy: { stockSold: "desc" },
      },
    },
  });

  const settings = await getBusinessSettings();
  const heroImage = pastRound?.items[0]?.product.imageUrl ?? null;
  const pastItems = pastRound?.items ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {heroImage ? (
          <div className="relative aspect-[5/3] w-full bg-[var(--surface-warm-1)]">
            {/* alt="" — decorative; the heading conveys the meaning. */}
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 768px, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="aspect-[5/3] w-full bg-gradient-to-br from-[var(--surface-warm-2)] to-[var(--surface-warm-3)]" />
        )}
        <div className="space-y-2 p-5 text-center">
          <h1 className="font-serif text-2xl italic text-[var(--primary)]">
            Cemilan minggu depan lagi disiapin
          </h1>
          {settings.aboutBlurb ? (
            <p className="text-sm text-[var(--muted)]">{settings.aboutBlurb}</p>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Preorder belum dibuka. Daftar di bawah biar gak kelewat ronde berikutnya.
            </p>
          )}
        </div>
      </section>

      {/* Notify-me */}
      <NotifyForm />

      {/* Past round strip */}
      {pastItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--muted)]">
            Yang lalu
          </h2>
          <div className="-mx-4 overflow-x-auto px-4">
            <ul className="flex gap-3">
              {pastItems.slice(0, 6).map((it) => (
                <li
                  key={it.id}
                  className="w-32 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2"
                >
                  <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-[var(--surface-warm-1)]">
                    {/* alt="" — name is the adjacent text below. */}
                    <Image
                      src={it.product.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                  <p className="truncate text-xs font-medium text-[var(--foreground)]">
                    {it.product.name}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Cadence */}
      {settings.typicalCadence && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Jadwal kami</p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {settings.typicalCadence}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
