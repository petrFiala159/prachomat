import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { readDocument } from "@/lib/document-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const document = await db.document.findUnique({
    where: { id },
    select: { storagePath: true, mimeType: true, filename: true },
  });
  if (!document || !document.storagePath) {
    return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
  }

  try {
    const buf = await readDocument(document.storagePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Soubor nelze načíst" }, { status: 500 });
  }
}
