import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";

// Vyúčtovací faktura ze zálohové
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const deposit = await db.invoice.findUnique({ where: { id } });
  if (!deposit) return NextResponse.json({ error: "Záloha nenalezena" }, { status: 404 });
  if (deposit.invoiceType !== "deposit") {
    return NextResponse.json({ error: "Tato faktura není zálohová" }, { status: 400 });
  }

  const totalHours = Number(body.hoursWorked);
  const rate = deposit.hourlyRate;
  const fullBase = totalHours * rate;
  const vatRate = deposit.vatRate;
  const fullVat = Math.round(fullBase * vatRate / 100);
  const fullTotal = fullBase + fullVat;

  // Odečteme zálohu
  const settlementTotal = fullTotal - deposit.totalAmount;
  const settlementBase = fullBase - (deposit.totalAmount - deposit.vatAmount);
  const settlementVat = fullVat - deposit.vatAmount;

  const number = await nextInvoiceNumber();
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 14);

  const invoice = await db.invoice.create({
    data: {
      number,
      issueDate: now,
      dueDate,
      hoursWorked: totalHours,
      hourlyRate: rate,
      vatRate,
      vatAmount: settlementVat > 0 ? settlementVat : 0,
      totalAmount: settlementTotal > 0 ? settlementTotal : 0,
      status: "DRAFT",
      invoiceType: "settlement",
      depositInvoiceId: deposit.id,
      note: body.note ?? `Vyúčtování zálohy ${deposit.number}`,
      supplierId: deposit.supplierId,
      clientId: deposit.clientId,
      items: {
        create: [
          {
            description: body.note || `Vyúčtování — ${totalHours} h`,
            quantity: totalHours,
            unit: "h",
            unitPrice: rate,
            vatRate,
            order: 0,
          },
          {
            description: `Odpočet zálohy ${deposit.number}`,
            quantity: 1,
            unit: "ks",
            unitPrice: -(deposit.totalAmount - deposit.vatAmount),
            vatRate,
            order: 1,
          },
        ],
      },
    },
  });

  return NextResponse.json({ id: invoice.id, number: invoice.number });
}
