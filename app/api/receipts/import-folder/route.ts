import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { readdir, readFile, rename, mkdir, stat } from "fs/promises";
import path from "path";
import os from "os";
import { saveScan, buildScanPath } from "@/lib/receipt-storage";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".pdf", ".gif", ".webp", ".heic"]);
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  if (p === "~") return os.homedir();
  return p;
}

export async function POST() {
  const supplier = await db.supplier.findFirst();
  if (!supplier) return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  if (!supplier.scanFolder) {
    return NextResponse.json({ error: "Cesta ke scanner složce není nastavená v Nastavení." }, { status: 400 });
  }

  const folder = expandHome(supplier.scanFolder);

  try {
    const s = await stat(folder);
    if (!s.isDirectory()) {
      return NextResponse.json({ error: `${folder} není složka.` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: `Složka ${folder} neexistuje.` }, { status: 400 });
  }

  // Archiv pro zpracované scany
  const archive = path.join(folder, ".prachomat-imported");
  try {
    await mkdir(archive, { recursive: true });
  } catch { /* ignore */ }

  // List files
  let entries: string[] = [];
  try {
    entries = await readdir(folder);
  } catch (err) {
    return NextResponse.json({ error: `Nelze číst složku: ${err}` }, { status: 500 });
  }

  const files = entries.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return !f.startsWith(".") && ALLOWED_EXT.has(ext);
  });

  if (files.length === 0) {
    return NextResponse.json({ imported: 0, message: "Ve složce nejsou žádné nové scany." });
  }

  const imported: { file: string; receiptIds: string[] }[] = [];
  const failed: { file: string; error: string }[] = [];

  const origin = new URL("/api/receipts/transcribe", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString();

  for (const filename of files) {
    const fullPath = path.join(folder, filename);
    try {
      const buffer = await readFile(fullPath);
      const ext = path.extname(filename).toLowerCase();
      const mimeType = MIME_MAP[ext] ?? "application/octet-stream";
      const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

      // AI transkripce (best effort)
      type ExtractedReceipt = {
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
      };
      let extracted: ExtractedReceipt[] = [];
      let aiError: string | null = null;
      let aiRaw: string | null = null;

      try {
        const res = await fetch(origin, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.receipts) && data.receipts.length > 0) {
          extracted = data.receipts;
          aiRaw = data.raw ?? null;
        } else {
          aiError = data.error ?? "AI selhala";
        }
      } catch (err) {
        aiError = err instanceof Error ? err.message : "Chyba AI";
      }

      if (extracted.length === 0) extracted = [{}];

      // Jeden záznam se seznamem draftEntries (když je jich víc)
      const primary = extracted[0];
      const totalSum = extracted.length > 1
        ? extracted.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0)
        : Number(primary.totalAmount ?? 0);
      const vatBaseSum = extracted.length > 1
        ? extracted.reduce((s, r) => s + Number(r.vatBase ?? 0), 0)
        : Number(primary.vatBase ?? 0);
      const vatAmountSum = extracted.length > 1
        ? extracted.reduce((s, r) => s + Number(r.vatAmount ?? 0), 0)
        : Number(primary.vatAmount ?? 0);

      const receiptDate = primary.date ? new Date(primary.date) : new Date();
      const receipt = await db.receipt.create({
        data: {
          date: receiptDate,
          scan: "",
          mimeType,
          vendor: primary.vendor ?? "",
          vendorIco: primary.vendorIco ?? null,
          vendorDic: primary.vendorDic ?? null,
          totalAmount: totalSum,
          vatBase: vatBaseSum,
          vatAmount: vatAmountSum,
          vatRate: Number(primary.vatRate ?? 21),
          items: JSON.stringify(primary.items ?? []),
          note: aiError ? `AI: ${aiError}` : (primary.note ?? null),
          aiRaw,
          status: "pending",
          draftEntries: extracted.length > 1 ? JSON.stringify(extracted) : null,
        },
      });
      // Ulož scan na disk
      const scanPath = buildScanPath(receipt.id, receiptDate, mimeType);
      await saveScan(scanPath, base64);
      await db.receipt.update({ where: { id: receipt.id }, data: { scanPath } });

      const ids = [receipt.id];

      // Přesuň do archivu — nesmaž, pro jistotu
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivedName = `${timestamp}_${filename}`;
      await rename(fullPath, path.join(archive, archivedName));

      imported.push({ file: filename, receiptIds: ids });
    } catch (err) {
      failed.push({ file: filename, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    imported: imported.length,
    failed: failed.length,
    total: files.length,
    details: { imported, failed },
  });
}
