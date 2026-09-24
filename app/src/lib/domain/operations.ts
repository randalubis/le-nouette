// Pure domain commands: (state, input, now) => new state. Each command is all-or-nothing:
// it either returns a complete new state or throws DomainError and leaves the old state untouched.
// The same functions move behind server actions + Postgres transactions when Supabase lands.

import { inventoryItems, productById, products, type ItemId, type ProductId, type Recipe } from "./catalog.ts";
import { addMonth, formatDate, isOperational, jakartaNow, promisedReadyDate, type Calendar, type DateStatus } from "./schedule.ts";

export type Fulfillment = "PICKUP_MANDIRI" | "PICKUP_BI" | "DELIVERY";
export type OrderStatus = "NEEDS_PREPARATION" | "READY_FOR_HANDOVER" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "TRANSFER" | "QRIS" | "CASH";

export type OrderItem = { productId: ProductId; name: string; unitPrice: number; quantity: number; recipe: Recipe; readyQuantity?: number };
export type Payment = { id: string; amount: number; method: PaymentMethod; at: string; reversedAt?: string };
export type Order = {
  id: string; idempotencyKey: string; createdAt: string;
  customer: { name: string; whatsapp: string }; fulfillment: Fulfillment; address?: string; note?: string;
  items: OrderItem[]; total: number;
  promisedReadyDate: string; currentReadyDate: string; status: OrderStatus;
  readyAt?: string; dispatchedAt?: string; completedAt?: string; cancelledAt?: string;
  payments: Payment[];
};
export type Movement = { id: string; itemId: ItemId; delta: number; reason: "RECEIPT" | "STOCK_OPNAME" | "PACKING_CONSUMPTION"; at: string; ref?: string };
export type ReadyMovement = {
  id: string; productId: ProductId; delta: number; type: "EXTRA_PACKED" | "ALLOCATED_TO_ORDER" | "ADJUSTMENT" | "REVERSAL";
  at: string; packedAt?: string; expiresOn?: string; orderId?: string; sourceId?: string; note?: string;
};
export type Reservation = { orderId: string; itemId: ItemId; quantity: number; state: "ACTIVE" | "CONSUMED" | "RELEASED" };
export type AuditEvent = { at: string; action: string; ref?: string };

export type State = {
  version: 1; seq: number;
  orders: Order[]; movements: Movement[]; reservations: Reservation[]; readyMovements: ReadyMovement[];
  calendar: Calendar; storeStatus: "OPEN" | "PAUSED"; audit: AuditEvent[];
};

export class DomainError extends Error {}
const fail = (message: string): never => { throw new DomainError(message); };

export const emptyState = (): State => ({ version: 1, seq: 0, orders: [], movements: [], reservations: [], readyMovements: [], calendar: {}, storeStatus: "OPEN", audit: [] });

// ---------- derived values (tech spec §7) ----------

export const amountPaid = (order: Order) => order.payments.filter((payment) => !payment.reversedAt).reduce((sum, payment) => sum + payment.amount, 0);
export const receivable = (order: Order) => Math.max(order.total - amountPaid(order), 0);
export const isPaid = (order: Order) => receivable(order) === 0;

export function balances(state: State) {
  return inventoryItems.map((item) => {
    const onHand = state.movements.filter((movement) => movement.itemId === item.id).reduce((sum, movement) => sum + movement.delta, 0);
    const reserved = state.reservations.filter((reservation) => reservation.itemId === item.id && reservation.state === "ACTIVE").reduce((sum, reservation) => sum + reservation.quantity, 0);
    return { ...item, onHand, reserved, available: onHand - reserved };
  });
}

// Product Ready to Sell (§10.2, data model §6.14). Remaining units per source = sum of deltas sharing its sourceId.
export function readySources(state: State, productId: ProductId, now: Date) {
  const today = jakartaNow(now).date;
  return state.readyMovements
    .filter((m) => m.type === "EXTRA_PACKED" && m.productId === productId)
    .map((m) => ({
      sourceId: m.id, packedAt: m.packedAt!, expiresOn: m.expiresOn!,
      remaining: state.readyMovements.filter((r) => r.sourceId === m.id).reduce((sum, r) => sum + r.delta, 0),
      expired: m.expiresOn! < today,
    }))
    .sort((a, b) => Date.parse(a.packedAt) - Date.parse(b.packedAt) || a.sourceId.localeCompare(b.sourceId, undefined, { numeric: true }));
}

