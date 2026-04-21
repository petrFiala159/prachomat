import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { saveDocument, buildDocPath } from "@/lib/document-storage";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const category = req.nextUrl.searchParams.get("category");

  const documents = await db.document.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(category ? { category } : {}),
    },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: Request) {
  const data = await req.json();

  if (!data.title || !data.filename || !data.fileContent) {
    return NextResponse.json({ error: "Chybí title, filename nebo fileContent" }, { status: 400 });
  }

  const mimeType = data.mimeType ?? "application/pdf";

  // Nejprve vytvoř záznam pro získání ID
  const placeholder = await db.document.create({
    data: {
      title: data.title,
      category: data.category ?? "contract",
      filename: data.filename,
      mimeType,
      storagePath: "",
      fileSize: 0,
      note: data.note ?? null,
      tags: data.tags ?? "",
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      clientId: data.clientId || null,
    },
  });

  const storagePath = buildDocPath(placeholder.id, mimeType);
  const fileSize = await saveDocument(storagePath, data.fileContent);

  const document = await db.document.update({
    where: { id: placeholder.id },
    data: { storagePath, fileSize },
  });

  return NextResponse.json({ id: document.id });
}
