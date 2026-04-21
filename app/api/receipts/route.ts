import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { saveScan, buildScanPath } from "@/lib/receipt-storage";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  const status = req.nextUrl.searchParams.get("status");

  const where: { date?: { gte: Date; lt: Date }; status?: string } = {};

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  if (status) where.status = status;

  const receipts = await db.receipt.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      scan: false,
      mimeType: true,
      vendor: true,
      vendorIco: true,
      vendorDic: true,
      totalAmount: true,
      vatBase: true,
      vatAmount: true,
      vatRate: true,
      items: true,
      note: true,
      status: true,
      approvedAt: true,
      sentAt: true,
      createdAt: true,
      draftEntries: true,
    },
  });
  return NextResponse.json(receipts);
}

export async function POST(req: Request) {
  const data = await req.json();

  // Pokud jsou `draftEntries`, použij první pro hlavní pole a celé pole ulož do JSON
  const drafts: Array<Record<string, unknown>> | null = Array.isArray(data.draftEntries)
    ? (data.draftEntries as Array<Record<string, unknown>>)
    : null;
  const primary = drafts && drafts.length > 0 ? drafts[0] : data;

  const totalSum = drafts && drafts.length > 1
    ? drafts.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0)
    : Number(primary.totalAmount ?? 0);
  const vatBaseSum = drafts && drafts.length > 1
    ? drafts.reduce((s, r) => s + Number(r.vatBase ?? 0), 0)
    : Number(primary.vatBase ?? 0);
  const vatAmountSum = drafts && drafts.length > 1
    ? drafts.reduce((s, r) => s + Number(r.vatAmount ?? 0), 0)
    : Number(primary.vatAmount ?? 0);

  const date = new Date((primary.date as string) || data.date);
  const mimeType = data.mimeType ?? "image/jpeg";

  // Vytvoř záznam bez scanu (získáme ID), pak uložíme scan na disk a přidáme scanPath
  const receipt = await db.receipt.create({
    data: {
      date,
      scan: "",
      mimeType,
      vendor: (primary.vendor as string) ?? "",
      vendorIco: (primary.vendorIco as string | null) ?? null,
      vendorDic: (primary.vendorDic as string | null) ?? null,
      totalAmount: totalSum,
      vatBase: vatBaseSum,
      vatAmount: vatAmountSum,
      vatRate: Number(primary.vatRate ?? 21),
      items: typeof primary.items === "string" ? primary.items : JSON.stringify(primary.items ?? []),
      note: (primary.note as string | null) ?? null,
      status: data.status ?? "pending",
      aiRaw: data.aiRaw ?? null,
      draftEntries: drafts && drafts.length > 1 ? JSON.stringify(drafts) : null,
      tags: data.tags ?? "",
      category: data.category ?? "other",
    },
  });

  // Ulož scan na disk (jen pokud přišel)
  if (data.scan) {
    const scanPath = buildScanPath(receipt.id, date, mimeType);
    await saveScan(scanPath, data.scan);
    await db.receipt.update({
      where: { id: receipt.id },
      data: { scanPath },
    });
  }

  return NextResponse.json({ id: receipt.id });
}
