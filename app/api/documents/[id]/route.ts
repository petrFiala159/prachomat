import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { deleteDocument } from "@/lib/document-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const document = await db.document.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!document) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
  return NextResponse.json(document);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.category !== undefined) update.category = data.category;
  if (data.note !== undefined) update.note = data.note || null;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.validFrom !== undefined) update.validFrom = data.validFrom ? new Date(data.validFrom) : null;
  if (data.validUntil !== undefined) update.validUntil = data.validUntil ? new Date(data.validUntil) : null;
  if (data.clientId !== undefined) update.clientId = data.clientId || null;

  const document = await db.document.update({ where: { id }, data: update });
  return NextResponse.json(document);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id }, select: { storagePath: true } });
  if (doc?.storagePath) {
    await deleteDocument(doc.storagePath);
  }
  await db.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
