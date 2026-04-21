import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invoices = await db.invoice.findMany({
    where: { clientId: id },
    orderBy: { issueDate: "desc" },
  });

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.totalAmount, 0);
  const totalHours = invoices.reduce((s, i) => s + i.hoursWorked, 0);
  const count = invoices.length;
  const paidCount = invoices.filter((i) => i.status === "PAID").length;
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
  const avgRate = totalHours > 0 ? (totalInvoiced / totalHours) : 0;

  // Měsíční rozpad (max 12 posledních)
  const byMonth = new Map<string, { label: string; amount: number; count: number }>();
  for (const inv of invoices) {
    const d = new Date(inv.issueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const MONTHS = ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"];
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const existing = byMonth.get(key) ?? { label, amount: 0, count: 0 };
    existing.amount += inv.totalAmount;
    existing.count += 1;
    byMonth.set(key, existing);
  }
  const monthlyBreakdown = [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([, v]) => v);

  // Nejlepší měsíc
  const bestMonth = [...byMonth.values()].sort((a, b) => b.amount - a.amount)[0] ?? null;

  return NextResponse.json({
    stats: {
      count,
      paidCount,
      overdueCount,
      totalInvoiced,
      totalPaid,
      totalHours,
      avgRate,
      bestMonth,
    },
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      issueDate: i.issueDate,
      dueDate: i.dueDate,
      totalAmount: i.totalAmount,
      status: i.status,
      invoiceType: i.invoiceType,
      currency: i.currency,
    })),
    monthlyBreakdown,
  });
}
