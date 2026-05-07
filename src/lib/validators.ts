import { z } from "zod";
import { normalizeWhatsApp } from "@/lib/utils";

export const productSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional().nullable(),
  basePrice: z.coerce.number().int().min(0).max(100_000_000),
  isActive: z.boolean().default(true),
});

export const roundItemSchema = z.object({
  productId: z.string().min(1),
  price: z.coerce.number().int().min(0).max(100_000_000),
  stockLimit: z.coerce.number().int().min(0).max(10_000),
});

export const roundSchema = z.object({
  title: z.string().min(1).max(100),
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date(),
  deliveryDate: z.coerce.date(),
  bankName: z.string().max(100).optional().nullable(),
  bankAccountNumber: z.string().max(50).optional().nullable(),
  bankAccountHolder: z.string().max(100).optional().nullable(),
  items: z.array(roundItemSchema).min(1),
});

export const checkoutSchema = z.object({
  roundId: z.string().min(1),
  customerName: z.string().min(1).max(100),
  customerWhatsApp: z
    .string()
    .min(8)
    .max(20)
    .regex(
      /^[\d+\s-]+$/,
      "Nomor WhatsApp hanya boleh angka (boleh diawali +, 0, atau 62)",
    )
    .transform((v) => normalizeWhatsApp(v))
    .refine((v) => v.length >= 10 && v.length <= 15, {
      message: "Nomor WhatsApp tidak valid",
    }),
  paymentMethod: z.enum(["QRIS", "BANK_TRANSFER", "COD"]),
  notes: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        roundProductId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(100),
      }),
    )
    .min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const notifySubscribeSchema = z.object({
  whatsapp: z
    .string()
    .min(8)
    .max(20)
    .regex(
      /^[\d+\s-]+$/,
      "Nomor WhatsApp hanya boleh angka (boleh diawali +, 0, atau 62)",
    )
    .transform((v) => normalizeWhatsApp(v))
    .refine((v) => v.length >= 10 && v.length <= 15, {
      message: "Nomor WhatsApp tidak valid",
    }),
});
