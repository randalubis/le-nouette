import { FounderShell } from "@/components/founder-shell";
import { DashboardSummary } from "@/components/packing-panel";
import { getState } from "@/lib/db/get-state";

export const dynamic = "force-dynamic";

export default async function FounderDashboard() {
  const session = await getState();
  return (
    <FounderShell active="Beranda" title="Beranda" subtitle="Ringkasan operasional hari ini">
      <DashboardSummary session={session} />
    </FounderShell>
  );
}
