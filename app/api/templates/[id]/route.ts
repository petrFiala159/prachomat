import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.invoiceTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const template = await db.invoiceTemplate.update({
    where: { id },
    data: {
      name: data.name,
      hoursWorked: Number(data.hoursWorked),
      hourlyRate: Number(data.hourlyRate),
      note: data.note ?? null,
      dueDays: Number(data.dueDays ?? 14),
      clientId: data.clientId,
    },
  });
  return NextResponse.json(template);
}
