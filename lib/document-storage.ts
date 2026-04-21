import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "documents");

function extFromMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime.startsWith("application/vnd.openxmlformats-officedocument.wordprocessingml")) return "docx";
  if (mime === "application/msword") return "doc";
  if (mime.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml")) return "xlsx";
  return "bin";
}

export function buildDocPath(id: string, mimeType: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${id}.${extFromMime(mimeType)}`;
}

export async function saveDocument(relativePath: string, dataUrlOrBase64: string): Promise<number> {
  const absPath = path.join(STORAGE_ROOT, relativePath);
  await mkdir(path.dirname(absPath), { recursive: true });
  const base64 = dataUrlOrBase64.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  await writeFile(absPath, buffer);
  return buffer.length;
}

export async function readDocument(relativePath: string): Promise<Buffer> {
  return readFile(path.join(STORAGE_ROOT, relativePath));
}

export async function deleteDocument(relativePath: string): Promise<void> {
  try {
    await unlink(path.join(STORAGE_ROOT, relativePath));
  } catch { /* ignore */ }
}
