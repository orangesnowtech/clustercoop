/**
 * Statement PDF (SERVER-ONLY) — branded, server-rendered with pd​f-lib (pure
 * JS, no font-file reads; safe under Next bundling). Simple manual table.
 */
import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { koboToNaira } from "@/lib/money";
import type { StatementRow, StatementSummary } from "./rows";

// Brand colours.
const INK = rgb(0.086, 0.094, 0.114); // #16181D
const ORANGE = rgb(1, 0.6, 0); // #FF9900
const MUTED = rgb(0.42, 0.42, 0.42);
const CREDIT = rgb(0.118, 0.557, 0.353); // #1E8E5A
const DEBIT = rgb(0.784, 0.267, 0.169); // #C8442B
const BORDER = rgb(0.9, 0.89, 0.875);

function naira(kobo: number): string {
  return "NGN " + koboToNaira(kobo).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface StatementPdfInput {
  client: { uid: string; email: string | null };
  rows: StatementRow[];
  summary: StatementSummary;
  generatedOn: string; // YYYY-MM-DD
}

export async function renderStatementPdf(input: StatementPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  let page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  let y = height - margin;

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: typeof font; color?: typeof INK } = {},
  ) => page.drawText(s, { x, y: yy, size: opts.size ?? 9, font: opts.font ?? font, color: opts.color ?? INK });

  // Header
  text("cluster", margin, y, { size: 22, font: bold, color: INK });
  page.drawRectangle({ x: margin + 78, y: y + 3, width: 8, height: 8, color: ORANGE });
  text("Account Statement", width - margin - 130, y + 6, { size: 12, font: bold, color: MUTED });
  y -= 28;
  text(`Client: ${input.client.email ?? input.client.uid}`, margin, y, { color: MUTED });
  text(`Generated: ${input.generatedOn}`, width - margin - 130, y, { color: MUTED });
  y -= 24;

  // Summary band
  page.drawRectangle({ x: margin, y: y - 44, width: width - margin * 2, height: 44, color: rgb(0.984, 0.98, 0.973) });
  text("Balance", margin + 12, y - 16, { color: MUTED });
  text(naira(input.summary.balanceKobo), margin + 12, y - 32, { size: 12, font: bold });
  text("Total in", margin + 180, y - 16, { color: MUTED });
  text(naira(input.summary.totalInKobo), margin + 180, y - 32, { font: bold, color: CREDIT });
  text("Total out", margin + 340, y - 16, { color: MUTED });
  text(naira(input.summary.totalOutKobo), margin + 340, y - 32, { font: bold, color: DEBIT });
  y -= 64;

  // Table header
  const cols = { date: margin, desc: margin + 80, inn: margin + 250, out: margin + 350, bal: margin + 450 };
  text("Date", cols.date, y, { font: bold, color: MUTED });
  text("Description", cols.desc, y, { font: bold, color: MUTED });
  text("In", cols.inn, y, { font: bold, color: MUTED });
  text("Out", cols.out, y, { font: bold, color: MUTED });
  text("Balance", cols.bal, y, { font: bold, color: MUTED });
  y -= 6;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, color: BORDER, thickness: 1 });
  y -= 16;

  if (input.rows.length === 0) {
    text("No transactions yet.", margin, y, { color: MUTED });
  }

  for (const r of input.rows) {
    if (y < margin + 40) {
      page = doc.addPage([595, 842]);
      y = height - margin;
    }
    text(r.date, cols.date, y);
    text(r.description.slice(0, 28), cols.desc, y);
    if (r.inflowKobo > 0) text(naira(r.inflowKobo), cols.inn, y, { color: CREDIT });
    if (r.outflowKobo > 0) text(naira(r.outflowKobo), cols.out, y, { color: DEBIT });
    text(naira(r.runningBalanceKobo), cols.bal, y);
    y -= 16;
  }

  // Footer
  text(
    "Cluster by Corporate Landlords — this statement is generated from the ledger and is for information only.",
    margin,
    margin - 12,
    { size: 7, color: MUTED },
  );

  return doc.save();
}
