import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const monthParam = req.nextUrl.searchParams.get("month");

  let rangeStart: Date;
  let rangeEnd: Date;
  if (monthParam) {
    const m = Number(monthParam);
    rangeStart = new Date(year, m - 1, 1);
    rangeEnd = new Date(year, m, 1);
  } else {
    rangeStart = new Date(year, 0, 1);
    rangeEnd = new Date(year + 1, 0, 1);
  }

  const [invoices, receipts] = await Promise.all([
    db.invoice.findMany({
      where: { issueDate: { gte: rangeStart, lt: rangeEnd } },
      select: { vatAmount: true },
    }),
    db.receipt.findMany({
      where: {
        date: { gte: rangeStart, lt: rangeEnd },
        status: { in: ["approved", "sent"] },
      },
      select: { vatAmount: true },
    }),
  ]);

  const vatOutput = invoices.reduce((s, i) => s + i.vatAmount, 0);
  const vatInput = receipts.reduce((s, r) => s + r.vatAmount, 0);
  const vatToPay = Math.max(vatOutput - vatInput, 0);

  return NextResponse.json({
    invoiceCount: invoices.length,
    receiptCount: receipts.length,
    vatOutput,
    vatInput,
    vatToPay,
  });
}
