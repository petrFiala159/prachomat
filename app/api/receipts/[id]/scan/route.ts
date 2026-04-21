import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { readScan } from "@/lib/receipt-storage";

// Vrátí binární scan účtenky. Fallback: legacy base64 z pole Receipt.scan.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const receipt = await db.receipt.findUnique({
    where: { id },
    select: { scan: true, scanPath: true, mimeType: true },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
  }

  // Nová cesta — ze souborového systému
  if (receipt.scanPath) {
    try {
      const buf = await readScan(receipt.scanPath);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": receipt.mimeType,
          "Cache-Control": "private, max-age=86400",
        },
      });
    } catch {
      return NextResponse.json({ error: "Scan se nepodařilo načíst." }, { status: 500 });
    }
  }

  // Legacy — base64 v DB
  if (receipt.scan) {
    const base64 = receipt.scan.replace(/^data:[^;]+;base64,/, "");
    const buf = Buffer.from(base64, "base64");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": receipt.mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  return NextResponse.json({ error: "Scan není k dispozici." }, { status: 404 });
}
