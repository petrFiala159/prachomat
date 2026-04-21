import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

  let token = invoice.publicToken;
  if (!token) {
    token = randomBytes(16).toString("hex");
    await db.invoice.update({ where: { id }, data: { publicToken: token } });
  }
  return NextResponse.json({ token });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.invoice.update({ where: { id }, data: { publicToken: null } });
  return NextResponse.json({ ok: true });
}
