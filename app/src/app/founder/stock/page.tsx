import { FounderShell } from "@/components/founder-shell";
import { StockBoard } from "@/components/founder-boards";
import { getState } from "@/lib/db/get-state";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getState();
  return (
    <FounderShell active="Stok" title="Stok & bahan" subtitle="Stok fisik, reservasi, dan tersedia untuk pesanan baru">
      <StockBoard session={session} />
    </FounderShell>
  );
}
