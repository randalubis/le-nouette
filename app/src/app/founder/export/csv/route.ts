import { NextRequest } from "next/server";
import { getState } from "@/lib/db/get-state";
import { datasetTable, exportFilename, isDatasetKey, toCsv } from "@/lib/export";
import { jakartaNow } from "@/lib/domain/schedule";
import { FOUNDER_SESSION_COOKIE, verifySessionCookieValue } from "@/lib/founder-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Defence in depth: proxy.ts already gates /founder/*, re-verify here.
  if (!verifySessionCookieValue(request.cookies.get(FOUNDER_SESSION_COOKIE)?.value)) return new Response("Unauthorized", { status: 401 });
  const dataset = request.nextUrl.searchParams.get("dataset");
  if (!isDatasetKey(dataset)) return new Response("Unknown dataset", { status: 400 });

  const body = toCsv(datasetTable(dataset, await getState()));
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(dataset, jakartaNow(new Date()).date, "csv")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
