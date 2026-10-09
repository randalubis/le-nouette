"use client";

import { CaretLeft, CaretRight, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState, useTransition } from "react";
import { formatAvailable, formatQuantity, formatRupiah, formatShortage, products, SUPPLIER_PACK, type ItemId, type ProductId } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate, formatDateTime, jakartaNow, recommendReschedule, type DateStatus } from "@/lib/domain/schedule";
import { percentShares } from "@/lib/domain/percent";
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
  const [busy, setBusy] = useState("");
  const lbl = (key: string, text: string) => (isPending && busy === key ? "Memproses..." : text);
  // Takes a thunk so a blocked double-submit never fires the server action.
  const act = (key: string, run: () => Promise<{ error: string | null }>, reset = false) => {
    if (isPending) return;
    setBusy(key);
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
                <button className={styles.textLink} disabled={isPending} aria-label={`Tulis off ${r.name} exp ${formatDate(s.expiresOn, "short")}`} onClick={() => { const n = window.prompt(`Berapa unit dihapus dari stok siap jual (maks ${s.remaining})? Untuk kedaluwarsa atau dikonsumsi.`, String(s.remaining)); if (n) act(s.sourceId, () => adjustReadyAction(s.sourceId, Number(n), s.expired ? "Kedaluwarsa" : "Penyesuaian founder")); }}>{lbl(s.sourceId, "Tulis off")}</button>
              </div>
            ))}
          </article>
        ))}
      </section>
      {writeOffError && <p role="alert" className={styles.hint}>{writeOffError}</p>}
      <div className={styles.receivables}>
        <ActionCard tone="dark" title="Catat Produk Ekstra" subtitle="Mengurangi bahan sesuai resep dan menambah stok siap jual dalam satu langkah." note={error && <p role="alert" className={styles.hint}>{error}</p>}>
          <select className={styles.search} aria-label="Produk" value={product} onChange={(event) => setProduct(event.target.value as ProductId)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input className={styles.search} type="number" min={1} inputMode="numeric" aria-label="Jumlah ekstra" placeholder="Jumlah" value={qty} onChange={(event) => setQty(event.target.value)} />
          <input className={styles.search} aria-label="Catatan" placeholder="Catatan (opsional)" value={note} onChange={(event) => setNote(event.target.value)} />
          <button className="btn btn-primary" disabled={!qty || isPending} onClick={() => act("extra", () => recordExtraPackedAction(product, Number(qty), note), true)}>{lbl("extra", "Catat")}</button>
        </ActionCard>
      </div>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Riwayat produk siap dijual</h2><p>Append-only; pembatalan pesanan dicatat sebagai pengembalian.</p></div></div>
        {session.readyMovements.length === 0 && <p className={styles.empty}>Belum ada produk ekstra.</p>}
        {session.readyMovements.slice(-10).reverse().map((m) => (
          <ListRowCard
            key={m.id}
            title={products.find((p) => p.id === m.productId)!.name}
            subtitle={`${formatDateTime(m.at)}${m.orderId ? ` · ${m.orderId}` : ""}${m.note ? ` · ${m.note}` : ""}`}
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
  const [busy, setBusy] = useState("");
  const lbl = (key: string, text: string) => (isPending && busy === key ? "Memproses..." : text);

  const act = (id: ItemId, kind: string, run: () => Promise<{ error: string | null }>) => {
    if (isPending) return;
    setBusy(`${id}:${kind}`);
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
              <div className={styles.stockValue}>{formatAvailable(item.id, item.available)}</div>
              {item.available < 0 && <p className={styles.shortage}>{formatShortage(item.id, item.available)}</p>}
              <p>tersedia · fisik {formatQuantity(item.id, item.onHand)} · reservasi {formatQuantity(item.id, item.reserved)}</p>
              <div className={styles.stockBar} role="img" aria-label={`Tersedia ${formatAvailable(item.id, item.available)}${item.available < 0 ? `, ${formatShortage(item.id, item.available)}` : ""}, ambang ${formatQuantity(item.id, item.threshold)}`}><i style={{ width: `${Math.max(0, Math.min(100, Math.round((item.available / (item.threshold * 2)) * 100)))}%` }} /><b /></div>
              <details className={styles.stockMore} open={desktop}>
                <summary>Ubah stok</summary>
              <div className={styles.cardActions}>
                <input className={styles.search} style={{ minWidth: 0, flex: "1 1 100%" }} type="number" min={0} inputMode="decimal" aria-label={`Jumlah ${item.name}`} placeholder={item.id === "raw_cheese" ? "Pak supplier (225 g)" : "Pcs"} step={item.id === "raw_cheese" ? "any" : 1} value={value} onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value }))} />
                <button className="btn btn-quiet" disabled={!value || isPending} onClick={() => act(item.id, "receive", () => receiveStockAction(item.id, toStored(item.id, value)))}>{lbl(`${item.id}:receive`, "Terima stok")}</button>
                <button className="btn btn-quiet" disabled={value === "" || isPending} onClick={() => act(item.id, "opname", () => stockOpnameAction(item.id, toStored(item.id, value)))}>{lbl(`${item.id}:opname`, "Hasil opname")}</button>
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
            title={items.find((i) => i.id === m.itemId)?.name ?? m.itemId}
            subtitle={formatDateTime(m.at)}
            middle={{ RECEIPT: "Penerimaan", STOCK_OPNAME: "Opname", PACKING_CONSUMPTION: "Konsumsi packing" }[m.reason]}
            trailing={`${m.delta > 0 ? "+" : ""}${formatQuantity(m.itemId, m.delta)}`}
          />
        ))}
      </section>
      <ReadyToSell session={session} />
    </>
  );
}

