import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { ids, action, status } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Žádné faktury" }, { status: 400 });
  }

  if (action === "delete") {
    await db.invoice.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true });
  }

  if (action === "status" && status) {
    await db.invoice.updateMany({ where: { id: { in: ids } }, data: { status } });
    return NextResponse.json({ ok: true });
  }

  if (action === "send") {
    const origin = new URL(req.url).origin;
    const results = await Promise.allSettled(
      ids.map((id: string) =>
        fetch(`${origin}/api/invoices/${id}/send`, { method: "POST" }).then((r) => r.json())
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled" && !("error" in (r.value ?? {}))).length;
    const failed = results.length - sent;
    return NextResponse.json({ ok: true, sent, failed });
  }

  return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
}
