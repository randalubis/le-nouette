"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatIDRInput, parseIDR } from "@/lib/utils";

type Initial = {
  id?: string;
  name?: string;
  description?: string | null;
  basePrice?: number;
  isActive?: boolean;
  imageUrl?: string;
  aspectRatio?: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

export function ProductForm({
  initial,
  action,
}: {
  initial?: Initial;
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const [price, setPrice] = useState<string>(
    initial?.basePrice ? formatIDRInput(initial.basePrice) : "",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("basePrice", String(parseIDR(price)));
    const result = await action(fd);
    setSubmitting(false);
    if (result && !result.ok) {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={initial?.name} maxLength={100} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
          maxLength={1000}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="basePrice">Base price (IDR)</Label>
        <Input
          id="basePrice"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(formatIDRInput(e.target.value))}
          placeholder="15.000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Product image {initial ? "(leave empty to keep current)" : "*"}</Label>
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={!initial}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPreviewUrl(URL.createObjectURL(f));
          }}
        />
        {previewUrl && (
          <div className="relative mt-2 h-40 w-40 overflow-hidden rounded-md bg-[var(--surface-warm-1)]">
            <Image src={previewUrl} alt="Preview" fill className="object-cover" sizes="160px" />
          </div>
        )}
      </div>

      <fieldset className="space-y-2">
        <Label>Card aspect ratio</Label>
        <div className="flex gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-[0.5px] border-[var(--border)] p-3 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--surface-warm-1)]/40">
            <input
              type="radio"
              name="aspectRatio"
              value="square"
              defaultChecked={(initial?.aspectRatio ?? "square") === "square"}
              className="peer sr-only"
            />
            <span aria-hidden="true" className="block h-10 w-10 shrink-0 rounded-md border-[0.5px] border-[var(--border)] bg-[var(--surface-warm-2)]" />
            <div>
              <p className="text-sm font-medium">Square (1:1)</p>
              <p className="text-xs text-[var(--muted)]">Round dishes, top-down shots.</p>
            </div>
          </label>
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-[0.5px] border-[var(--border)] p-3 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--surface-warm-1)]/40">
            <input
              type="radio"
              name="aspectRatio"
              value="portrait"
              defaultChecked={initial?.aspectRatio === "portrait"}
              className="peer sr-only"
            />
            <span aria-hidden="true" className="block h-10 w-8 shrink-0 rounded-md border-[0.5px] border-[var(--border)] bg-[var(--surface-warm-2)]" />
            <div>
              <p className="text-sm font-medium">Portrait (4:5)</p>
              <p className="text-xs text-[var(--muted)]">Tall layered items, cakes.</p>
            </div>
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
        <Label htmlFor="isActive">Active (available to add to rounds)</Label>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
