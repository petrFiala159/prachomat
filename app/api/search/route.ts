import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ invoices: [], clients: [], receipts: [] });
  }

  const needle = q.toLowerCase();

  // Invoice search: number, note, client name, amount
  // SQLite LIKE je case-insensitive pro ASCII. Pro jistotu hledáme v contains
  // (Prisma LIKE přes contains je case-sensitive v SQLite, proto filterujeme v JS)
  const [invoices, clients, receipts] = await Promise.all([
    db.invoice.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
      take: 200,
    }),
    db.client.findMany({ orderBy: { name: "asc" }, take: 200 }),
    db.receipt.findMany({
      orderBy: { date: "desc" },
      take: 200,
      select: {
        id: true,
        vendor: true,
        vendorIco: true,
        date: true,
        totalAmount: true,
        status: true,
      },
    }),
  ]);

  const asNumber = Number(q.replace(/[^\d.]/g, ""));
  const hasNumber = !isNaN(asNumber) && asNumber > 0;

  const invoiceMatches = invoices
    .filter((inv) => {
      return (
        inv.number.toLowerCase().includes(needle) ||
        (inv.note?.toLowerCase().includes(needle) ?? false) ||
        inv.client.name.toLowerCase().includes(needle) ||
        (hasNumber && Math.abs(inv.totalAmount - asNumber) < 1)
      );
    })
    .slice(0, 15)
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      clientName: inv.client.name,
      totalAmount: inv.totalAmount,
      currency: inv.currency,
      status: inv.status,
      issueDate: inv.issueDate,
    }));

  const clientMatches = clients
    .filter((c) =>
      c.name.toLowerCase().includes(needle) ||
      c.ico.includes(needle) ||
      (c.email?.toLowerCase().includes(needle) ?? false) ||
      c.city.toLowerCase().includes(needle)
    )
    .slice(0, 10)
    .map((c) => ({ id: c.id, name: c.name, ico: c.ico, city: c.city }));

  const receiptMatches = receipts
    .filter((r) => {
      return (
        r.vendor.toLowerCase().includes(needle) ||
        (r.vendorIco?.includes(needle) ?? false) ||
        (hasNumber && Math.abs(r.totalAmount - asNumber) < 1)
      );
    })
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      vendor: r.vendor,
      date: r.date,
      totalAmount: r.totalAmount,
      status: r.status,
    }));

  return NextResponse.json({
    invoices: invoiceMatches,
    clients: clientMatches,
    receipts: receiptMatches,
  });
}
