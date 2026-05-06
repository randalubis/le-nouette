export type CartItem = {
  roundProductId: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
};

export type Cart = {
  roundId: string;
  items: CartItem[];
};

export const CART_STORAGE_KEY = "le-nouette-cart-v1";

export function emptyCart(roundId: string): Cart {
  return { roundId, items: [] };
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

export function cartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, it) => sum + it.quantity, 0);
}

export function readCart(): Cart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.roundId || !Array.isArray(parsed.items)) return null;
    return parsed as Cart;
  } catch {
    return null;
  }
}

export function writeCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function clearCart(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_STORAGE_KEY);
}

export const CUSTOMER_STORAGE_KEY = "le-nouette-customer-v1";

export type SavedCustomer = {
  name: string;
  whatsapp: string;
};

export function readCustomer(): SavedCustomer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedCustomer;
  } catch {
    return null;
  }
}

export function writeCustomer(c: SavedCustomer): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(c));
}

export const ORDER_HISTORY_STORAGE_KEY = "le-nouette-orders-v1";

export type SavedOrder = {
  shortCode: string;
  totalAmount: number;
  paymentMethod: "QRIS" | "BANK_TRANSFER" | "COD";
  itemCount: number;
  roundTitle: string;
  createdAt: string; // ISO timestamp
};

export function readOrderHistory(): SavedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedOrder[];
  } catch {
    return [];
  }
}

export function saveOrderToHistory(order: SavedOrder): void {
  if (typeof window === "undefined") return;
  const existing = readOrderHistory();
  // Dedupe by shortCode (in case the same order is saved twice)
  const filtered = existing.filter((o) => o.shortCode !== order.shortCode);
  // Newest first; cap at 50 to avoid unbounded growth
  const next = [order, ...filtered].slice(0, 50);
  window.localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(next));
}

export function removeOrderFromHistory(shortCode: string): void {
  if (typeof window === "undefined") return;
  const existing = readOrderHistory();
  const next = existing.filter((o) => o.shortCode !== shortCode);
  window.localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(next));
}
