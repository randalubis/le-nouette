import { FounderShell } from "@/components/founder-shell";
import { FinanceBoard } from "@/components/founder-boards";
import { getState } from "@/lib/db/get-state";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getState();
  return (
    <FounderShell active="Keuangan" title="Keuangan" subtitle="Omzet, pembayaran, dan piutang operasional">
      <FinanceBoard session={session} />
    </FounderShell>
  );
}
