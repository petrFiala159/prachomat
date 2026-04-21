import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type Entry = {
  vendor?: string;
  vendorIco?: string | null;
  vendorDic?: string | null;
  date?: string;
  totalAmount?: number;
  vatBase?: number;
  vatAmount?: number;
  vatRate?: number;
  items?: unknown;
  note?: string | null;
  category?: string;
};

// Finalizuje účtenku — pokud má více sub-entries, rozdělí do samostatných záznamů.
// Body: { entries: Entry[], approve: boolean }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const entries: Entry[] = Array.isArray(body.entries) ? body.entries : [];
  const approve: boolean = Boolean(body.approve);

  if (entries.length === 0) {
    return NextResponse.json({ error: "Žádné účtenky k uložení" }, { status: 400 });
  }

  const source = await db.receipt.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

  const statusValue = approve ? "approved" : source.status;
  const approvedAt = approve ? new Date() : source.approvedAt;

  // Aktualizuj hlavní záznam s první entry
  const first = entries[0];
  await db.receipt.update({
    where: { id },
    data: {
      date: first.date ? new Date(first.date) : source.date,
      vendor: first.vendor ?? "",
      vendorIco: first.vendorIco ?? null,
      vendorDic: first.vendorDic ?? null,
      totalAmount: Number(first.totalAmount ?? 0),
      vatBase: Number(first.vatBase ?? 0),
      vatAmount: Number(first.vatAmount ?? 0),
      vatRate: Number(first.vatRate ?? 21),
      items: typeof first.items === "string" ? first.items : JSON.stringify(first.items ?? []),
      note: first.note ?? null,
      category: first.category ?? "other",
      status: statusValue,
      approvedAt,
      draftEntries: null,
    },
  });

  // Pro zbytek entries vytvoř samostatné záznamy se stejným scanem
  const createdIds: string[] = [id];
  for (let i = 1; i < entries.length; i++) {
    const e = entries[i];
    const r = await db.receipt.create({
      data: {
        date: e.date ? new Date(e.date) : source.date,
        scan: source.scan,
        scanPath: source.scanPath,
        mimeType: source.mimeType,
        vendor: e.vendor ?? "",
        vendorIco: e.vendorIco ?? null,
        vendorDic: e.vendorDic ?? null,
        totalAmount: Number(e.totalAmount ?? 0),
        vatBase: Number(e.vatBase ?? 0),
        vatAmount: Number(e.vatAmount ?? 0),
        vatRate: Number(e.vatRate ?? 21),
        items: typeof e.items === "string" ? e.items : JSON.stringify(e.items ?? []),
        note: e.note ?? null,
        category: e.category ?? "other",
        status: statusValue,
        approvedAt,
      },
    });
    createdIds.push(r.id);
  }

  return NextResponse.json({ ids: createdIds, count: entries.length });
}
