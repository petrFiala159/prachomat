import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";

// Vytvoří opravný daňový doklad (dobropis) — záporné položky původní faktury
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

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 14);
  const number = await nextInvoiceNumber();

  // Připrav items — vždy negated. Pokud chybí items, vygeneruj z legacy polí.
  const sourceItems = source.items.length > 0
    ? source.items
    : [{
        description: source.note || "Odpracované hodiny",
        quantity: source.hoursWorked,
        unit: "h",
        unitPrice: source.hourlyRate,
        vatRate: source.vatRate,
        order: 0,
      }];

  const creditItems = sourceItems.map((it, idx) => ({
    description: `Storno: ${it.description}`,
    quantity: it.quantity,
    unit: it.unit,
    unitPrice: -it.unitPrice, // negated cena
    vatRate: it.vatRate,
    order: idx,
  }));

  const credit = await db.invoice.create({
    data: {
      number,
      issueDate: now,
      dueDate,
      hoursWorked: -source.hoursWorked,
      hourlyRate: source.hourlyRate,
      vatRate: source.vatRate,
      vatAmount: -source.vatAmount,
      totalAmount: -source.totalAmount,
      status: "DRAFT",
      invoiceType: "credit",
      currency: source.currency,
      note: `Dobropis k faktuře ${source.number}`,
      supplierId: source.supplierId,
      clientId: source.clientId,
      depositInvoiceId: source.id,
      items: { create: creditItems },
    },
  });

  return NextResponse.json({ id: credit.id, number: credit.number });
}
