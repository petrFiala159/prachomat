import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const client = await db.client.update({
    where: { id },
    data: {
      name: data.name,
      street: data.street,
      city: data.city,
      zip: data.zip,
      ico: data.ico,
      dic: data.dic || null,
      email: data.email || null,
      hourlyRate: Number(data.hourlyRate) || 0,
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
