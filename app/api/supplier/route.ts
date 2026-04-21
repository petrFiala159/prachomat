import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const supplier = await db.supplier.findFirst();
  return NextResponse.json(supplier);
}

export async function POST(req: Request) {
  const data = await req.json();
  const existing = await db.supplier.findFirst();
  const supplier = existing
    ? await db.supplier.update({ where: { id: existing.id }, data })
    : await db.supplier.create({ data });
  return NextResponse.json(supplier);
}
