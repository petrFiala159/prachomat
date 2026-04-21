import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";

export async function POST() {
  const now = new Date();

  const templates = await db.invoiceTemplate.findMany({
    where: {
      recurring: true,
      active: true,
      nextRunAt: { lte: now },
    },
  });

  if (templates.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  const supplier = await db.supplier.findFirst();
  if (!supplier) {
    return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  }

  const created: string[] = [];

  for (const t of templates) {
    const base = t.hoursWorked * t.hourlyRate;
    const vatRate = supplier.vatPayer ? (supplier.vatRate ?? 21) : 0;
    const vatAmount = Math.round(base * vatRate / 100);
    const totalAmount = base + vatAmount;

    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + t.dueDays);

    const number = await nextInvoiceNumber();

    const invoice = await db.invoice.create({
      data: {
        number,
        issueDate: now,
        dueDate,
        hoursWorked: t.hoursWorked,
        hourlyRate: t.hourlyRate,
        vatRate,
        vatAmount,
        totalAmount,
        status: "DRAFT",
        note: t.note,
        supplierId: supplier.id,
        clientId: t.clientId,
        items: {
          create: [{
            description: t.note || "Odpracované hodiny",
            quantity: t.hoursWorked,
            unit: "h",
            unitPrice: t.hourlyRate,
            vatRate,
            order: 0,
          }],
        },
      },
    });

    // Naplánuj další běh
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + t.intervalDays);

    await db.invoiceTemplate.update({
      where: { id: t.id },
      data: { lastRunAt: now, nextRunAt: nextRun },
    });

    created.push(invoice.number);
  }

  return NextResponse.json({ generated: created.length, invoices: created });
}
