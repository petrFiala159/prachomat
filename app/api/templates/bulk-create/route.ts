import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";

// Vytvoří faktury ze všech aktivních šablon (volitelně jen z vybraných ID).
// Body: { ids?: string[] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined;

  const templates = await db.invoiceTemplate.findMany({
    where: {
      active: true,
      ...(ids ? { id: { in: ids } } : {}),
    },
  });

  if (templates.length === 0) {
    return NextResponse.json({ error: "Žádné šablony nenalezeny" }, { status: 400 });
  }

  const supplier = await db.supplier.findFirst();
  if (!supplier) {
    return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  }

  const created: Array<{ templateId: string; invoiceId: string; number: string }> = [];
  const now = new Date();

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

    created.push({ templateId: t.id, invoiceId: invoice.id, number: invoice.number });
  }

  await db.auditLog.create({
    data: {
      action: "bulk_created",
      entityType: "invoice",
      entityId: "bulk",
      summary: `Hromadně vystaveno ${created.length} faktur`,
      metadata: JSON.stringify({ count: created.length, numbers: created.map((c) => c.number) }),
    },
  });

  return NextResponse.json({ created: created.length, invoices: created });
}
