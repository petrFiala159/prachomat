import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = await db.invoiceTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Šablona nenalezena" }, { status: 404 });

  const supplier = await db.supplier.findFirst();
  if (!supplier) return NextResponse.json({ error: "Nejdřív vyplň údaje v Nastavení" }, { status: 400 });

  const base = template.hoursWorked * template.hourlyRate;
  const vatRate = supplier.vatPayer ? (supplier.vatRate ?? 21) : 0;
  const vatAmount = Math.round(base * vatRate / 100);
  const totalAmount = base + vatAmount;

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + template.dueDays);

  const number = await nextInvoiceNumber();

  const invoice = await db.invoice.create({
    data: {
      number,
      issueDate: now,
      dueDate,
      hoursWorked: template.hoursWorked,
      hourlyRate: template.hourlyRate,
      vatRate,
      vatAmount,
      totalAmount,
      status: "DRAFT",
      note: template.note,
      supplierId: supplier.id,
      clientId: template.clientId,
      items: {
        create: [{
          description: template.note || "Odpracované hodiny",
          quantity: template.hoursWorked,
          unit: "h",
          unitPrice: template.hourlyRate,
          vatRate,
          order: 0,
        }],
      },
    },
  });

  return NextResponse.json({ id: invoice.id, number: invoice.number });
}
