// Customer-visible error strings, structured as what-why-action.
// See docs/CONTENT_GUIDE.md for the policy. (Plan ticket N-10.)
//
// Each error is a small enum entry with a function that produces the
// final Bahasa string. Callers should never inline the message — instead
// import errorMessage and pass the type so future copy edits land in one
// place. The fallback "UNKNOWN" string is the only string customers
// should see when the cause is genuinely unknowable.

type ErrorMap = {
  STOCK_INSUFFICIENT: { productName: string; left: number };
  ROUND_CLOSED: object;
  ROUND_NOT_FOUND: object;
  PRODUCT_UNAVAILABLE: object;
  ORDER_NOT_FOUND: object;
  ORDER_NOT_CANCELLABLE: object;
  ORDER_PROOF_ALREADY_UPLOADED: object;
  CANCEL_WINDOW_EXPIRED: object;
  ORDER_ALREADY_CONFIRMED: object;
  PAYMENT_NOT_REQUIRED: object;
  WHATSAPP_REQUIRED: object;
  WHATSAPP_MISMATCH: object;
  PROOF_FILE_REQUIRED: object;
  UPLOAD_FAILED: { reason?: string };
  NETWORK: object;
  UNKNOWN: object;
};

export type ErrorType = keyof ErrorMap;

const RENDER: { [K in ErrorType]: (args: ErrorMap[K]) => string } = {
  STOCK_INSUFFICIENT: ({ productName, left }) =>
    left > 0
      ? `${productName} tinggal ${left}. Kurangi jumlah di keranjang untuk lanjut.`
      : `${productName} sudah habis. Hapus dari keranjang untuk lanjut.`,
  ROUND_CLOSED: () =>
    "Ronde ini sudah ditutup. Tunggu ronde berikutnya — kami akan kabari di WhatsApp.",
  ROUND_NOT_FOUND: () =>
    "Ronde tidak ditemukan. Coba refresh halaman, atau buka menu lagi.",
  PRODUCT_UNAVAILABLE: () =>
    "Beberapa produk tidak tersedia di ronde ini. Refresh halaman dan pilih dari menu terbaru.",
  ORDER_NOT_FOUND: () =>
    "Pesanan tidak ditemukan. Cek lagi link-nya, atau hubungi admin via WhatsApp.",
  ORDER_NOT_CANCELLABLE: () =>
    "Pesanan ini tidak bisa dibatalkan lagi. Hubungi admin via WhatsApp untuk bantuan.",
  ORDER_PROOF_ALREADY_UPLOADED: () =>
    "Bukti pembayaran sudah diupload. Hubungi admin via WhatsApp untuk membatalkan.",
  CANCEL_WINDOW_EXPIRED: () =>
    "Sudah lewat 15 menit. Hubungi admin via WhatsApp untuk membatalkan.",
  ORDER_ALREADY_CONFIRMED: () =>
    "Pesanan sudah dikonfirmasi. Tidak perlu upload bukti lagi.",
  PAYMENT_NOT_REQUIRED: () =>
    "Pesanan COD tidak butuh upload bukti pembayaran.",
  WHATSAPP_REQUIRED: () =>
    "Nomor WhatsApp diperlukan untuk verifikasi. Pakai nomor yang sama saat checkout.",
  WHATSAPP_MISMATCH: () =>
    "Nomor WhatsApp tidak cocok dengan pesanan ini. Pakai nomor yang sama saat checkout.",
  PROOF_FILE_REQUIRED: () =>
    "File bukti pembayaran wajib diupload. Pilih foto bukti transfer lalu kirim.",
  UPLOAD_FAILED: ({ reason }) =>
    reason
      ? `Upload bukti gagal: ${reason}. Coba lagi atau hubungi admin via WhatsApp.`
      : "Upload bukti gagal. Coba lagi atau hubungi admin via WhatsApp.",
  NETWORK: () =>
    "Koneksi internet kamu putus. Cek sinyal lalu coba lagi.",
  UNKNOWN: () =>
    "Maaf, ada error saat memproses pesanan. Coba lagi sebentar atau hubungi admin via WhatsApp.",
};

export function errorMessage<K extends ErrorType>(
  type: K,
  args?: ErrorMap[K],
): string {
  const fn = RENDER[type] as (a: ErrorMap[K]) => string;
  return fn((args ?? {}) as ErrorMap[K]);
}
