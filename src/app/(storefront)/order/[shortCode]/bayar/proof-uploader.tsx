"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProofUploader({ shortCode }: { shortCode: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Pilih file bukti transfer dulu.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append("proof", file);
    const res = await fetch(`/api/orders/${shortCode}/payment`, {
      method: "POST",
      body: fd,
    });
    const result = await res.json().catch(() => ({ ok: false, error: "Network error" }));
    if (!res.ok || !result.ok) {
      setSubmitting(false);
      toast.error(result.error ?? "Gagal upload bukti.");
      return;
    }
    toast.success("Bukti terkirim. Menunggu konfirmasi admin.");
    router.replace(`/order/${shortCode}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelect}
      />
      {preview && (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md bg-zinc-100">
          <Image src={preview} alt="Preview bukti" fill className="object-contain" sizes="320px" />
        </div>
      )}
      <Button onClick={handleSubmit} disabled={!file || submitting} className="w-full">
        {submitting ? "Mengirim..." : "Kirim bukti pembayaran"}
      </Button>
    </div>
  );
}
