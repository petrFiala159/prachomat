import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

// Storage root pro scany účtenek
const STORAGE_ROOT = path.join(process.cwd(), "storage", "receipts");

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

export function buildScanPath(id: string, date: Date, mimeType: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${id}.${extFromMime(mimeType)}`;
}

export async function saveScan(relativePath: string, dataUrlOrBase64: string): Promise<void> {
  const absPath = path.join(STORAGE_ROOT, relativePath);
  await mkdir(path.dirname(absPath), { recursive: true });
  const base64 = dataUrlOrBase64.replace(/^data:[^;]+;base64,/, "");
  await writeFile(absPath, Buffer.from(base64, "base64"));
}

export async function readScan(relativePath: string): Promise<Buffer> {
  const absPath = path.join(STORAGE_ROOT, relativePath);
  return readFile(absPath);
}

export async function deleteScan(relativePath: string): Promise<void> {
  const absPath = path.join(STORAGE_ROOT, relativePath);
  try {
    await unlink(absPath);
  } catch { /* ignore */ }
}
