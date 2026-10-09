"use client";

import styles from "@/components/founder.module.css";

export default function FounderError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className={`${styles.app} ${styles.routeState}`}>
      <div className={`${styles.panel} ${styles.routeCard}`} role="alert">
        <h1>Halaman tidak bisa dimuat</h1>
        <p>Terjadi masalah saat memuat data. Data Anda aman. Coba lagi sebentar.</p>
        <button className="btn btn-primary" onClick={() => retry()}>Coba lagi</button>
      </div>
    </div>
  );
}
