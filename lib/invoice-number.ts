import { db } from "@/lib/db";

export async function nextInvoiceNumber(): Promise<string> {
  const supplier = await db.supplier.findFirst();
  const year = new Date().getFullYear();
  const prefix = (supplier?.invoicePrefix ?? "") + (supplier?.invoiceUseYear !== false ? String(year) : "");
  const digits = supplier?.invoiceDigits ?? 3;

  const last = await db.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  let seq = 1;
  if (last) {
    const parsed = parseInt(last.number.slice(prefix.length), 10);
    if (!isNaN(parsed)) seq = parsed + 1;
  }

  return `${prefix}${String(seq).padStart(digits, "0")}`;
}
