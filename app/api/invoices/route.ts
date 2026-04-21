import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { nextInvoiceNumber } from "@/lib/invoice-number";
import { calcTotals, type ItemInput } from "@/lib/invoice-items";
import { getCnbRate } from "@/lib/cnb-rates";

type Payload = {
  clientId: string;
  supplierId: string;
  issueDate: string;
  dueDate: string;
  note?: string | null;
  invoiceType?: string;
  currency?: string;
  language?: string;
  reverseCharge?: boolean;
  tags?: string;
  round?: boolean;
  items?: ItemInput[];
  // Legacy (pro kompatibilitu s AI parser a starými formuláři)
  hoursWorked?: number | string;
  hourlyRate?: number | string;
};

export async function POST(req: Request) {
  const data: Payload = await req.json();

  const supplier = await db.supplier.findUnique({ where: { id: data.supplierId } });
  const supplierVatRate = supplier?.vatPayer ? (supplier.vatRate ?? 21) : 0;

  // Reverse charge = bez DPH (přenesená daňová povinnost na zákazníka)
  const reverseCharge = Boolean(data.reverseCharge);
  const effectiveVatRate = reverseCharge ? 0 : supplierVatRate;

  // Pokud nejsou items, vytvoř jednu z legacy polí
  let items: ItemInput[] = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0 && data.hoursWorked && data.hourlyRate) {
    items = [{
      description: data.note?.trim() || "Odpracované hodiny",
      quantity: Number(data.hoursWorked),
      unit: "h",
      unitPrice: Number(data.hourlyRate),
      vatRate: effectiveVatRate,
      order: 0,
    }];
  }

  // Při reverse charge vynuluj sazbu DPH na všech položkách
  if (reverseCharge) {
    items = items.map((it) => ({ ...it, vatRate: 0 }));
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Faktura musí mít alespoň jednu položku." }, { status: 400 });
  }

  const totals = calcTotals(items, Boolean(data.round));
  const number = await nextInvoiceNumber();

  // Kurz ČNB k datu vystavení (pokud je měna ne-CZK)
  const currency = data.currency ?? "CZK";
  const issueDate = new Date(data.issueDate);
  let exchangeRate = 1;
  if (currency !== "CZK") {
    const rate = await getCnbRate(currency, issueDate);
    if (rate) exchangeRate = rate;
  }

  // Legacy reprezentace — součet hodin a průměrná sazba, pokud jsou všechny v hodinách
  const allHours = items.every((i) => i.unit === "h");
  const totalHours = allHours ? items.reduce((s, i) => s + i.quantity, 0) : 0;
  const avgRate = allHours && totalHours > 0 ? totals.base / totalHours : 0;

  // Dominantní sazba DPH (pro legacy invoice.vatRate)
  const dominantRate = items.length > 0 ? items[0].vatRate : supplierVatRate;

  const invoice = await db.invoice.create({
    data: {
      number,
      issueDate,
      dueDate: new Date(data.dueDate),
      hoursWorked: totalHours,
      hourlyRate: avgRate,
      vatRate: dominantRate,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalRounded,
      roundingAmount: totals.roundingAmount,
      status: "DRAFT",
      invoiceType: data.invoiceType ?? "regular",
      currency,
      exchangeRate,
      reverseCharge,
      language: data.language ?? "cs",
      tags: data.tags ?? "",
      note: data.note ?? null,
      supplierId: data.supplierId,
      clientId: data.clientId,
      items: {
        create: items.map((it, idx) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit ?? "h",
          unitPrice: Number(it.unitPrice),
          vatRate: Number(it.vatRate ?? effectiveVatRate),
          order: typeof it.order === "number" ? it.order : idx,
        })),
      },
    },
    include: { items: true },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      action: "created",
      entityType: "invoice",
      entityId: invoice.id,
      summary: `Vytvořena faktura ${invoice.number}`,
    },
  });

  return NextResponse.json(invoice);
}