const methodLabel: Record<op.PaymentMethod, string> = { TRANSFER: "Transfer", QRIS: "QRIS", CASH: "Tunai" };
const refundMethods = (o: op.Order) => [...new Set(o.payments.filter((p) => !p.reversedAt).map((p) => methodLabel[p.method]))].join(" + ");

export function FinanceBoard({ session }: { session: op.State }) {
  const orders = session.orders.filter((o) => o.status !== "CANCELLED");
  const f = op.financeSummary(session);
  const methods: op.PaymentMethod[] = ["TRANSFER", "QRIS", "CASH"];
  const pct = percentShares(methods.map((m) => f.methodShare(m)));
  const share = (i: number) => (f.received ? `${pct[i]}%` : "—");
  const active = (o: op.Order) => o.status !== "COMPLETED";
  const rows = [
    { key: "due", title: "Piutang · pesanan selesai", list: orders.filter((o) => o.status === "COMPLETED" && !op.isPaid(o)), badge: "Piutang" },
    { key: "wait", title: "Menunggu pembayaran · pesanan berjalan", list: orders.filter((o) => active(o) && !op.isPaid(o)), badge: "Menunggu bayar" },
    { key: "paid", title: "Lunas", list: orders.filter((o) => op.isPaid(o)), badge: "" },
  ];

  return (
    <>
      <section className={styles.financeHero}>
        <MetricCard variant="hero" label="Omzet (pesanan selesai)" value={formatRupiah(f.revenue)} hint={`${f.revenueOrders} pesanan · ${f.revenueUnits} produk`} />
        <div className={styles.financeSide}>
          <MetricCard variant="hero" compact label="Sudah diterima" value={formatRupiah(f.received)} hint="Pembayaran pesanan selesai" />
          <MetricCard variant="hero" compact label="Piutang" value={formatRupiah(f.receivableCompleted)} hint="Pesanan selesai, belum lunas" />
          <MetricCard variant="hero" compact label="Menunggu bayar" value={formatRupiah(f.awaitingPayment)} hint="Pesanan berjalan, belum lunas" />
          {f.heldPayments > 0 && <MetricCard variant="hero" compact label="Dibayar, belum selesai" value={formatRupiah(f.heldPayments)} hint="Pesanan belum selesai" />}
          {f.refundDue > 0 && <MetricCard variant="hero" compact label="Perlu refund" value={formatRupiah(f.refundDue)} hint="Pesanan dibatalkan" />}
        </div>
      </section>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Porsi metode pembayaran</h2><p>Dihitung dari pembayaran yang sudah diterima</p></div></div>
        <div className={styles.methodBar} role="img" aria-label={f.received ? methods.map((m, i) => `${methodLabel[m]} ${pct[i]} persen`).join(", ") : "Belum ada pembayaran diterima"}>
          {f.received > 0 && methods.map((m, i) => pct[i] > 0 && <span key={m} style={{ flex: pct[i], background: `var(--chart-${i + 1})` }} />)}
        </div>
        <div className={styles.methodLegend}>
          {methods.map((m, i) => <div key={m}><i style={{ background: `var(--chart-${i + 1})` }} /><div><small>{methodLabel[m]}</small><strong>{share(i)}</strong></div></div>)}
        </div>
      </section>
      {f.refundOrders.length > 0 && (
        <section className={`${styles.panel} ${styles.receivables}`}>
          <div className={styles.panelHeader}><div><h2>Perlu refund</h2><p>Pesanan dibatalkan yang sudah dibayar. Catat pengembalian di Pesanan.</p></div></div>
          {f.refundOrders.map((o) => <ListRowCard key={o.id} href="/founder/orders?tab=CANCELLED" title={o.customer.name} subtitle={`${o.id} · ${refundMethods(o)}`} trailing={formatRupiah(op.amountPaid(o))} />)}
        </section>
      )}
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Pesanan & pembayaran</h2><p>Pesanan selesai boleh belum dibayar; konfirmasi pembayaran dilakukan founder di Pesanan.</p></div></div>
        {rows.filter((g) => g.list.length > 0).map((g) => (
          <div key={g.key}>
            <h3 className={styles.groupTitle}>{g.title} ({g.list.length})</h3>
            {[...g.list].reverse().map((o) => (
              <ListRowCard
                key={o.id}
                title={o.customer.name}
                subtitle={`${o.id} · ${itemsLabel(o)}`}
                trailing={<span style={{ display: "grid", justifyItems: "end", gap: 4 }}>{formatRupiah(o.total)}<span className={`status ${g.badge ? (g.key === "due" ? "status-danger" : "status-warning") : "status-safe"}`}>{g.badge ? (op.receivable(o) < o.total ? `${g.badge} · sisa ${formatRupiah(op.receivable(o))}` : g.badge) : "Lunas"}</span></span>}
              />
            ))}
          </div>
        ))}
      </section>
    </>
  );
}

