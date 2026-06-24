import type { OrderStatus } from "@prisma/client";

// Single source of truth for order-status presentation (M1). Previously the
// badge-variant map was hand-copied into 6 files, and several copies omitted
// PENDING_CONFIRMATION / HOLD_EXPIRED — those orders then rendered with an
// undefined (default) badge variant. Typing the maps as Record<OrderStatus, …>
// makes a missing status a compile error; the helpers take a string so callers
// need no casts, with a safe fallback.
//
// Admin and storefront diverge intentionally on DELIVERED: muted "outline" in
// the operator's dense tables, celebratory "success" green for the customer.

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "destructive"
  | "outline";

const ADMIN_BADGE: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: "warning",
  PENDING_CONFIRMATION: "warning",
  PAID: "success",
  CONFIRMED: "info",
  DELIVERED: "outline",
  CANCELLED: "destructive",
  HOLD_EXPIRED: "destructive",
};

const STORE_BADGE: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: "warning",
  PENDING_CONFIRMATION: "warning",
  PAID: "success",
  CONFIRMED: "info",
  DELIVERED: "success",
  CANCELLED: "destructive",
  HOLD_EXPIRED: "destructive",
};

// Bahasa labels shown to customers on the order-confirmation page.
const STORE_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu pembayaran",
  PENDING_CONFIRMATION: "Menunggu konfirmasi admin",
  PAID: "Pembayaran diterima",
  CONFIRMED: "Pesanan dikonfirmasi",
  DELIVERED: "Sudah diantar",
  CANCELLED: "Dibatalkan",
  HOLD_EXPIRED: "Otomatis dibatalkan",
};

export function adminStatusBadge(status: string): BadgeVariant {
  return ADMIN_BADGE[status as OrderStatus] ?? "secondary";
}

export function storeStatusBadge(status: string): BadgeVariant {
  return STORE_BADGE[status as OrderStatus] ?? "secondary";
}

export function storeStatusLabel(status: string): string {
  return STORE_LABEL[status as OrderStatus] ?? status;
}
