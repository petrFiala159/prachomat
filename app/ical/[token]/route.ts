import { db } from "@/lib/db";
import { NextResponse } from "next/server";

function fmtIcsDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function fmtIcsDateTime(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${h}${m}${s}Z`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supplier = await db.supplier.findFirst({ where: { icalToken: token } });
  if (!supplier) {
    return NextResponse.json({ error: "Neplatný token" }, { status: 404 });
  }

  // Nezaplacené faktury (SENT, OVERDUE, DRAFT s dueDate v budoucnu)
  const invoices = await db.invoice.findMany({
    where: {
      status: { in: ["SENT", "OVERDUE", "DRAFT"] },
    },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  });

  const fmt = (n: number, curr: string) =>
    new Intl.NumberFormat("cs-CZ", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(n);

  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prachomat//Invoice Due Dates//CS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(`Prachomat – splatnosti (${supplier.name})`)}`,
    "X-WR-TIMEZONE:Europe/Prague",
  ];

  for (const inv of invoices) {
    const due = new Date(inv.dueDate);
    const title = `Splatnost: ${inv.client.name} — ${fmt(inv.totalAmount, inv.currency)}`;
    const description = [
      `Faktura ${inv.number}`,
      `Klient: ${inv.client.name}`,
      `Částka: ${fmt(inv.totalAmount, inv.currency)}`,
      `Stav: ${inv.status}`,
      inv.note ? `Poznámka: ${inv.note}` : null,
    ].filter(Boolean).join("\\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${inv.id}@prachomat`);
    lines.push(`DTSTAMP:${fmtIcsDateTime(now)}`);
    lines.push(`DTSTART;VALUE=DATE:${fmtIcsDate(due)}`);
    // Konec = následující den (all-day event)
    const nextDay = new Date(due);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${fmtIcsDate(nextDay)}`);
    lines.push(`SUMMARY:${escapeIcs(title)}`);
    lines.push(`DESCRIPTION:${escapeIcs(description)}`);
    if (inv.status === "OVERDUE") {
      lines.push("CATEGORIES:OVERDUE");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="prachomat-${token.slice(0, 8)}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
