import { FounderShell } from "@/components/founder-shell";
import { FinanceBoard } from "@/components/founder-boards";

export default function Page() {
  return (
    <FounderShell active="Keuangan" title="Keuangan" subtitle="Omzet, pembayaran, dan piutang operasional">
      <FinanceBoard />
    </FounderShell>
  );
}