export function readyBalances(state: State, now: Date) {
  return products.map((product) => {
    const sources = readySources(state, product.id, now).filter((s) => s.remaining > 0);
    const sum = (expired: boolean) => sources.filter((s) => s.expired === expired).reduce((total, s) => total + s.remaining, 0);
    return { productId: product.id, name: product.name, available: sum(false), expired: sum(true), sources };
  });
}

export const findOrder = (state: State, id: string) => state.orders.find((order) => order.id === id) ?? fail(`Pesanan ${id} tidak ditemukan.`);

// ---------- helpers ----------

const withOrder = (state: State, id: string, patch: (order: Order) => Partial<Order>, action: string, now: Date): State => ({
  ...state,
  orders: state.orders.map((order) => (order.id === id ? { ...order, ...patch(order) } : order)),
  audit: [...state.audit, { at: now.toISOString(), action, ref: id }],
});

// ---------- ordering ----------

export type CreateOrderInput = {
  idempotencyKey: string; name: string; whatsapp: string; fulfillment: Fulfillment;
  address?: string; note?: string; quantities: Partial<Record<ProductId, number>>;
};

export function createOrder(state: State, input: CreateOrderInput, now: Date): State {
  if (state.orders.some((order) => order.idempotencyKey === input.idempotencyKey)) return state; // §18.2 duplicate submit
  if (state.storeStatus === "PAUSED") fail("Pemesanan sedang ditutup sementara.");

  const name = input.name.trim();
  const whatsapp = input.whatsapp.replace(/[\s-]/g, "");
  const address = input.address?.trim();
  const note = input.note?.trim();
  if (!name) fail("Nama wajib diisi.");
  if (!/^(\+62|62|0)8\d{7,13}$/.test(whatsapp)) fail("Nomor WhatsApp tidak valid.");
  if (input.fulfillment === "DELIVERY" && !address) fail("Alamat pengiriman wajib diisi.");
  if (note && [...note].length > 180) fail("Catatan maksimal 180 karakter.");

  const items: OrderItem[] = Object.entries(input.quantities)
    .filter(([, quantity]) => quantity)
    .map(([id, quantity]) => {
      if (!Number.isInteger(quantity) || quantity! < 1) fail("Jumlah produk harus bilangan bulat positif.");
      const product = productById(id as ProductId);
      return { productId: product.id, name: product.name, unitPrice: product.price, quantity: quantity!, recipe: product.recipe };
    });
  if (items.length === 0) fail("Pilih minimal satu produk.");

  // §9.1 step 8: allocate oldest unexpired ready units first; only the remainder is reserved from raw materials.
  const seq = state.seq + 1;
  const id = `LN-${String(seq).padStart(4, "0")}`;
  
  let readyMovements = state.readyMovements;
  const covered = items.map((item) => {
    let need = item.quantity;
    for (const source of readySources({ ...state, readyMovements }, item.productId, now)) {
      if (need === 0) break;
      const take = source.expired ? 0 : Math.min(source.remaining, need);
      if (take === 0) continue;
      readyMovements = [...readyMovements, { id: `RM-${readyMovements.length + 1}`, productId: item.productId, delta: -take, type: "ALLOCATED_TO_ORDER", at: now.toISOString(), orderId: id, sourceId: source.sourceId }];
      need -= take;
    }
    return { ...item, readyQuantity: item.quantity - need };
  });
  const fullyCovered = covered.every((item) => item.readyQuantity === item.quantity);
  // Fully covered from ready stock: ready today, so the buyer sees it and dispatch's date guard doesn't block.
  const readyDate = fullyCovered ? jakartaNow(now).date : promisedReadyDate(now, state.calendar);
  const order: Order = {
    id, idempotencyKey: input.idempotencyKey, createdAt: now.toISOString(),
    customer: { name, whatsapp }, fulfillment: input.fulfillment,
    address: input.fulfillment === "DELIVERY" ? address : undefined, note: note || undefined,
    items: covered, total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    promisedReadyDate: readyDate, currentReadyDate: readyDate, status: fullyCovered ? "READY_FOR_HANDOVER" : "NEEDS_PREPARATION", payments: [],
    ...(fullyCovered ? { readyAt: now.toISOString() } : {}),
  };
  const reservations = covered.filter((item) => item.readyQuantity < item.quantity).flatMap((item) =>
    Object.entries(item.recipe).map(([itemId, perUnit]) => ({ orderId: id, itemId: itemId as ItemId, quantity: perUnit! * (item.quantity - item.readyQuantity), state: "ACTIVE" as const })),
  );

  return { ...state, seq, orders: [...state.orders, order], reservations: [...state.reservations, ...reservations], readyMovements, audit: [...state.audit, { at: now.toISOString(), action: "ORDER_CREATED", ref: id }] };
}

