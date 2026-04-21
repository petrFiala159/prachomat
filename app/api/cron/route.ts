import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";

// GET /api/cron?secret=XXX
// Spouští se externím cronem (GitHub Actions, Vercel Cron, cronjob.org).
// Provede:
// 1. Generování opakovaných faktur ze šablon (nextRunAt <= now)
// 2. Označení SENT faktur jako OVERDUE (dueDate < now)
// 3. Automatické upomínky pro faktury X dní po splatnosti
// 4. ARES check změn (volitelně, 1× týdně)

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const supplier = await db.supplier.findFirst();

  // Ověření tajemství
  if (supplier?.cronSecret && secret !== supplier.cronSecret) {
    return NextResponse.json({ error: "Neplatný cron secret" }, { status: 403 });
  }

  const now = new Date();
  const results: Record<string, unknown> = { timestamp: now.toISOString() };

  // 1. Recurring faktury
  const templates = await db.invoiceTemplate.findMany({
    where: { recurring: true, active: true, nextRunAt: { lte: now } },
  });
  let recurringCreated = 0;
  if (templates.length > 0 && supplier) {
    const vatRate = supplier.vatPayer ? (supplier.vatRate ?? 21) : 0;
    for (const t of templates) {
      const base = t.hoursWorked * t.hourlyRate;
      const vatAmount = Math.round(base * vatRate / 100);
      const totalAmount = base + vatAmount;
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + t.dueDays);
      const number = await nextInvoiceNumber();

      await db.invoice.create({
        data: {
          number, issueDate: now, dueDate,
          hoursWorked: t.hoursWorked, hourlyRate: t.hourlyRate,
          vatRate, vatAmount, totalAmount,
          status: "DRAFT", note: t.note,
          supplierId: supplier.id, clientId: t.clientId,
          items: {
            create: [{
              description: t.note || "Odpracované hodiny",
              quantity: t.hoursWorked, unit: "h", unitPrice: t.hourlyRate,
              vatRate, order: 0,
            }],
          },
        },
      });

      const nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + t.intervalDays);
      await db.invoiceTemplate.update({ where: { id: t.id }, data: { lastRunAt: now, nextRunAt: nextRun } });
      recurringCreated++;
    }
  }
  results.recurringCreated = recurringCreated;

  // 2. SENT → OVERDUE
  const overdue = await db.invoice.updateMany({
    where: { status: "SENT", dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });
  results.markedOverdue = overdue.count;

  // 3. Auto-upomínky
  const remindDays = supplier?.autoRemindAfterDays ?? 0;
  let remindsSent = 0;
  if (remindDays > 0) {
    const remindCutoff = new Date(now);
    remindCutoff.setDate(remindCutoff.getDate() - remindDays);

    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: "OVERDUE",
        dueDate: { lt: remindCutoff },
      },
      include: { client: true },
    });

    const origin = req.nextUrl.origin;
    for (const inv of overdueInvoices) {
      if (!inv.client.email) continue;
      try {
        const res = await fetch(`${origin}/api/invoices/${inv.id}/remind`, { method: "POST" });
        if (res.ok) remindsSent++;
      } catch { /* ignore */ }
    }
  }
  results.remindersSent = remindsSent;

  // Log
  await db.auditLog.create({
    data: {
      action: "cron",
      entityType: "system",
      entityId: "cron",
      summary: `Cron: ${recurringCreated} recurring, ${overdue.count} overdue, ${remindsSent} upomínek`,
    },
  });

  return NextResponse.json(results);
}
