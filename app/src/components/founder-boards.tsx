"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState, useTransition } from "react";
import { formatQuantity, formatRupiah, products, SUPPLIER_PACK, type ItemId, type ProductId } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate, jakartaNow, recommendReschedule, type DateStatus } from "@/lib/domain/schedule";
import { itemsLabel } from "@/components/order-board";
import { adjustReadyAction, recordExtraPackedAction, receiveStockAction, stockOpnameAction, setDateStatusAction, setStoreStatusAction, rescheduleOrderAction } from "@/lib/domain/actions";
import { ListRowCard } from "@/components/ui/list-row-card";
import { ActionCard } from "@/components/ui/action-card";
import { MetricCard } from "@/components/ui/metric-card";
import styles from "./founder.module.css";

const today = () => jakartaNow(new Date()).date;

// Raw cheese is entered in supplier packs (225 g each, decimals allowed for a part-used pack); everything else in pieces.
const toStored = (item: ItemId, input: string) => Math.round(Number(input) * (item === "raw_cheese" ? SUPPLIER_PACK : 1));

function ReadyToSell({ session }: { session: op.State }) {
  const [product, setProduct] = useState<ProductId>("milieu");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const now = new Date();
  const ready = op.readyBalances(session, now);
  const [writeOffError, setWriteOffError] = useState<string | null>(null);
  // Takes a thunk so a blocked double-submit never fires the server action.
  const act = (run: () => Promise<{ error: string | null }>, reset = false) => {
    if (isPending) return;
    startTransition(async () => {
      const { error } = await run();
      if (reset) setError(error); else setWriteOffError(error);
      if (!error && reset) { setQty(""); setNote(""); }
    });
  };
  const typeLabel = { EXTRA_PACKED: "Ekstra dipacking", ALLOCATED_TO_ORDER: "Dialokasikan ke pesanan", ADJUSTMENT: "Penyesuaian", REVERSAL: "Pengembalian" };

  return (
    <>
      <div className={styles.stockHeader}><div><h2>Produk Siap Dijual</h2><p>Produk jadi ekstra dari packing. Dialokasikan otomatis ke pesanan baru, yang terlama dulu. Kedaluwarsa 1 bulan sejak tanggal packing.</p></div></div>
      <section className={styles.stockGrid}>
        {ready.map((r) => (
          <article key={r.productId} className={`${styles.stockCard} ${r.expired > 0 ? styles.warn : ""}`}>
            <div className={styles.stockCardTop}><h3>{r.name}</h3>{r.expired > 0 && <span className="status status-warning"><WarningCircle size={13} /> {r.expired} kedaluwarsa</span>}</div>
            <div className={styles.stockValue}>{r.available} pcs</div>
            <p>siap dijual</p>
            {r.sources.map((s) => (
              <div key={s.sourceId} className={styles.stockFooter}>
                <span>{s.remaining} pcs · exp {formatDate(s.expiresOn, "short")}{s.expired ? " (kedaluwarsa)" : ""}</span>
                <button className={styles.textLink} disabled={isPending} aria-label={`Tulis off ${r.name} exp ${formatDate(s.expiresOn, "short")}`} onClick={() => { const n = window.prompt(`Berapa unit dihapus dari stok siap jual (maks ${s.remaining})? Untuk kedaluwarsa atau dikonsumsi.`, String(s.remaining)); if (n) act(() => adjustReadyAction(s.sourceId, Number(n), s.expired ? "Kedaluwarsa" : "Penyesuaian founder")); }}>Tulis off</button>
              </div>
            ))}
          </article>
        ))}
      </section>
      {writeOffError && <p role="alert" className={styles.hint}>{writeOffError}</p>}
      <div className={styles.receivables}>
        <ActionCard title="Catat Produk Ekstra" subtitle="Mengurangi bahan sesuai resep dan menambah stok siap jual dalam satu langkah." note={error && <p role="alert" className={styles.hint}>{error}</p>}>
          <select className={styles.search} aria-label="Produk" value={product} onChange={(event) => setProduct(event.target.value as ProductId)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input className={styles.search} type="number" min={1} inputMode="numeric" aria-label="Jumlah ekstra" placeholder="Jumlah" value={qty} onChange={(event) => setQty(event.target.value)} />
          <input className={styles.search} aria-label="Catatan" placeholder="Catatan (opsional)" value={note} onChange={(event) => setNote(event.target.value)} />
          <button className="btn btn-primary" disabled={!qty || isPending} onClick={() => act(() => recordExtraPackedAction(product, Number(qty), note), true)}>Catat</button>
        </ActionCard>
      </div>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Riwayat produk siap dijual</h2><p>Append-only; pembatalan pesanan dicatat sebagai pengembalian.</p></div></div>
        {session.readyMovements.length === 0 && <p className={styles.empty}>Belum ada produk ekstra.</p>}
        {session.readyMovements.slice(-10).reverse().map((m) => (
          <ListRowCard
            key={m.id}
            title={products.find((p) => p.id === m.productId)!.name}
            subtitle={`${new Date(m.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}${m.orderId ? ` · ${m.orderId}` : ""}${m.note ? ` · ${m.note}` : ""}`}
            middle={typeLabel[m.type]}
            trailing={`${m.delta > 0 ? "+" : ""}${m.delta} pcs`}
          />
        ))}
      </section>
    </>
  );
}

export function StockBoard({ session }: { session: op.State }) {
  const [draft, setDraft] = useState<Partial<Record<ItemId, string>>>({});
  // Desktop shows every stock form; older browsers lack ::details-content, so force open via JS.
  const [desktop, setDesktop] = useState(false);
  useEffect(() => { const mq = window.matchMedia("(min-width: 901px)"); const sync = () => setDesktop(mq.matches); sync(); mq.addEventListener("change", sync); return () => mq.removeEventListener("change", sync); }, []);
  const [message, setMessage] = useState<{ id: ItemId; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const act = (id: ItemId, run: () => Promise<{ error: string | null }>) => {
    if (isPending) return;
    startTransition(async () => {
      const { error } = await run();
      setMessage(error ? { id, text: error } : null);
      if (!error) setDraft((current) => ({ ...current, [id]: "" }));
    });
  };
  // Low items first (stable sort keeps catalog order within each group).
  const items = op.balances(session).sort((a, b) => Number(b.available < b.threshold) - Number(a.available < a.threshold));

  return (
    <>
      <div className={styles.stockHeader}><div><h2>Inventaris utama</h2><p>Stok fisik dikurangi reservasi pesanan. Peringatan hanya mengingatkan, tidak memesan otomatis.</p></div></div>
      <section className={styles.stockGrid}>
        {items.map((item) => {
          const low = item.available < item.threshold;
          const value = draft[item.id] ?? "";
          return (
            <article key={item.id} className={`${styles.stockCard} ${low ? styles.warn : ""}`}>
              <div className={styles.stockCardTop}><h3>{item.name}</h3>{low ? <span className="status status-warning"><WarningCircle size={13} /> Rendah</span> : <span className="status status-safe">Aman</span>}</div>
              <div className={styles.stockValue}>{formatQuantity(item.id, item.available)}</div>
              <p>tersedia · fisik {formatQuantity(item.id, item.onHand)} · reservasi {formatQuantity(item.id, item.reserved)}</p>
              <details className={styles.stockMore} open={desktop}>
                <summary>Ubah stok</summary>
              <div className={styles.cardActions}>
                <input className={styles.search} style={{ minWidth: 0, flex: "1 1 100%" }} type="number" min={0} inputMode="decimal" aria-label={`Jumlah ${item.name}`} placeholder={item.id === "raw_cheese" ? "Pak supplier (225 g)" : "Pcs"} step={item.id === "raw_cheese" ? "any" : 1} value={value} onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value }))} />
                <button className="btn btn-quiet" disabled={!value || isPending} onClick={() => act(item.id, () => receiveStockAction(item.id, toStored(item.id, value)))}>Terima stok</button>
                <button className="btn btn-quiet" disabled={value === "" || isPending} onClick={() => act(item.id, () => stockOpnameAction(item.id, toStored(item.id, value)))}>Hasil opname</button>
                {value === "" && <p className={styles.hint}>Isi jumlah dulu</p>}
              </div>
              {message?.id === item.id && <p role="alert" className={styles.hint}>{message.text}</p>}
              <div className={styles.stockFooter}><span>Ambang {formatQuantity(item.id, item.threshold)}</span></div>
              </details>
            </article>
          );
        })}
      </section>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Riwayat pergerakan stok</h2><p>Pergerakan tidak diubah atau dihapus; koreksi dicatat sebagai opname.</p></div></div>
        {session.movements.slice(-10).reverse().map((m) => (
          <ListRowCard
            key={m.id}
            title={items.find((i) => i.id === m.itemId)!.name}
            subtitle={new Date(m.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
            middle={{ RECEIPT: "Penerimaan", STOCK_OPNAME: "Opname", PACKING_CONSUMPTION: "Konsumsi packing" }[m.reason]}
            trailing={`${m.delta > 0 ? "+" : ""}${formatQuantity(m.itemId, m.delta)}`}
          />
        ))}
      </section>
      <ReadyToSell session={session} />
    </>
  );
}

