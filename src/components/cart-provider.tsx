"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  type Cart,
  type CartItem,
  emptyCart,
  readCart,
  writeCart,
  clearCart as clearCartStorage,
  cartItemCount,
  cartTotal,
  type SavedCustomer,
  readCustomer,
  type SavedOrder,
  readOrderHistory,
  ORDER_HISTORY_STORAGE_KEY,
} from "@/lib/cart";

// X-16: single hydration source for cart + customer + order history. Three
// separate localStorage reads on mount were each triggering their own
// re-render and showing a brief flash of empty state. The provider now
// loads all three slices in one effect and exposes them through one
// context, with a single `hydrated` flag.
type CartContextValue = {
  cart: Cart | null;
  customer: SavedCustomer | null;
  orderHistory: SavedOrder[];
  hydrated: boolean;
  totalItems: number;
  totalAmount: number;
  // DS v2 motion: increments on every add() call so listeners (like the
  // header cart icon) can pulse without subscribing to cart contents.
  addPulse: number;
  add: (roundId: string, item: Omit<CartItem, "quantity">, quantity: number) => void;
  setQuantity: (roundProductId: string, quantity: number) => void;
  remove: (roundProductId: string) => void;
  clear: () => void;
  resetForRound: (roundId: string) => void;
  refreshOrderHistory: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [customer, setCustomer] = useState<SavedCustomer | null>(null);
  const [orderHistory, setOrderHistory] = useState<SavedOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [addPulse, setAddPulse] = useState(0);

  useEffect(() => {
    setCart(readCart());
    setCustomer(readCustomer());
    setOrderHistory(readOrderHistory());
    setHydrated(true);
    // Cross-tab sync: when another tab writes to the order-history key
    // (e.g. customer places an order in tab A while tab B is open), the
    // header icon should appear in tab B too.
    function onStorage(e: StorageEvent) {
      if (e.key === ORDER_HISTORY_STORAGE_KEY) {
        setOrderHistory(readOrderHistory());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refreshOrderHistory = useCallback(() => {
    setOrderHistory(readOrderHistory());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (cart) writeCart(cart);
    else clearCartStorage();
  }, [cart, hydrated]);

  const add = useCallback<CartContextValue["add"]>((roundId, item, quantity) => {
    if (quantity <= 0) return;
    setCart((prev) => {
      const base = prev && prev.roundId === roundId ? prev : emptyCart(roundId);
      const existing = base.items.find((it) => it.roundProductId === item.roundProductId);
      if (existing) {
        return {
          ...base,
          items: base.items.map((it) =>
            it.roundProductId === item.roundProductId
              ? { ...it, quantity: it.quantity + quantity }
              : it,
          ),
        };
      }
      return { ...base, items: [...base.items, { ...item, quantity }] };
    });
    setAddPulse((n) => n + 1);
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>((roundProductId, quantity) => {
    setCart((prev) => {
      if (!prev) return prev;
      if (quantity <= 0) {
        const items = prev.items.filter((it) => it.roundProductId !== roundProductId);
        return items.length ? { ...prev, items } : null;
      }
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.roundProductId === roundProductId ? { ...it, quantity } : it,
        ),
      };
    });
  }, []);

  const remove = useCallback<CartContextValue["remove"]>((roundProductId) => {
    setQuantity(roundProductId, 0);
  }, [setQuantity]);

  const clear = useCallback(() => setCart(null), []);

  const resetForRound = useCallback((roundId: string) => {
    setCart((prev) => (prev && prev.roundId === roundId ? prev : null));
  }, []);

  const totalItems = useMemo(() => (cart ? cartItemCount(cart) : 0), [cart]);
  const totalAmount = useMemo(() => (cart ? cartTotal(cart) : 0), [cart]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      customer,
      orderHistory,
      hydrated,
      totalItems,
      totalAmount,
      addPulse,
      add,
      setQuantity,
      remove,
      clear,
      resetForRound,
      refreshOrderHistory,
    }),
    [
      cart,
      customer,
      orderHistory,
      hydrated,
      totalItems,
      totalAmount,
      addPulse,
      add,
      setQuantity,
      remove,
      clear,
      resetForRound,
      refreshOrderHistory,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
