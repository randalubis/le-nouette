import { NextRequest } from "next/server";
import { getInvoice } from "@/lib/db/invoices";
import { exportAuthError } from "@/lib/export-guard";
import { FOUNDER_SESSION_COOKIE } from "@/lib/founder-auth";
import { renderInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = exportAuthError(request.cookies.get(FOUNDER_SESSION_COOKIE)?.value);
  if (denied) return denied;
  const { id } = await params;
  const row = /^\d+$/.test(id) ? await getInvoice(Number(id)) : null;
  if (!row) return new Response("Not found", { status: 404 });
  const pdf = await renderInvoicePdf(row);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${row.number.replaceAll("/", "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