export function FinanceBoard({ session }: { session: op.State }) {
  const orders = session.orders.filter((o) => o.status !== "CANCELLED");
  const payments = session.orders.flatMap((o) => o.payments.filter((p) => !p.reversedAt));
  const received = payments.reduce((sum, p) => sum + p.amount, 0);
  const share = (method: op.PaymentMethod) => (received ? `${Math.round((payments.filter((p) => p.method === method).reduce((s, p) => s + p.amount, 0) / received) * 100)}%` : "—");

  return (
    <>
      <section className={styles.financeHero}>
        <MetricCard variant="hero" label="Omzet (sesi ini)" value={formatRupiah(orders.reduce((sum, o) => sum + o.total, 0))} hint={`${orders.length} pesanan · ${orders.flatMap((o) => o.items).reduce((s, i) => s + i.quantity, 0)} produk`} />
        <div className={styles.financeSide}>
          <MetricCard variant="hero" compact label="Sudah diterima" value={formatRupiah(received)} />
          <MetricCard variant="hero" compact label="Belum dibayar" value={formatRupiah(orders.reduce((sum, o) => sum + op.receivable(o), 0))} />
          <MetricCard variant="hero" compact label="Transfer" value={share("TRANSFER")} />
          <MetricCard variant="hero" compact label={`QRIS · Tunai ${share("CASH")}`} value={share("QRIS")} />
        </div>
      </section>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Pesanan & piutang</h2><p>Pesanan selesai boleh belum dibayar; konfirmasi pembayaran dilakukan founder di Pesanan.</p></div></div>
        {[...orders].reverse().map((o) => (
          <ListRowCard
            key={o.id}
            title={o.customer.name}
            subtitle={`${o.id} · ${itemsLabel(o)}`}
            middle={<span className={`status ${op.isPaid(o) ? "status-safe" : "status-danger"}`}>{op.isPaid(o) ? "Lunas" : `Piutang ${formatRupiah(op.receivable(o))}`}</span>}
            trailing={formatRupiah(o.total)}
          />
        ))}
      </section>
    </>
  );
}

