import PDFDocument from "pdfkit";
import { computeTotals, formatInvoiceDate, lineNet, lineTax, normalizeNewlines, rupiah, type InvoiceCompany, type InvoiceLine } from "@/lib/domain/invoice";

export type InvoicePdfInput = {
  number: string; issuedAt: string; dueDate: string;
  buyerName: string; buyerPhone: string; buyerAddress: string;
  lines: InvoiceLine[]; deliveryFee: number; paid: number; notes: string; company: InvoiceCompany;
};

const M = 40, W = 595.28 - 2 * M, BOTTOM = 841.89 - 50;
const INK = "#222222", MUTED = "#666666", RULE = "#cccccc", HEAD = "#f0ece4";
// Column widths sum to W (515.28): Produk, Deskripsi, Qty, Harga, Disc, Pajak, Jumlah.
const COLS = [85, 113, 30, 75, 62, 70, 80.28];
const HEADS = ["Produk", "Deskripsi", "Qty", "Harga", "Disc", "Pajak", "Jumlah"];
const colX = COLS.map((_, i) => M + COLS.slice(0, i).reduce((a, b) => a + b, 0));

export function renderInvoicePdf(inv: InvoicePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `Invoice ${inv.number}`, Author: inv.company.name } });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const t = computeTotals(inv);
  const co = inv.company;
  const text = (s: string, x: number, y: number, o: PDFKit.Mixins.TextOptions & { font?: string; size?: number; color?: string } = {}) => {
    const { font = "Helvetica", size = 9, color = INK, ...rest } = o;
    doc.font(font).fontSize(size).fillColor(color).text(normalizeNewlines(s), x, y, rest);
  };
  const h = (s: string, w: number, size = 9, font = "Helvetica") => (s ? doc.font(font).fontSize(size).heightOfString(normalizeNewlines(s), { width: w }) : 0);

  // Header: circular logo top-left, title block top-right.
  let logoDrawn = false;
  if (co.logoBase64) {
    try {
      doc.save().circle(M + 32, M + 32, 32).clip();
      doc.image(Buffer.from(co.logoBase64, "base64"), M, M, { cover: [64, 64], align: "center", valign: "center" });
      doc.restore();
      logoDrawn = true;
    } catch { doc.restore(); }
  }
  if (!logoDrawn) text(co.name, M, M + 20, { font: "Helvetica-Bold", size: 14, width: 200 });
  text("Invoice", M, M, { font: "Helvetica-Bold", size: 24, width: W, align: "right" });
  const meta: [string, string][] = [["Referensi", inv.number], ["Tanggal", formatInvoiceDate(inv.issuedAt)], ["Tgl. Jatuh Tempo", formatInvoiceDate(inv.dueDate)]];
  meta.forEach(([k, v], i) => {
    text(k, M + W - 230, M + 36 + i * 14, { color: MUTED, width: 100 });
    text(v, M + W - 125, M + 36 + i * 14, { font: "Helvetica-Bold", width: 125, align: "right" });
  });

  // Two info blocks.
  let y = M + 100;
  const half = W / 2 - 10;
  const block = (title: string, lines: string[], x: number) => {
    text(title, x, y, { font: "Helvetica-Bold", size: 10, width: half });
    doc.moveTo(x, y + 14).lineTo(x + half, y + 14).strokeColor(RULE).lineWidth(0.5).stroke();
    const body = lines.filter(Boolean).join("\n");
    text(body, x, y + 20, { width: half });
    return 20 + h(body, half);
  };
  const coLines = [co.name, co.address, co.phone && `Telp: ${co.phone}`, co.email, co.instagram && `Instagram: ${co.instagram}`];
  const buyerLines = [inv.buyerName, inv.buyerAddress, inv.buyerPhone && `Telp: ${inv.buyerPhone}`];
  y += Math.max(block("Info Perusahaan", coLines, M), block("Tagihan Untuk", buyerLines, M + W / 2 + 10)) + 20;

  // Table, page-break safe: header repeats on every page.
  const tableHead = () => {
    doc.rect(M, y, W, 20).fill(HEAD);
    HEADS.forEach((s, i) => text(s, colX[i] + 4, y + 6, { font: "Helvetica-Bold", width: COLS[i] - 8, align: i >= 2 ? "right" : "left" }));
    y += 20;
  };
  tableHead();
  for (const l of inv.lines) {
    const cells = [l.name, l.description, String(l.quantity), rupiah(l.unitPrice), l.discount ? rupiah(l.discount) : "-", lineTax(l) ? rupiah(lineTax(l)) : "-", rupiah(lineNet(l))];
    const rowH = Math.max(...cells.map((c, i) => h(c, COLS[i] - 8))) + 12;
    if (y + rowH > BOTTOM) { doc.addPage(); y = M; tableHead(); }
    cells.forEach((c, i) => text(c, colX[i] + 4, y + 6, { width: COLS[i] - 8, align: i >= 2 ? "right" : "left" }));
    y += rowH;
    doc.moveTo(M, y).lineTo(M + W, y).strokeColor(RULE).lineWidth(0.5).stroke();
  }

  // Summary (right) + notes (left); keep together on one page.
  const sumRows: [string, number, boolean][] = [["Subtotal", t.subtotal, false], ["Pajak", t.tax, false], ["Ongkir", t.deliveryFee, false], ["Total", t.total, true], ["Lunas", t.paid, false], ["Jumlah Tertagih", t.amountDue, true]];
  const notesText = [co.paymentInfo && `Info pembayaran:\n${co.paymentInfo}`, inv.notes].filter(Boolean).join("\n\n");
  const notesW = W - 230;
  const blockH = Math.max(sumRows.length * 18, 16 + h(notesText, notesW)) + 20;
  const signH = 110;
  if (y + 16 + blockH + signH > BOTTOM) { doc.addPage(); y = M; tableHead(); }
  y += 16;
  if (notesText) {
    text("Keterangan", M, y, { font: "Helvetica-Bold", size: 10, width: notesW });
    text(notesText, M, y + 16, { width: notesW });
  }
  sumRows.forEach(([k, v, bold], i) => {
    const font = bold ? "Helvetica-Bold" : "Helvetica", ry = y + i * 18;
    text(k, M + W - 210, ry, { font, width: 100 });
    text(rupiah(v), M + W - 110, ry, { font, width: 110, align: "right" });
  });
  y += blockH;

  // Bottom-right: date, signature space, company name.
  const sx = M + W - 180;
  text(formatInvoiceDate(inv.issuedAt), sx, y, { width: 180, align: "center" });
  doc.moveTo(sx + 20, y + 70).lineTo(sx + 160, y + 70).strokeColor(INK).lineWidth(0.5).stroke();
  text(co.signatureName || co.name, sx, y + 76, { font: "Helvetica-Bold", width: 180, align: "center" });
  if (co.signatureName) text(co.name, sx, y + 90, { color: MUTED, width: 180, align: "center" });

  // Footer on every page: invoice number + page x/y (margin zeroed so text below it doesn't spawn a page).
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    text(`${inv.number} · hal ${i + 1}/${count}`, M, 841.89 - 30, { color: MUTED, size: 8, width: W, align: "center", lineBreak: false });
  }
  doc.end();
  return done;
}
