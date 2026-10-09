"use client";

// Replaces the root layout, so it carries its own html/body and no global styles.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeContent: "center", gap: 12, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h1>Terjadi kesalahan</h1>
        <p>Aplikasi tidak bisa dimuat. Silakan coba lagi.</p>
        <button onClick={() => retry()} style={{ minHeight: 46, padding: "0 18px", fontWeight: 700 }}>Coba lagi</button>
      </body>
    </html>
  );
}
