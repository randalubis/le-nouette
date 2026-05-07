// Default Q&A copy used by the order-confirmation FAQ. The admin can
// override any answer via BusinessSettings.faqAnswers (JSONB) — see L-11.
// Falling back per-key keeps the FAQ visible even when only some answers
// are filled in.

type Faq = { question: string; answer: string };

const QRIS_DEFAULTS: Record<string, Faq> = {
  check: {
    question: "Berapa lama bukti dicek?",
    answer:
      "Biasanya dalam 1-2 jam saat jam kerja. Kamu akan dapat update otomatis di halaman ini saat sudah dicek admin.",
  },
  rejected: {
    question: "Bukti saya ditolak, harus apa?",
    answer:
      "Hubungi admin via WhatsApp dengan screenshot transaksi. Kami bantu cek dan koreksi.",
  },
  wrongAmount: {
    question: "Saya transfer salah jumlah, bisa diperbaiki?",
    answer:
      "Bisa. Hubungi admin via WhatsApp dan kirim bukti transfer yang baru. Kami akan adjust pesanan.",
  },
  online: {
    question: "Kapan biasanya admin online?",
    answer: "Senin-Sabtu, jam 8 pagi sampai 8 malam. Hari Minggu admin libur.",
  },
};

const COD_DEFAULTS: Record<string, Faq> = {
  method: {
    question: "Saya bisa bayar pakai apa?",
    answer: "Cash atau e-wallet (Gopay, OVO, Dana) — disesuaikan saat antar.",
  },
  fee: {
    question: "Apa pengantaran ada biaya?",
    answer:
      "Tidak. Antar dalam area kantor gratis. Untuk lokasi di luar, akan kami konfirmasi dulu via WhatsApp.",
  },
  absent: {
    question: "Saya tidak ada di tempat saat antar, bagaimana?",
    answer:
      "Hubungi admin via WhatsApp untuk reschedule. Pesanan tetap kami jaga sampai bisa diantar ulang.",
  },
};

type FaqOverrides = Partial<{
  qris: Partial<Record<keyof typeof QRIS_DEFAULTS, string>>;
  cod: Partial<Record<keyof typeof COD_DEFAULTS, string>>;
}>;

export function faqFor(
  paymentMethod: "QRIS" | "BANK_TRANSFER" | "COD",
  overrides: FaqOverrides | null | undefined,
): Faq[] {
  const defaults = paymentMethod === "COD" ? COD_DEFAULTS : QRIS_DEFAULTS;
  const overrideMap =
    paymentMethod === "COD" ? overrides?.cod : overrides?.qris;
  return Object.entries(defaults).map(([key, def]) => ({
    question: def.question,
    answer: overrideMap?.[key as keyof typeof defaults] ?? def.answer,
  }));
}
