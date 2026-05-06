"use client";

import { useState } from "react";
import { toast } from "sonner";

export function CopyButton({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Tersalin");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs hover:bg-[#f3ede1]"
    >
      {copied ? <span className="text-xs text-[var(--success)]">✓ Tersalin</span> : children}
    </button>
  );
}
