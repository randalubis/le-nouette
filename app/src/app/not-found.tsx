import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-state">
      <div className="route-card">
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
        <Link className="btn btn-primary" href="/founder">Kembali ke Beranda</Link>
        <Link className="btn btn-secondary" href="/">Lihat Storefront</Link>
      </div>
    </main>
  );
}
