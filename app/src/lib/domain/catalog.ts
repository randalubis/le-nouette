// Products, recipe version 1, and tracked inventory items (spec §4, tech spec §6.3–6.5).
// Raw cheese quantities are integer centigrams (0.01 g) so fractional grams never drift.

export type ProductId = "milieu" | "grande";
export type ItemId = "raw_cheese" | "jar" | "pouch" | "sticker_square_milieu" | "sticker_square_grande" | "sticker_round" | "jar_seal";
export type Recipe = Partial<Record<ItemId, number>>;

export const products = [
  { id: "milieu", name: "Milieu", netGrams: 125, price: 50000, recipe: { raw_cheese: 12500, jar: 1, sticker_square_milieu: 1, sticker_round: 1, jar_seal: 1 } },
  { id: "grande", name: "Grande", netGrams: 225, price: 70000, recipe: { raw_cheese: 22500, pouch: 1, sticker_square_grande: 1 } },
] as const satisfies readonly { id: ProductId; name: string; netGrams: number; price: number; recipe: Recipe }[];

export const SUPPLIER_PACK = 22500; // one supplier pack = 225 g, in centigrams

export const inventoryItems = [
  { id: "raw_cheese", name: "Bahan baku cheese stick", threshold: 10 * SUPPLIER_PACK },
  { id: "jar", name: "Jar Milieu", threshold: 10 },
  { id: "pouch", name: "Pouch Grande", threshold: 10 },
  { id: "sticker_square_milieu", name: "Stiker kotak Milieu (125 g)", threshold: 10 },
  { id: "sticker_square_grande", name: "Stiker kotak Grande (225 g)", threshold: 10 },
  { id: "sticker_round", name: "Stiker bulat", threshold: 10 },
  { id: "jar_seal", name: "Seal jar", threshold: 10 },
] as const satisfies readonly { id: ItemId; name: string; threshold: number }[];

export const productById = (id: ProductId) => products.find((product) => product.id === id)!;

export const formatRupiah = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(value)}`;

export const formatQuantity = (item: ItemId, quantity: number) =>
  item === "raw_cheese"
    ? `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(quantity / SUPPLIER_PACK)} pak (${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(quantity / 100)} g)`
    : `${quantity} pcs`;
