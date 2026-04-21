import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const source = await db.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { order: "asc" } } },
  });

  if (!source) {
    return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
  }

  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const number = await nextInvoiceNumber();

  const invoice = await db.invoice.create({
    data: {
      number,
      issueDate,
      dueDate,
      hoursWorked: source.hoursWorked,
      hourlyRate: source.hourlyRate,
      vatRate: source.vatRate,
      vatAmount: source.vatAmount,
      totalAmount: source.totalAmount,
      status: "DRAFT",
      note: source.note,
      currency: source.currency,
      supplierId: source.supplierId,
      clientId: source.clientId,
      items: source.items.length > 0 ? {
        create: source.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          vatRate: it.vatRate,
          order: it.order,
        })),
      } : undefined,
    },
  });

  return NextResponse.json(invoice);
}
