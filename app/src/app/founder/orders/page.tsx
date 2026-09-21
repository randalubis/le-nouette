import { FounderShell } from "@/components/founder-shell";
import { OrderBoard } from "@/components/order-board";

const tabs = ["NEEDS_PREPARATION", "READY_FOR_HANDOVER", "COMPLETED", "CANCELLED"] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <FounderShell active="Pesanan" title="Pesanan" subtitle="Siapkan, serahkan, dan catat pembayaran">
      <OrderBoard initialTab={tabs.find((value) => value === tab) ?? "NEEDS_PREPARATION"} />
    </FounderShell>
  );
}
