import Link from "next/link";
import { FounderShell } from "@/components/founder-shell";
import { listInvoices } from "@/lib/db/invoices";
import { formatInvoiceDate, rupiah } from "@/lib/domain/invoice";
import styles from "@/components/founder.module.css";
import inv from "@/components/invoice.module.css";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await listInvoices();
  return (
    <FounderShell active="Invoice" title="Invoice" subtitle="Buat dan unduh invoice PDF">
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2>Daftar Invoice</h2><p>{rows.length} invoice</p></div>
          <Link className="btn btn-primary" href="/founder/invoices/new">Buat Invoice</Link>
        </div>
        {rows.length === 0 ? <p className={styles.empty}>Belum ada invoice.</p> : (
          <div className={inv.tableWrap}>
            <table className={`${inv.table} ${inv.list}`}>
              <thead><tr><th>Nomor</th><th>Pembeli</th><th>Tanggal</th><th>Total</th><th>PDF</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.number}{r.orderId ? <small className={styles.hint}>Pesanan {r.orderId}</small> : null}</td>
                  <td>{r.buyerName}</td><td className={inv.num}>{formatInvoiceDate(r.issuedAt)}</td><td className={inv.num}>{rupiah(r.total)}</td>
                  <td><a className={`${styles.textLink} ${inv.dl}`} href={`/founder/invoices/${r.id}/pdf`} target="_blank" rel="noopener noreferrer">Unduh</a></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </FounderShell>
  );
}