export function AvailabilityBoard({ session }: { session: op.State }) {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<DateStatus>("HOLIDAY");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const affected = date ? op.ordersOnDate(session, date) : [];
  const suggestion = affected.length ? recommendReschedule(date, { ...session.calendar, [date]: status }, today()) : null;
  const act = (action: Promise<{ error: string | null }>) => startTransition(async () => setError((await action).error));
  const block = () => act(setDateStatusAction(date, status));
  const moveAndBlock = () => act((async () => {
    for (const order of affected) {
      const { error } = await rescheduleOrderAction(order.id, suggestion!);
      if (error) return { error };
    }
    return setDateStatusAction(date, status);
  })());
  const upcoming = Object.entries(session.calendar).filter(([d]) => d >= today()).sort();
  const paused = session.storeStatus === "PAUSED";

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2>Status toko</h2><p>{paused ? "Pesanan baru ditolak. Pesanan yang ada tetap berjalan." : "Toko menerima pesanan. Tanggal tertutup dilewati otomatis."}</p></div>
          <button className={`btn ${paused ? "btn-primary" : "btn-quiet"}`} onClick={() => act(setStoreStatusAction(paused ? "OPEN" : "PAUSED"))}>{paused ? "Buka pemesanan" : "Jeda pemesanan"}</button>
        </div>
      </section>

      <div className={styles.receivables}>
        <ActionCard
          title="Tutup tanggal"
          subtitle="Libur nasional atau keperluan keluarga. Pesanan pada tanggal itu harus dipindahkan dulu."
          note={
            <>
              {affected.length > 0 && (
                <div className={styles.attention}>
                  <strong><WarningCircle size={16} /> {affected.length} pesanan pada {formatDate(date)}</strong>
                  <span>{affected.map((o) => `${o.id} (${itemsLabel(o)})`).join(" · ")}</span>
                  {suggestion
                    ? <button className="btn btn-primary" onClick={moveAndBlock}>Pindahkan ke {formatDate(suggestion)} & tutup</button>
                    : <span className="status status-danger">Tidak ada tanggal pengganti otomatis. Sepakati tanggal dengan pelanggan atau batalkan pesanan.</span>}
                </div>
              )}
              {error && <p role="alert" className={styles.hint}>{error}</p>}
            </>
          }
        >
          <input className={styles.search} type="date" min={today()} aria-label="Tanggal" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className={styles.search} aria-label="Jenis" value={status} onChange={(event) => setStatus(event.target.value as DateStatus)}><option value="HOLIDAY">Libur nasional</option><option value="UNAVAILABLE">Tidak tersedia</option></select>
          {affected.length === 0 && <button className={`btn btn-primary ${styles.noGrow}`} disabled={!date} onClick={block}>Tutup tanggal</button>}
        </ActionCard>
      </div>

      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Tanggal tertutup</h2><p>Mandiri, BI, dan pengiriman memakai kalender yang sama.</p></div></div>
        {upcoming.length === 0 && <p className={styles.empty}>Belum ada tanggal tertutup.</p>}
        {upcoming.map(([d, s]) => (
          <ListRowCard
            key={d}
            title={formatDate(d)}
            subtitle={s === "HOLIDAY" ? "Libur nasional" : "Tidak tersedia"}
            trailing={<button className={styles.textLink} onClick={() => act(setDateStatusAction(d, null))}>Buka kembali</button>}
          />
        ))}
      </section>
    </>
  );
}
