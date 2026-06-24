"use client";

import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";

export type StorefrontProduct = {
  roundId: string;
  roundProductId: string;
  productId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  price: number;
  stockLeft: number;
  // L-04: 'square' (1:1) or 'portrait' (4:5). Defaults to square at the
  // call site for legacy products.
  aspectRatio?: "square" | "portrait";
};

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { cart, add, setQuantity } = useCart();
  const inCart = cart?.items.find((it) => it.roundProductId === product.roundProductId);
  const qty = inCart?.quantity ?? 0;
  const out = product.stockLeft <= 0;
  const atMax = qty >= product.stockLeft;

  function handleAdd() {
    add(
      product.roundId,
      {
        roundProductId: product.roundProductId,
        productId: product.productId,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
      },
      1,
    );
  }

  return (
    <article
      className={`group overflow-hidden rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(58,38,16,0.04)] transition-shadow hover:shadow-[0_8px_28px_-12px_rgba(58,38,16,0.18)] ${
        out ? "opacity-60" : ""
      }`}
    >
      <div
        className="relative w-full overflow-hidden bg-[var(--surface-warm-1)]"
        style={{ aspectRatio: product.aspectRatio === "portrait" ? "4 / 5" : "1 / 1" }}
      >
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(min-width: 640px) 50vw, 100vw"
        />
        <div className="absolute right-2 top-2">
          {out ? (
            <span className="rounded-full bg-[var(--destructive)] px-2.5 py-1 text-xs font-medium text-white shadow-sm">
              Habis
            </span>
          ) : product.stockLeft <= 5 ? (
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] shadow-sm">
              {product.stockLeft} sisa
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-4">
        <div>
          <h3 className="font-medium leading-tight text-[var(--foreground)]">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-serif text-lg font-semibold text-[var(--primary)]">
            {formatIDR(product.price)}
          </span>
          {out ? null : qty === 0 ? (
            <Button size="sm" onClick={handleAdd}>
              Tambah
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setQuantity(product.roundProductId, qty - 1)}
                aria-label="Kurangi"
                className="h-9 w-9"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                {qty}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setQuantity(product.roundProductId, qty + 1)}
                disabled={atMax}
                aria-label="Tambah"
                className="h-9 w-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
