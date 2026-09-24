import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getState } from "@/lib/db/get-state";
import { datasetKeys, datasetTable, datasets, exportFilename } from "@/lib/export";
import { jakartaNow } from "@/lib/domain/schedule";
import { FOUNDER_SESSION_COOKIE, verifySessionCookieValue } from "@/lib/founder-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!verifySessionCookieValue(request.cookies.get(FOUNDER_SESSION_COOKIE)?.value)) return new Response("Unauthorized", { status: 401 });
  const state = await getState();
  const workbook = new ExcelJS.Workbook();
  for (const key of datasetKeys) {
    const sheet = workbook.addWorksheet(datasets[key].sheet);
    const [header, ...rows] = datasetTable(key, state);
    sheet.addRow(header).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    rows.forEach((row) => sheet.addRow(row));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFilename("all", jakartaNow(new Date()).date, "xlsx")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
