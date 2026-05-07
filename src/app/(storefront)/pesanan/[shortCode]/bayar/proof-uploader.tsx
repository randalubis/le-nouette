"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readCustomer } from "@/lib/cart";
import { errorMessage } from "@/lib/errors";

export function ProofUploader({ shortCode }: { shortCode: string }) {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = readCustomer();
    if (saved?.whatsapp) setWhatsapp(saved.whatsapp);
  }, []);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit() {
    if (!whatsapp.trim()) {
      toast.error(errorMessage("WHATSAPP_REQUIRED"));
      return;
    }
    if (!file) {
      toast.error(errorMessage("PROOF_FILE_REQUIRED"));
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append("whatsapp", whatsapp.trim());
    fd.append("proof", file);
    const res = await fetch(`/api/orders/${shortCode}/payment`, {
      method: "POST",
      body: fd,
    });
    const result = await res.json().catch(() => ({ ok: false, error: errorMessage("NETWORK") }));
    if (!res.ok || !result.ok) {
      setSubmitting(false);
      toast.error(result.error ?? errorMessage("UPLOAD_FAILED", {}));
      return;
    }
    toast.success("Bukti terkirim. Menunggu konfirmasi admin.");
    router.replace(`/pesanan/${shortCode}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="proof-whatsapp">Konfirmasi nomor WhatsApp</Label>
        <Input
          id="proof-whatsapp"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+]/g, ""))}
          placeholder="+628123456789"
        />
        <p className="text-xs text-[var(--muted)]">
          Pakai nomor yang sama saat kamu checkout untuk verifikasi.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proof-file">Bukti transfer</Label>
        <Input
          id="proof-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleSelect}
        />
        {preview && (
          <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md bg-zinc-100">
            <Image src={preview} alt="Preview bukti" fill className="object-contain" sizes="320px" />
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!file || !whatsapp.trim() || submitting}
        className="w-full"
      >
        {submitting ? "Mengirim..." : "Kirim bukti pembayaran"}
      </Button>
    </div>
  );
}
