# Le Nouette · Voice Guide

How the storefront talks to customers in Bahasa Indonesia. The hard rules (URL slugs, error format, contrast) live in [CONTENT_GUIDE.md](CONTENT_GUIDE.md). This doc is about **voice** — sentence shape, pronouns, warmth.

---

## Five rules

1. **Informal but not sloppy.** We're warm and human, not unprofessional. "Yuk pilih cemilan dulu" yes; "Wkwk belum ada apa2 nih" no.
2. **Second-person `kamu`, never `Anda`.** `Anda` reads like a bank or a government form. `kamu` reads like the colleague who runs the kitchen down the hall.
3. **Sentences short. Aim for under 12 words.** If a sentence runs longer, split it. Long sentences read as defensive — short ones read as confident.
4. **No exclamation marks** except in the post-checkout success block (`"Terima kasih!"` is the one allowed). Excitement everywhere reads as desperation.
5. **Describe food physically, not emotionally.** "Cookie cokelat dengan garam laut" beats "Cookie favorit semua orang". Show, don't claim.

---

## Translation table for common UI strings

The hard mappings (slugs, payment-method labels, order statuses) live in [CONTENT_GUIDE.md](CONTENT_GUIDE.md). The strings below are voice-flavored — copy from here when adding new ones rather than improvising.

| Situation | Phrase |
|---|---|
| Empty cart | Keranjang masih kosong. |
| Empty cart action | Yuk pilih cemilan dulu. |
| Loading | Memuat… |
| Closed round | Lagi tutup dulu, preorder belum dibuka. |
| Order created (pay-later) | Pesanan dibuat. Lanjut ke pembayaran. |
| Order created (COD) | Pesanan berhasil dibuat. |
| Cancel confirm | Pesanan akan dibatalkan dan stok dikembalikan. Yakin? |
| Cancel success | Pesanan dibatalkan. Sampai ronde berikutnya. |
| Proof submitted | Bukti terkirim. Menunggu konfirmasi admin. |
| Field required (WhatsApp) | Nomor WhatsApp diperlukan untuk verifikasi. |
| WhatsApp suffix on confirmation | Hubungi admin via WhatsApp kalau ada pertanyaan. |
| Generic fallback (system error) | Maaf, ada error saat memproses pesanan. Coba lagi sebentar atau hubungi admin via WhatsApp. |
| Soft CTA on closed-round teaser | Beritahu saya kalau ronde berikutnya buka. *(N-01)* |

---

## Style decisions worth knowing

- **Use day-month dates, not month-day.** `Jumat 14 November` not `November 14, Friday`. Already enforced in `Intl.DateTimeFormat("id-ID")` calls.
- **Currency: rupiah without decimals, with thin separators.** `Rp 25.000` not `25,000.00`. Centralized in `formatIDR`.
- **Phone numbers: E.164 without the plus.** `628123456789`. Customer-facing display is identical; we don't pretty-print.
- **Microcopy under inputs is not capitalized like a sentence.** "min. 1 karakter" not "Min. 1 karakter".

---

## When this guide changes

If you add a new customer-visible string, add a row to the table above in the same PR. If a string in the table needs to change, change it everywhere it appears in code — not just here.
