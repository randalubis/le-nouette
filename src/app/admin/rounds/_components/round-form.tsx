"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIDR, formatIDRInput, parseIDR } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string;
};

type LineItem = {
  productId: string;
  price: number;
  stockLimit: number;
  stockSold?: number;
};

type Initial = {
  id?: string;
  title?: string;
  opensAt?: Date;
  closesAt?: Date;
  deliveryDate?: Date;
  qrisImageUrl?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  items?: LineItem[];
};

type ActionResult = { ok: true } | { ok: false; error: string };

function toLocalInput(d?: Date) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(d?: Date) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RoundForm({
  initial,
  products,
  action,
}: {
  initial?: Initial;
  products: Product[];
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const [items, setItems] = useState<LineItem[]>(initial?.items ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [qrisPreview, setQrisPreview] = useState<string | null>(initial?.qrisImageUrl ?? null);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const availableProducts = products.filter((p) => !items.find((it) => it.productId === p.id));

  function addProduct(productId: string) {
    const p = productMap.get(productId);
    if (!p) return;
    setItems((prev) => [...prev, { productId, price: p.basePrice, stockLimit: 10 }]);
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }

  function updateItem(productId: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it)),
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one product to the round.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(items));
    const result = await action(fd);
    setSubmitting(false);
    if (result && !result.ok) toast.error(result.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={initial?.title}
            placeholder="Round #1 — Friday Snacks"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="opensAt">Opens at</Label>
          <Input
            id="opensAt"
            name="opensAt"
            type="datetime-local"
            required
            defaultValue={toLocalInput(initial?.opensAt)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closesAt">Closes at</Label>
          <Input
            id="closesAt"
            name="closesAt"
            type="datetime-local"
            required
            defaultValue={toLocalInput(initial?.closesAt)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryDate">Delivery date</Label>
          <Input
            id="deliveryDate"
            name="deliveryDate"
            type="date"
            required
            defaultValue={toDateInput(initial?.deliveryDate)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qris">
          QRIS image {initial?.qrisImageUrl ? "(leave empty to keep current)" : "(optional)"}
        </Label>
        <Input
          id="qris"
          name="qris"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setQrisPreview(URL.createObjectURL(f));
          }}
        />
        {qrisPreview && (
          <div className="relative mt-2 h-40 w-40 overflow-hidden rounded-md border border-zinc-200 bg-white">
            <Image src={qrisPreview} alt="QRIS preview" fill className="object-contain" sizes="160px" />
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-4">
        <Label className="text-sm font-medium">Bank Transfer details (optional)</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="bankName" className="text-xs text-zinc-500">
              Bank name
            </Label>
            <Input
              id="bankName"
              name="bankName"
              defaultValue={initial?.bankName ?? ""}
              placeholder="Bank Mandiri"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankAccountNumber" className="text-xs text-zinc-500">
              Account number
            </Label>
            <Input
              id="bankAccountNumber"
              name="bankAccountNumber"
              defaultValue={initial?.bankAccountNumber ?? ""}
              placeholder="1234567890"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankAccountHolder" className="text-xs text-zinc-500">
              Account holder
            </Label>
            <Input
              id="bankAccountHolder"
              name="bankAccountHolder"
              defaultValue={initial?.bankAccountHolder ?? ""}
              placeholder="Randa Lubis"
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Leave empty if you don&apos;t want to offer Bank Transfer for this round.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Products in this round</Label>
          {availableProducts.length > 0 && (
            <select
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm"
              value=""
              onChange={(e) => {
                if (e.target.value) addProduct(e.target.value);
              }}
            >
              <option value="">+ Add product…</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatIDR(p.basePrice)})
                </option>
              ))}
            </select>
          )}
        </div>

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No products added yet. Add one above.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const p = productMap.get(it.productId);
              if (!p) return null;
              const sold = it.stockSold ?? 0;
              return (
                <div
                  key={it.productId}
                  className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-3"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                    <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="48px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    {sold > 0 && (
                      <p className="text-xs text-zinc-500">{sold} already sold</p>
                    )}
                  </div>
                  <div className="w-32">
                    <Label className="text-xs text-zinc-500">Price</Label>
                    <Input
                      inputMode="numeric"
                      value={formatIDRInput(it.price)}
                      onChange={(e) =>
                        updateItem(it.productId, { price: parseIDR(e.target.value) })
                      }
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-zinc-500">Stock</Label>
                    <Input
                      type="number"
                      min={sold}
                      value={it.stockLimit}
                      onChange={(e) =>
                        updateItem(it.productId, { stockLimit: parseInt(e.target.value || "0", 10) })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(it.productId)}
                    disabled={sold > 0}
                    title={sold > 0 ? "Already has orders" : "Remove"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button type="submit" disabled={submitting}>
        <Plus className="h-4 w-4" />
        {submitting ? "Saving..." : "Save round"}
      </Button>
    </form>
  );
}
