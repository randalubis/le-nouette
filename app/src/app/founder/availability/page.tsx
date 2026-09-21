import { FounderShell } from "@/components/founder-shell";
import { AvailabilityBoard } from "@/components/founder-boards";
import { getState } from "@/lib/db/get-state";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getState();
  return (
    <FounderShell active="Kalender" title="Kalender & status toko" subtitle="Tanggal operasional dan jeda pemesanan">
      <AvailabilityBoard session={session} />
    </FounderShell>
  );
}
