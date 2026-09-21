import { FounderShell } from "@/components/founder-shell";
import { StockBoard } from "@/components/founder-boards";

export default function Page() {
  return (
    <FounderShell active="Stok" title="Stok & bahan" subtitle="Stok fisik, reservasi, dan tersedia untuk pesanan baru">
      <StockBoard />
    </FounderShell>
  );
}
