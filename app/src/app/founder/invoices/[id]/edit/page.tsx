import { notFound, redirect } from "next/navigation";
import { FounderShell } from "@/components/founder-shell";
import { InvoiceWizard } from "@/components/invoice-wizard";
import { getInvoice } from "@/lib/db/invoices";
import { canEditInvoice } from "@/lib/domain/invoice";
import { jakartaNow } from "@/lib/domain/schedule";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = /^\d+$/.test(id) ? await getInvoice(Number(id)) : null;
  if (!row) notFound();
  if (!canEditInvoice(row)) redirect("/founder/invoices?msg=locked");
  const { buyerName, buyerPhone, buyerAddress, lines, deliveryFee, paid, notes, issuedAt, dueDate, number, orderId } = row;
  return (
    <FounderShell active="Invoice" title="Edit Invoice" subtitle={number}>
      <InvoiceWizard orders={[]} initialOrderId={null} today={jakartaNow(new Date()).date} defaultNotes=""
        invoice={{ id: row.id, number, orderId, buyerName, buyerPhone, buyerAddress, lines, deliveryFee, paid, notes, issuedAt, dueDate }} />
    </FounderShell>
  );
}
