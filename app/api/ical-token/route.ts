import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const supplier = await db.supplier.findFirst({ select: { icalToken: true } });
  return NextResponse.json({ token: supplier?.icalToken ?? null });
}

export async function POST() {
  const supplier = await db.supplier.findFirst();
  if (!supplier) return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });

  const token = randomBytes(16).toString("hex");
  await db.supplier.update({
    where: { id: supplier.id },
    data: { icalToken: token },
  });
  return NextResponse.json({ token });
}

export async function DELETE() {
  const supplier = await db.supplier.findFirst();
  if (!supplier) return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  await db.supplier.update({
    where: { id: supplier.id },
    data: { icalToken: null },
  });
  return NextResponse.json({ ok: true });
}