export function cancelOrder(state: State, id: string, now: Date): State {
  const order = findOrder(state, id);
  if (order.status === "COMPLETED" || order.status === "CANCELLED") fail("Pesanan ini tidak bisa dibatalkan.");
  const next = withOrder(state, id, () => ({ status: "CANCELLED", cancelledAt: now.toISOString() }), "ORDER_CANCELLED", now);
  // Append-only reversal per allocation; a source that has since expired stays unavailable via readySources.
  const reversals: ReadyMovement[] = state.readyMovements
    .filter((m) => m.type === "ALLOCATED_TO_ORDER" && m.orderId === id)
    .map((m, index) => ({ id: `RM-${state.readyMovements.length + index + 1}`, productId: m.productId, delta: -m.delta, type: "REVERSAL", at: now.toISOString(), orderId: id, sourceId: m.sourceId }));
  return { ...next, readyMovements: [...state.readyMovements, ...reversals], reservations: state.reservations.map((r) => (r.orderId === id && r.state === "ACTIVE" ? { ...r, state: "RELEASED" } : r)) };
}

export function rescheduleOrder(state: State, id: string, date: string, now: Date): State {
  const order = findOrder(state, id);
  if (order.status !== "NEEDS_PREPARATION" && order.status !== "READY_FOR_HANDOVER") fail("Hanya pesanan aktif yang bisa dijadwalkan ulang.");
  if (!isOperational(date, state.calendar)) fail(`${formatDate(date)} bukan hari operasional.`);
  return withOrder(state, id, () => ({ currentReadyDate: date }), `ORDER_RESCHEDULED:${order.currentReadyDate}->${date}`, now);
}

// ---------- packing & handover ----------

export const pendingBatchDates = (state: State) =>
  [...new Set(state.orders.filter((order) => order.status === "NEEDS_PREPARATION").map((order) => order.currentReadyDate))].sort();

export function completeBatch(state: State, readyDate: string, now: Date): State {
  const orderIds = new Set(state.orders.filter((order) => order.status === "NEEDS_PREPARATION" && order.currentReadyDate === readyDate).map((order) => order.id));
  if (orderIds.size === 0) fail("Batch ini sudah selesai atau tidak memiliki pesanan.");
  const at = now.toISOString();
  const consumed = state.reservations.filter((r) => orderIds.has(r.orderId) && r.state === "ACTIVE");
  const totals = new Map<ItemId, number>();
  for (const r of consumed) totals.set(r.itemId, (totals.get(r.itemId) ?? 0) + r.quantity);
  const movements: Movement[] = [...totals].map(([itemId, quantity], index) => ({ id: `M-${state.movements.length + index + 1}`, itemId, delta: -quantity, reason: "PACKING_CONSUMPTION", at, ref: readyDate }));

  return {
    ...state,
    orders: state.orders.map((order) => (orderIds.has(order.id) ? { ...order, status: "READY_FOR_HANDOVER", readyAt: at } : order)),
    reservations: state.reservations.map((r) => (orderIds.has(r.orderId) && r.state === "ACTIVE" ? { ...r, state: "CONSUMED" } : r)),
    movements: [...state.movements, ...movements],
    audit: [...state.audit, { at, action: "BATCH_COMPLETED", ref: readyDate }],
  };
}

