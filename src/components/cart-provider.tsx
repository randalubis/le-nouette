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
} from "@/lib/cart";

type CartContextValue = {
  cart: Cart | null;
  hydrated: boolean;
  totalItems: number;
  totalAmount: number;
  add: (roundId: string, item: Omit<CartItem, "quantity">, quantity: number) => void;
  setQuantity: (roundProductId: string, quantity: number) => void;
  remove: (roundProductId: string) => void;
  clear: () => void;
  resetForRound: (roundId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(readCart());
    setHydrated(true);
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
    () => ({ cart, hydrated, totalItems, totalAmount, add, setQuantity, remove, clear, resetForRound }),
    [cart, hydrated, totalItems, totalAmount, add, setQuantity, remove, clear, resetForRound],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
