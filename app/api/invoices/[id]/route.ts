import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { calcTotals, type ItemInput } from "@/lib/invoice-items";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      supplier: true,
      items: { orderBy: { order: "asc" } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
  return NextResponse.json(invoice);
}

type PatchPayload = {
  clientId?: string;
  issueDate?: string;
  dueDate?: string;
  note?: string | null;
  currency?: string;
  reverseCharge?: boolean;
  language?: string;
  tags?: string;
  items?: ItemInput[];
  // Legacy
  hoursWorked?: number | string;
  hourlyRate?: number | string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data: PatchPayload = await req.json();

  const existing = await db.invoice.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!existing) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

  const supplierVatRate = existing.supplier.vatPayer ? (existing.supplier.vatRate ?? 21) : 0;

  // Připrav items — buď explicitní, nebo z legacy polí
  let items: ItemInput[] = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0 && data.hoursWorked && data.hourlyRate) {
    items = [{
      description: data.note?.trim() || "Odpracované hodiny",
      quantity: Number(data.hoursWorked),
      unit: "h",
      unitPrice: Number(data.hourlyRate),
      vatRate: supplierVatRate,
      order: 0,
    }];
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Faktura musí mít alespoň jednu položku." }, { status: 400 });
  }

  const totals = calcTotals(items);
  const allHours = items.every((i) => i.unit === "h");
  const totalHours = allHours ? items.reduce((s, i) => s + i.quantity, 0) : 0;
  const avgRate = allHours && totalHours > 0 ? totals.base / totalHours : 0;
  const dominantRate = items[0].vatRate;

  // Smaž staré položky a vytvoř nové (nejjednodušší správný postup)
  await db.invoiceItem.deleteMany({ where: { invoiceId: id } });

  const invoice = await db.invoice.update({
    where: { id },
    data: {
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      note: data.note ?? null,
      clientId: data.clientId ?? undefined,
      currency: data.currency ?? undefined,
      reverseCharge: data.reverseCharge ?? undefined,
      language: data.language ?? undefined,
      tags: data.tags ?? undefined,
      hoursWorked: totalHours,
      hourlyRate: avgRate,
      vatRate: dominantRate,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      items: {
        create: items.map((it, idx) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit ?? "h",
          unitPrice: Number(it.unitPrice),
          vatRate: Number(it.vatRate ?? supplierVatRate),
          order: typeof it.order === "number" ? it.order : idx,
        })),
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      action: "updated",
      entityType: "invoice",
      entityId: invoice.id,
      summary: `Upravena faktura ${invoice.number}`,
    },
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inv = await db.invoice.findUnique({ where: { id }, select: { number: true } });
  await db.invoice.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      action: "deleted",
      entityType: "invoice",
      entityId: id,
      summary: inv ? `Smazána faktura ${inv.number}` : `Smazána faktura ${id}`,
    },
  });
  return NextResponse.json({ ok: true });
}
