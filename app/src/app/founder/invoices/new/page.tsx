import { FounderShell } from "@/components/founder-shell";
import { InvoiceWizard } from "@/components/invoice-wizard";
import { getState } from "@/lib/db/get-state";
import { getSettings } from "@/lib/db/settings";
import { buildInvoiceFromOrder } from "@/lib/domain/invoice";
import { jakartaNow } from "@/lib/domain/schedule";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const [state, company] = await Promise.all([getState(), getSettings()]);
  const orders = state.orders.filter((o) => o.status !== "CANCELLED").slice(-100).reverse()
    .map((o) => ({ id: o.id, label: `${o.id} · ${o.customer.name}`, draft: buildInvoiceFromOrder(o, company) }));
  return (
    <FounderShell active="Invoice" title="Buat Invoice" subtitle="Empat langkah menuju PDF">
      <InvoiceWizard orders={orders} initialOrderId={orders.some((o) => o.id === order) ? order! : null} today={jakartaNow(new Date()).date} defaultNotes={company.footerNote} />
    </FounderShell>
  );
}
