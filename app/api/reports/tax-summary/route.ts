import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function fmtNum(n: number) {
  return n.toFixed(2).replace(".", ",");
}

function escCsv(s: string) {
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [invoices, receipts] = await Promise.all([
    db.invoice.findMany({
      where: { issueDate: { gte: yearStart, lt: yearEnd } },
      include: { client: true },
      orderBy: { issueDate: "asc" },
    }),
    db.receipt.findMany({
      where: { date: { gte: yearStart, lt: yearEnd }, status: { in: ["approved", "sent"] } },
      orderBy: { date: "asc" },
    }),
  ]);

  const totalIncome = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.totalAmount, 0);
  const vatOutput = invoices.reduce((s, i) => s + i.vatAmount, 0);
  const vatInput = receipts.reduce((s, r) => s + r.vatAmount, 0);
  const vatToPay = Math.max(vatOutput - vatInput, 0);

  let csv = "\uFEFF"; // BOM for Excel UTF-8
  csv += `Daňový přehled ${year};;;\n`;
  csv += `Vygenerováno;${new Date().toLocaleDateString("cs-CZ")};;\n\n`;

  csv += "SOUHRN;;;\n";
  csv += `Fakturováno celkem;${fmtNum(totalIncome)};Kč;\n`;
  csv += `Zaplaceno;${fmtNum(totalPaid)};Kč;\n`;
  csv += `DPH na výstupu (faktury);${fmtNum(vatOutput)};Kč;\n`;
  csv += `DPH na vstupu (účtenky);${fmtNum(vatInput)};Kč;\n`;
  csv += `DPH k platbě;${fmtNum(vatToPay)};Kč;\n\n`;

  csv += "FAKTURY;;;;;;;\n";
  csv += "Číslo;Datum;Odběratel;IČ;Základ;DPH;Celkem;Stav\n";
  for (const inv of invoices) {
    const base = inv.totalAmount - inv.vatAmount;
    csv += [
      inv.number,
      new Date(inv.issueDate).toLocaleDateString("cs-CZ"),
      escCsv(inv.client.name),
      inv.client.ico,
      fmtNum(base),
      fmtNum(inv.vatAmount),
      fmtNum(inv.totalAmount),
      inv.status,
    ].join(";") + "\n";
  }

  csv += "\nÚČTENKY;;;;;\n";
  csv += "Datum;Prodejce;IČ;Základ;DPH;Celkem\n";
  for (const r of receipts) {
    csv += [
      new Date(r.date).toLocaleDateString("cs-CZ"),
      escCsv(r.vendor),
      r.vendorIco ?? "",
      fmtNum(r.vatBase),
      fmtNum(r.vatAmount),
      fmtNum(r.totalAmount),
    ].join(";") + "\n";
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="danovy-prehled-${year}.csv"`,
    },
  });
}
