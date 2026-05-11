import Image from "next/image";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProductCard, type StorefrontProduct } from "./_components/product-card";
import { NotifyForm } from "./_components/notify-form";
import { HomeHero } from "./_components/home-hero";
import { CountdownCard } from "./_components/countdown-card";
import { StorefrontHeader } from "./_components/storefront-header";
import { getBusinessSettings } from "@/lib/settings";

const DEFAULT_TAGLINE =
  "Cemilan terbaik temani hari sibukmu di kantor ataupun santaimu di rumah.";

// X-12: revalidate every 60s as a safety net. Round/product writes call
// revalidatePath("/") explicitly so customers see fresh state within
// seconds of an admin edit.
export const revalidate = 60;

export default async function StorefrontHome() {
  // Status alone isn't enough — a round can be flipped to OPEN ahead of
  // time with opensAt in the future ("scheduled"). Customers should only
  // see it once opensAt has actually passed.
  const round = await prisma.preorderRound.findFirst({
    where: { status: "OPEN", opensAt: { lte: new Date() } },
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

  const settings = await getBusinessSettings();

  // Edition number = round's position in the all-time sequence. Cheap
  // count-where-newer-than-or-equal vs. createdAt; tiny tables in practice.
  const edition = await prisma.preorderRound.count({
    where: { createdAt: { lte: round.createdAt } },
  });

  const products: StorefrontProduct[] = round.items.map((it) => ({
    roundId: round.id,
    roundProductId: it.id,
    productId: it.productId,
    name: it.product.name,
    description: it.product.description,
    imageUrl: it.product.imageUrl,
    price: it.price,
    stockLeft: Math.max(0, it.stockLimit - it.stockSold),
    aspectRatio: it.product.aspectRatio === "portrait" ? "portrait" : "square",
  }));

  // Static brand hero photo lives at public/hero-product.jpg. Replaces
  // the previous "first product image" picker — using a curated brand
  // shot keeps the hero on-message regardless of the active round's
  // product order.
  const heroImage = "/hero-product.jpg";
  const tagline = settings.aboutBlurb?.trim() || DEFAULT_TAGLINE;

  // Round may still be flagged OPEN in the DB even after the close
  // timestamp passes (admin hasn't flipped status yet). The hero status
  // pill needs to reflect the wall-clock truth, not just the DB status.
  const isPastClose = Date.now() > round.closesAt.getTime();

  return (
    <div className="space-y-6">
      <HomeHero
        imageUrl={heroImage}
        tagline={tagline}
        todayIso={new Date().toISOString()}
        isPastClose={isPastClose}
      />

      <CountdownCard
        title={round.title}
        closesAtIso={round.closesAt.toISOString()}
        edition={edition}
      />

      {round.story && (
        <p className="font-serif text-base italic text-[var(--foreground)]">
          {round.story}
          <span className="ml-2 text-xs not-italic uppercase tracking-wider text-[var(--muted)]">
            — dari dapur kami
          </span>
        </p>
      )}

      {/* Section heading + scroll anchor for the CTA in CountdownCard. */}
      <div id="menu-anchor" className="flex items-baseline justify-between pt-1">
        <h2 className="font-serif text-2xl italic text-[var(--foreground)]">
          Pilihan minggu ini
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
          {products.length} produk
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <ProductCard key={p.roundProductId} product={p} />
        ))}
      </div>
    </div>
  );
}

async function ClosedRoundTeaser() {
  // The layout-rendered StorefrontHeader self-suppresses at "/", so the
  // closed-round branch opts back in via forceShow. Open-round skips the
  // header entirely (its full-bleed hero takes over the top of the page).

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

  // L-06: most recent 3 positive reviews surface as social proof.
  const reviews = await prisma.review.findMany({
    where: { rating: { gte: 2 }, comment: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      rating: true,
      comment: true,
      order: { select: { customerName: true } },
    },
  });

  // Mirror the open-round hero's date + status block. Status text + dot
  // color reflect that pre-orders are not currently accepted.
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-6 pb-12">
      <StorefrontHeader forceShow />

      {/* Date + closed-state pill */}
      <div className="pt-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
          {todayLabel}
        </p>
        <p className="mt-1 inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full bg-[var(--ink-mute)]"
          />
          Saat ini kami belum buka pre-order
        </p>
      </div>

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
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
                  className="w-32 shrink-0 rounded-xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-2"
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

      {/* Reviews — L-06 social proof */}
      {reviews.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--muted)]">
            Cerita pelanggan
          </h2>
          <ul className="space-y-2">
            {reviews.map((r, i) => (
              <li
                key={i}
                className="rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <p className="text-sm italic text-[var(--foreground)]">
                  &ldquo;{r.comment}&rdquo;
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  — {r.order.customerName.split(" ")[0]}
                  {r.rating === 3 ? " · 😍" : " · 🙂"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cadence */}
      {settings.typicalCadence && (
        <section className="rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4">
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
