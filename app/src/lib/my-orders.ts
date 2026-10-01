"use client";

// Device-local list of this phone's orders (id + secret tracking token) so the customer can look up
// status later. The token is the only credential; nothing else about the order is stored here.

const KEY = "le-nouette:orders";
const CAP = 20;

export type MyOrder = { id: string; token: string };

export function readOrders(): MyOrder[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((o): o is MyOrder => o && typeof o.id === "string" && typeof o.token === "string").slice(0, CAP);
  } catch {
    return [];
  }
}

const write = (list: MyOrder[]) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP))); } catch {} };

// Newest first.
export function addOrder(order: MyOrder) {
  write([order, ...readOrders().filter((o) => o.id !== order.id)]);
}

export function removeOrder(id: string) {
  write(readOrders().filter((o) => o.id !== id));
}
