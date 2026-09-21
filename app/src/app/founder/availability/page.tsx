import { FounderShell } from "@/components/founder-shell";
import { AvailabilityBoard } from "@/components/founder-boards";

export default function Page() {
  return (
    <FounderShell active="Kalender" title="Kalender & status toko" subtitle="Tanggal operasional dan jeda pemesanan">
      <AvailabilityBoard />
    </FounderShell>
  );
}
