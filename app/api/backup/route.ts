import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Verze zálohy — zvýšit pokud se mění schéma (pro restore validaci)
const BACKUP_VERSION = 2;

export async function GET() {
  const [
    supplier,
    clients,
    invoices,
    invoiceItems,
    templates,
    receipts,
  ] = await Promise.all([
    db.supplier.findFirst(),
    db.client.findMany(),
    db.invoice.findMany(),
    db.invoiceItem.findMany(),
    db.invoiceTemplate.findMany(),
    db.receipt.findMany(),
  ]);

  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      supplier,
      clients,
      invoices,
      invoiceItems,
      templates,
      receipts,
    },
  };

  const body = JSON.stringify(payload, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="prachomat-backup-${timestamp}.json"`,
    },
  });
}

// Restore — POST s JSON payloadem stejného tvaru
type BackupPayload = {
  version: number;
  data: {
    supplier: Record<string, unknown> | null;
    clients: Array<Record<string, unknown>>;
    invoices: Array<Record<string, unknown>>;
    invoiceItems?: Array<Record<string, unknown>>;
    templates: Array<Record<string, unknown>>;
    receipts: Array<Record<string, unknown>>;
  };
};

export async function POST(req: NextRequest) {
  let payload: BackupPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  if (!payload.version || !payload.data) {
    return NextResponse.json({ error: "Neznámý formát zálohy" }, { status: 400 });
  }

  if (payload.version > BACKUP_VERSION) {
    return NextResponse.json({ error: `Verze zálohy ${payload.version} je novější než podporovaná (${BACKUP_VERSION}).` }, { status: 400 });
  }

  const { data } = payload;

  // Smaž vše v pořadí (kvůli FK)
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.invoiceTemplate.deleteMany();
  await db.receipt.deleteMany();
  await db.client.deleteMany();
  await db.supplier.deleteMany();

  // Obnov supplier
  if (data.supplier) {
    const s = data.supplier as Record<string, unknown>;
    await db.supplier.create({
      data: {
        ...s,
        createdAt: s.createdAt ? new Date(s.createdAt as string) : undefined,
        updatedAt: s.updatedAt ? new Date(s.updatedAt as string) : undefined,
        fioLastSync: s.fioLastSync ? new Date(s.fioLastSync as string) : null,
      } as never,
    });
  }

  // Clients
  for (const c of data.clients) {
    await db.client.create({
      data: {
        ...c,
        createdAt: c.createdAt ? new Date(c.createdAt as string) : undefined,
        updatedAt: c.updatedAt ? new Date(c.updatedAt as string) : undefined,
      } as never,
    });
  }

  // Templates
  for (const t of data.templates) {
    await db.invoiceTemplate.create({
      data: {
        ...t,
        createdAt: t.createdAt ? new Date(t.createdAt as string) : undefined,
        updatedAt: t.updatedAt ? new Date(t.updatedAt as string) : undefined,
        nextRunAt: t.nextRunAt ? new Date(t.nextRunAt as string) : null,
        lastRunAt: t.lastRunAt ? new Date(t.lastRunAt as string) : null,
      } as never,
    });
  }

  // Invoices
  for (const inv of data.invoices) {
    await db.invoice.create({
      data: {
        ...inv,
        issueDate: new Date(inv.issueDate as string),
        dueDate: new Date(inv.dueDate as string),
        createdAt: inv.createdAt ? new Date(inv.createdAt as string) : undefined,
        updatedAt: inv.updatedAt ? new Date(inv.updatedAt as string) : undefined,
      } as never,
    });
  }

  // InvoiceItems (volitelné — staré zálohy ho neměly)
  if (Array.isArray(data.invoiceItems)) {
    for (const it of data.invoiceItems) {
      await db.invoiceItem.create({ data: it as never });
    }
  }

  // Receipts
  for (const r of data.receipts) {
    await db.receipt.create({
      data: {
        ...r,
        date: new Date(r.date as string),
        createdAt: r.createdAt ? new Date(r.createdAt as string) : undefined,
        updatedAt: r.updatedAt ? new Date(r.updatedAt as string) : undefined,
        approvedAt: r.approvedAt ? new Date(r.approvedAt as string) : null,
        sentAt: r.sentAt ? new Date(r.sentAt as string) : null,
      } as never,
    });
  }

  return NextResponse.json({
    ok: true,
    restored: {
      clients: data.clients.length,
      invoices: data.invoices.length,
      invoiceItems: data.invoiceItems?.length ?? 0,
      templates: data.templates.length,
      receipts: data.receipts.length,
    },
  });
}