export function dispatchOrder(state: State, id: string, now: Date): State {
  const order = findOrder(state, id);
  if (order.fulfillment !== "DELIVERY") fail("Hanya pesanan kirim yang perlu ditandai dikirim.");
  if (order.status !== "READY_FOR_HANDOVER") fail("Pesanan belum selesai dipacking.");
  if (order.dispatchedAt) fail("Pesanan sudah dikirim.");
  if (!isPaid(order)) fail("Pengiriman perlu lunas terlebih dahulu.");
  if (jakartaNow(now).date < order.currentReadyDate) fail(`Pengiriman dijadwalkan ${formatDate(order.currentReadyDate)}.`);
  return withOrder(state, id, () => ({ dispatchedAt: now.toISOString() }), "ORDER_DISPATCHED", now);
}

export function dispatchOrders(state: State, ids: Set<string>, now: Date): State {
  const orders = state.orders.filter((order) => ids.has(order.id));
  if (orders.length === 0) fail("Tidak ada pesanan dipilih.");
  for (const order of orders) {
    if (order.fulfillment !== "DELIVERY") fail(`${order.id}: hanya pesanan kirim yang perlu ditandai dikirim.`);
    if (order.status !== "READY_FOR_HANDOVER") fail(`${order.id}: belum selesai dipacking.`);
    if (order.dispatchedAt) fail(`${order.id}: sudah dikirim.`);
    if (!isPaid(order)) fail(`${order.id}: pengiriman perlu lunas terlebih dahulu.`);
    if (jakartaNow(now).date < order.currentReadyDate) fail(`${order.id}: pengiriman dijadwalkan ${formatDate(order.currentReadyDate)}.`);
  }
  const at = now.toISOString();
  return {
    ...state,
    orders: state.orders.map((order) => (ids.has(order.id) ? { ...order, dispatchedAt: at } : order)),
    audit: [...state.audit, { at, action: "ORDERS_DISPATCHED", ref: [...ids].join(",") }],
  };
}

export function completeOrder(state: State, id: string, now: Date): State {
  const order = findOrder(state, id);
  if (order.status !== "READY_FOR_HANDOVER") fail("Pesanan belum siap diserahkan.");
  if (order.fulfillment === "DELIVERY" && !order.dispatchedAt) fail("Tandai pesanan dikirim terlebih dahulu.");
  return withOrder(state, id, () => ({ status: "COMPLETED", completedAt: now.toISOString() }), "ORDER_COMPLETED", now);
}

// ---------- payments ----------

export function recordPayment(state: State, id: string, method: PaymentMethod, now: Date): State {
  const order = findOrder(state, id);
  const amount = receivable(order);
  if (order.status === "CANCELLED") fail("Pesanan dibatalkan.");
  if (amount === 0) fail("Pesanan sudah lunas.");
  const payment: Payment = { id: `${id}-P${order.payments.length + 1}`, amount, method, at: now.toISOString() };
  return withOrder(state, id, (o) => ({ payments: [...o.payments, payment] }), `PAYMENT_RECORDED:${method}`, now);
}

export function reversePayment(state: State, id: string, paymentId: string, now: Date): State {
  const order = findOrder(state, id);
  if (!order.payments.some((p) => p.id === paymentId && !p.reversedAt)) fail("Pembayaran tidak ditemukan.");
  if (order.dispatchedAt) fail("Pesanan sudah dikirim; koreksi pembayaran perlu dicatat manual.");
  return withOrder(state, id, (o) => ({ payments: o.payments.map((p) => (p.id === paymentId ? { ...p, reversedAt: now.toISOString() } : p)) }), "PAYMENT_REVERSED", now);
}

// ---------- inventory ----------

const addMovement = (state: State, itemId: ItemId, delta: number, reason: Movement["reason"], now: Date): State => ({
  ...state,
  movements: [...state.movements, { id: `M-${state.movements.length + 1}`, itemId, delta, reason, at: now.toISOString() }],
  audit: [...state.audit, { at: now.toISOString(), action: reason, ref: itemId }],
});

export function receiveStock(state: State, itemId: ItemId, quantity: number, now: Date): State {
  if (!Number.isInteger(quantity) || quantity <= 0) fail("Jumlah penerimaan harus lebih dari 0.");
  return addMovement(state, itemId, quantity, "RECEIPT", now);
}

