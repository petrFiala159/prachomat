import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { ids, action } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Žádné účtenky" }, { status: 400 });
  }

  if (action === "delete") {
    const result = await db.receipt.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, count: result.count });
  }

  if (action === "approve") {
    await db.receipt.updateMany({
      where: { id: { in: ids } },
      data: { status: "approved", approvedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
}
