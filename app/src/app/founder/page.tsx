import { FounderShell } from "@/components/founder-shell";
import { DashboardSummary } from "@/components/packing-panel";

export default function FounderDashboard() {
  return (
    <FounderShell active="Beranda" title="Beranda" subtitle="Ringkasan operasional hari ini · data sesi prototipe">
      {/* ponytail: Product Ready to Sell panel removed until its ledger exists (Phase 3). */}
      <DashboardSummary />
    </FounderShell>
  );
}
