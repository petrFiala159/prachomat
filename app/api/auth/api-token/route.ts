import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const supplier = await db.supplier.findFirst({ select: { apiToken: true } });
  return NextResponse.json({ token: supplier?.apiToken ?? null });
}

export async function POST() {
  const supplier = await db.supplier.findFirst();
  if (!supplier) return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });

  const token = `pcm_${randomBytes(24).toString("hex")}`;
  await db.supplier.update({
    where: { id: supplier.id },
    data: { apiToken: token },
  });

  return NextResponse.json({ token });
}

export async function DELETE() {
  const supplier = await db.supplier.findFirst();
  if (!supplier) return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  await db.supplier.update({
    where: { id: supplier.id },
    data: { apiToken: null },
  });
  return NextResponse.json({ ok: true });
}
