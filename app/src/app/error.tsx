"use client";

export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="route-state">
      <div className="route-card" role="alert">
        <h1>Terjadi kesalahan</h1>
        <p>Halaman tidak bisa dimuat. Silakan coba lagi.</p>
        <button className="btn btn-primary" onClick={() => retry()}>Coba lagi</button>
      </div>
    </main>
  );
}