// §10.6: record the physical count as an adjustment; never overwrite the balance.
export function stockOpname(state: State, itemId: ItemId, counted: number, now: Date): State {
  if (!Number.isInteger(counted) || counted < 0) fail("Hasil hitung tidak valid.");
  const onHand = balances(state).find((item) => item.id === itemId)!.onHand;
  if (counted === onHand) return state;
  return addMovement(state, itemId, counted - onHand, "STOCK_OPNAME", now);
}

// §6.14: an accidental extra consumes its recipe components and adds one finished unit, atomically.
export function recordExtraPacked(state: State, productId: ProductId, quantity: number, now: Date, note?: string): State {
  if (!Number.isInteger(quantity) || quantity < 1) fail("Jumlah produk ekstra harus bilangan bulat positif.");
  const product = productById(productId);
  const have = new Map(balances(state).map((b) => [b.id, b.onHand]));
  for (const [itemId, perUnit] of Object.entries(product.recipe as Recipe)) {
    if ((have.get(itemId as ItemId) ?? 0) < perUnit! * quantity) fail(`Stok ${inventoryItems.find((i) => i.id === itemId)!.name} tidak cukup. Lakukan penerimaan atau stok opname dulu.`);
  }
  const at = now.toISOString();
  const readyId = `RM-${state.readyMovements.length + 1}`;
  const consumption: Movement[] = Object.entries(product.recipe as Recipe).map(([itemId, perUnit], index) => ({ id: `M-${state.movements.length + index + 1}`, itemId: itemId as ItemId, delta: -perUnit! * quantity, reason: "PACKING_CONSUMPTION", at, ref: readyId }));
  const ready: ReadyMovement = { id: readyId, productId, delta: quantity, type: "EXTRA_PACKED", at, packedAt: at, expiresOn: addMonth(jakartaNow(now).date), sourceId: readyId, note: note?.trim() || undefined };
  return { ...state, movements: [...state.movements, ...consumption], readyMovements: [...state.readyMovements, ready], audit: [...state.audit, { at, action: "EXTRA_PACKED", ref: readyId }] };
}

// Write off units of one source (expired or consumed); never more than it still holds.
export function adjustReady(state: State, sourceId: string, quantity: number, note: string | undefined, now: Date): State {
  const source = state.readyMovements.find((m) => m.id === sourceId && m.type === "EXTRA_PACKED") ?? fail("Sumber produk siap jual tidak ditemukan.");
  const remaining = readySources(state, source.productId, now).find((s) => s.sourceId === sourceId)!.remaining;
  if (!Number.isInteger(quantity) || quantity < 1) fail("Jumlah penyesuaian harus bilangan bulat positif.");
  if (quantity > remaining) fail(`Sisa unit hanya ${remaining}.`);
  const at = now.toISOString();
  const row: ReadyMovement = { id: `RM-${state.readyMovements.length + 1}`, productId: source.productId, delta: -quantity, type: "ADJUSTMENT", at, sourceId, note: note?.trim() || undefined };
  return { ...state, readyMovements: [...state.readyMovements, row], audit: [...state.audit, { at, action: "READY_ADJUSTED", ref: sourceId }] };
}

// ---------- availability & store status ----------

export const ordersOnDate = (state: State, date: string) =>
  state.orders.filter((order) => (order.status === "NEEDS_PREPARATION" || order.status === "READY_FOR_HANDOVER") && order.currentReadyDate === date);

export function setDateStatus(state: State, date: string, status: DateStatus | null, now: Date): State {
  if (status && ordersOnDate(state, date).length > 0) fail(`Masih ada ${ordersOnDate(state, date).length} pesanan pada ${formatDate(date)}. Pindahkan dulu sebelum menutup tanggal.`);
  const calendar = { ...state.calendar };
  if (status) calendar[date] = status; else delete calendar[date];
  return { ...state, calendar, audit: [...state.audit, { at: now.toISOString(), action: `DATE_${status ?? "AVAILABLE"}`, ref: date }] };
}

export function setStoreStatus(state: State, status: State["storeStatus"], now: Date): State {
  return { ...state, storeStatus: status, audit: [...state.audit, { at: now.toISOString(), action: `STORE_${status}` }] };
}
