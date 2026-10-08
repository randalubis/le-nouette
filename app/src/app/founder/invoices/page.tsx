import Link from "next/link";
import { FounderShell } from "@/components/founder-shell";
import { InvoiceRowActions } from "@/components/invoice-row-actions";
import { getState } from "@/lib/db/get-state";
import { listInvoices } from "@/lib/db/invoices";
import { formatInvoiceDate, rupiah } from "@/lib/domain/invoice";
import { isPaid, receivable } from "@/lib/domain/operations";
import styles from "@/components/founder.module.css";
import inv from "@/components/invoice.module.css";

export const dynamic = "force-dynamic";

const methodLabel: Record<string, string> = { TRANSFER: "Transfer", QRIS: "QRIS", CASH: "Tunai" };

export default async function Page({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const [rows, state] = await Promise.all([listInvoices(), getState()]); // state is read-only: order status for hints
  const order = (id: string | null) => {
    const o = id ? state.orders.find((x) => x.id === id) : undefined;
    return o ? { id: o.id, receivable: receivable(o), paid: isPaid(o), cancelled: o.status === "CANCELLED" } : null;
  };
  return (
    <FounderShell active="Invoice" title="Invoice" subtitle="Buat dan unduh invoice PDF">
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2>Daftar Invoice</h2><p>{rows.length} invoice</p></div>
          <Link className="btn btn-primary" href="/founder/invoices/new">Buat Invoice</Link>
        </div>
        {msg === "locked" && <p className={inv.error} role="alert">Invoice lunas tidak bisa diedit; batalkan lunas dulu.</p>}
        {rows.length === 0 ? <p className={styles.empty}>Belum ada invoice.</p> : (
          <div className={inv.tableWrap}>
            <table className={`${inv.table} ${inv.list}`}>
              <thead><tr><th>Nomor</th><th>Pembeli</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.number}{r.orderId ? <small className={styles.hint}><span className={inv.nowrap}>Pesanan {r.orderId}</span></small> : null}</td>
                  <td>{r.buyerName}</td><td className={inv.num}>{formatInvoiceDate(r.issuedAt)}</td><td className={inv.num}>{rupiah(r.total)}</td>
                  <td><span className={`status ${r.paidAt ? "status-safe" : "status-warning"}`}>{r.paidAt ? `Lunas${r.paidMethod ? ` · ${methodLabel[r.paidMethod] ?? r.paidMethod}` : ""}` : "Belum dibayar"}</span></td>
                  <td><InvoiceRowActions id={r.id} number={r.number} total={r.total} paid={!!r.paidAt} order={order(r.orderId)} orderPaymentId={r.orderPaymentId} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </FounderShell>
  );
}
