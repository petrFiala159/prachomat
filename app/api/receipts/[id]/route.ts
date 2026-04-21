import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { deleteScan } from "@/lib/receipt-storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const includeScan = req.nextUrl.searchParams.get("scan") === "1";
  const receipt = await db.receipt.findUnique({ where: { id } });
  if (!receipt) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
  if (!includeScan) {
    const { scan: _scan, ...rest } = receipt;
    void _scan;
    return NextResponse.json(rest);
  }
  return NextResponse.json(receipt);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  const update: Record<string, unknown> = {};
  if (data.date !== undefined) update.date = new Date(data.date);
  if (data.vendor !== undefined) update.vendor = data.vendor;
  if (data.vendorIco !== undefined) update.vendorIco = data.vendorIco || null;
  if (data.vendorDic !== undefined) update.vendorDic = data.vendorDic || null;
  if (data.totalAmount !== undefined) update.totalAmount = Number(data.totalAmount);
  if (data.vatBase !== undefined) update.vatBase = Number(data.vatBase);
  if (data.vatAmount !== undefined) update.vatAmount = Number(data.vatAmount);
  if (data.vatRate !== undefined) update.vatRate = Number(data.vatRate);
  if (data.items !== undefined) update.items = typeof data.items === "string" ? data.items : JSON.stringify(data.items);
  if (data.note !== undefined) update.note = data.note || null;
  if (data.category !== undefined) update.category = data.category;
  if (data.tags !== undefined) update.tags = data.tags;

  if (data.status === "approved") {
    update.status = "approved";
    update.approvedAt = new Date();
  } else if (data.status !== undefined) {
    update.status = data.status;
  }

  const receipt = await db.receipt.update({ where: { id }, data: update });
  return NextResponse.json({ id: receipt.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const receipt = await db.receipt.findUnique({ where: { id }, select: { scanPath: true } });
  if (receipt?.scanPath) {
    await deleteScan(receipt.scanPath);
  }
  await db.receipt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
