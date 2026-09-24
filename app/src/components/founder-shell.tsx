import Link from "next/link";
import { CalendarBlank, ChartLineUp, House, Package, ShoppingBagOpen, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import { ExportMenu } from "./export-menu";
import { LogoutButton } from "./logout-button";
import styles from "./founder.module.css";

const nav = [
  { href: "/founder", label: "Beranda", icon: House },
  { href: "/founder/orders", label: "Pesanan", icon: ShoppingBagOpen },
  { href: "/founder/stock", label: "Stok", icon: Package },
  { href: "/founder/finance", label: "Keuangan", icon: ChartLineUp },
  { href: "/founder/availability", label: "Kalender", icon: CalendarBlank },
] as const;

const exportLinks = [
  ["orders", "Pesanan"], ["order-items", "Item pesanan"], ["customers", "Pelanggan"], ["payments", "Pembayaran"],
  ["inventory-movements", "Mutasi stok"], ["inventory-balances", "Saldo stok"], ["ready-movements", "Mutasi produk siap"], ["ready-balances", "Saldo produk siap"], ["availability", "Kalender"],
] as const;

export function FounderShell({ active, title, subtitle, children }: { active: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <Link href="/founder" className={styles.founderBrand}><span className="brand-wordmark">LE NOUETTE</span><small>Founder OS</small></Link>
        <nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={active === label ? styles.active : ""}><Icon size={20} weight={active === label ? "fill" : "regular"} /><span>{label}</span></Link>)}</nav>
        <Link href="/" className={styles.storeLink}><SquaresFour size={19} />Lihat Storefront</Link>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <div className={styles.topActions}>
            <ExportMenu>
              <summary className="btn"><span className={styles.exportLong}>Unduh Data Bisnis</span><span className={styles.exportShort} aria-hidden="true">Unduh</span></summary>
              <div className={styles.exportList}>
                <a href="/founder/export/xlsx">Semua data (XLSX)</a>
                {exportLinks.map(([key, label]) => <a key={key} href={`/founder/export/csv?dataset=${key}`}>{label} (CSV)</a>)}
              </div>
            </ExportMenu>
            <LogoutButton /><span className={styles.avatar}>HS</span></div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
      <nav className={styles.mobileNav}>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={active === label ? styles.active : ""}><Icon size={21} weight={active === label ? "fill" : "regular"} /><span>{label}</span></Link>)}</nav>
    </div>
  );
}
