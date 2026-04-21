import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const clientId = searchParams.get("client") ?? undefined;
  const year = searchParams.get("year") ?? undefined;

  const where: Parameters<typeof db.invoice.findMany>[0]["where"] = {};
  if (year) {
    const y = Number(year);
    where.issueDate = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const invoices = await db.invoice.findMany({
    where,
    orderBy: { issueDate: "desc" },
    include: { client: true },
  });

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Koncept",
    SENT: "Odesláno",
    PAID: "Zaplaceno",
    OVERDUE: "Po splatnosti",
  };

  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const fmtDate = (d: Date) => new Date(d).toLocaleDateString("cs-CZ");

  const rows = [
    ["Číslo faktury", "Klient", "Datum vystavení", "Splatnost", "Hodiny", "Základ", "DPH", "Celkem", "Stav"],
    ...invoices.map((inv) => [
      inv.number,
      inv.client.name,
      fmtDate(inv.issueDate),
      fmtDate(inv.dueDate),
      String(inv.hoursWorked),
      fmt(inv.totalAmount - inv.vatAmount),
      fmt(inv.vatAmount),
      fmt(inv.totalAmount),
      STATUS_LABELS[inv.status] ?? inv.status,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

  // BOM pro správné zobrazení češtiny v Excelu
  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="faktury-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