const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const shiftMonth = (ym: string, by: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + by, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

function MonthCalendar({ month, onMonth, closed, todayStr, selected, onPick }: { month: string; onMonth: (m: string) => void; closed: Set<string>; todayStr: string; selected: string; onPick: (d: string) => void }) {
  const [y, m] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const title = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <section className={`${styles.panel} ${styles.calPanel}`}>
      <div className={styles.calHead}>
        <h2>{title}</h2>
        <div className={styles.calNav}>
          <button type="button" className="icon-btn" aria-label="Bulan sebelumnya" onClick={() => onMonth(shiftMonth(month, -1))}><CaretLeft size={18} /></button>
          <button type="button" className="icon-btn" aria-label="Bulan berikutnya" onClick={() => onMonth(shiftMonth(month, 1))}><CaretRight size={18} /></button>
        </div>
      </div>
      <div className={styles.calGrid}>
        {weekdays.map((w) => <span key={w} className={styles.calDow}>{w}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, "0")}`;
          const isClosed = closed.has(d);
          const cls = [styles.calDay, isClosed ? styles.calClosed : "", d === todayStr ? styles.calToday : "", d === selected && !isClosed ? styles.calPending : ""].join(" ");
          return <button type="button" key={d} className={cls} disabled={d < todayStr} aria-label={`${formatDate(d)}${isClosed ? ", tertutup" : ""}`} aria-pressed={d === selected} onClick={() => onPick(d)}>{i + 1}</button>;
        })}
      </div>
      <div className={styles.calLegend}>
        <span><i className={styles.calClosed} />Tertutup</span>
        <span><i className={styles.calToday} />Hari ini</span>
        <span><i className={styles.calPending} />Akan ditutup</span>
      </div>
    </section>
  );
}

export function AvailabilityBoard({ session }: { session: op.State }) {
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [status, setStatus] = useState<DateStatus>("HOLIDAY");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState("");
  const lbl = (key: string, text: string) => (isPending && busy === key ? "Memproses..." : text);

  const affected = date ? op.ordersOnDate(session, date) : [];
  const suggestion = affected.length ? recommendReschedule(date, { ...session.calendar, [date]: status }, today()) : null;
  const act = (key: string, run: () => Promise<{ error: string | null }>) => {
    if (isPending) return;
    setBusy(key);
    startTransition(async () => setError((await run()).error));
  };
  const block = () => act("block", () => setDateStatusAction(date, status));
  const moveAndBlock = () => act("move", async () => {
    for (const order of affected) {
      const { error } = await rescheduleOrderAction(order.id, suggestion!);
      if (error) return { error };
    }
    return setDateStatusAction(date, status);
  });
  const upcoming = Object.entries(session.calendar).filter(([d]) => d >= today()).sort();
  const paused = session.storeStatus === "PAUSED";

  return (
    <>
      <div className={styles.calLayout}>
      <div className={styles.calCol}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2><span className={`status ${paused ? "status-danger" : "status-safe"}`}>{paused ? "Dijeda" : "Buka"}</span> Status toko</h2><p>{paused ? "Pesanan baru ditolak. Pesanan yang ada tetap berjalan." : "Toko menerima pesanan. Tanggal tertutup dilewati otomatis."}</p></div>
          <button className={`btn ${paused ? "btn-primary" : "btn-quiet"}`} disabled={isPending} onClick={() => act("store", () => setStoreStatusAction(paused ? "OPEN" : "PAUSED"))}>{lbl("store", paused ? "Buka pemesanan" : "Jeda pemesanan")}</button>
        </div>
      </section>

      <div className={styles.receivables}>
        <ActionCard
          title="Tutup tanggal"
          subtitle="Libur nasional atau keperluan keluarga. Pesanan pada tanggal itu harus dipindahkan dulu."
          note={
            <>
              {affected.length > 0 && (
                <div className={`${styles.attention} ${styles.alertBox}`}>
                  <strong><WarningCircle size={16} /> {affected.length} pesanan pada {formatDate(date)}</strong>
                  <span>{affected.map((o) => `${o.id} (${itemsLabel(o)})`).join(" · ")}</span>
                  {suggestion
                    ? <button className="btn btn-primary" disabled={isPending} onClick={moveAndBlock}>{isPending && busy === "move" ? "Memproses..." : `Pindahkan ke ${formatDate(suggestion)} & tutup`}</button>
                    : <span className="status status-danger">Tidak ada tanggal pengganti otomatis. Sepakati tanggal dengan pelanggan atau batalkan pesanan.</span>}
                </div>
              )}
              {error && <p role="alert" className={styles.hint}>{error}</p>}
            </>
          }
        >
          <input className={`${styles.search} ${styles.closeField}`} type="date" min={today()} aria-label="Tanggal" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className={`${styles.search} ${styles.closeField}`} aria-label="Jenis" value={status} onChange={(event) => setStatus(event.target.value as DateStatus)}><option value="HOLIDAY">Libur nasional</option><option value="UNAVAILABLE">Tidak tersedia</option></select>
          {affected.length === 0 && <button className={`btn btn-primary ${styles.closeBtn}`} disabled={!date || isPending} onClick={block}>{lbl("block", "Tutup tanggal")}</button>}
        </ActionCard>
      </div>
      </div>
      <MonthCalendar month={month} onMonth={setMonth} closed={new Set(Object.keys(session.calendar))} todayStr={today()} selected={date} onPick={(d) => { setDate(d); setMonth(d.slice(0, 7)); }} />
      </div>

      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Tanggal tertutup</h2><p>Mandiri, BI, dan pengiriman memakai kalender yang sama.</p></div></div>
        {upcoming.length === 0 && <p className={styles.empty}>Belum ada tanggal tertutup.</p>}
        {upcoming.map(([d, s]) => (
          <ListRowCard
            key={d}
            title={formatDate(d)}
            subtitle={s === "HOLIDAY" ? "Libur nasional" : "Tidak tersedia"}
            trailing={<button className={styles.textLink} disabled={isPending} onClick={() => act(`open:${d}`, () => setDateStatusAction(d, null))}>{lbl(`open:${d}`, "Buka kembali")}</button>}
          />
        ))}
      </section>
    </>
  );
}
