"use client";

import { useEffect } from "react";
import { saveOrderToHistory, type SavedOrder } from "@/lib/cart";

export function OrderHistoryRecorder({ order }: { order: SavedOrder }) {
  useEffect(() => {
    saveOrderToHistory(order);
    // intentionally fire on mount only — order is stable for this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.shortCode]);
  return null;
}
