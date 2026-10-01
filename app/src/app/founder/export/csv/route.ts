import { NextRequest } from "next/server";
import { getState } from "@/lib/db/get-state";
import { datasetTable, exportFilename, parseDateParam, toCsv } from "@/lib/export";
import { csvDatasetOrError } from "@/lib/export-guard";
import { jakartaNow } from "@/lib/domain/schedule";
import { FOUNDER_SESSION_COOKIE } from "@/lib/founder-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Defence in depth: proxy.ts already gates /founder/*, re-verify here.
  const dataset = csvDatasetOrError(request.cookies.get(FOUNDER_SESSION_COOKIE)?.value, request.nextUrl.searchParams.get("dataset"));
  if (dataset instanceof Response) return dataset;

  const from = parseDateParam(request.nextUrl.searchParams.get("from")), to = parseDateParam(request.nextUrl.searchParams.get("to"));
  const body = toCsv(datasetTable(dataset, await getState(), from, to));
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(dataset, jakartaNow(new Date()).date, "csv", from, to)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
