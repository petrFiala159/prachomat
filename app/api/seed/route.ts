import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/seed — vytvoří ukázková data pro demo.
// Volej jen pokud je DB prázdná nebo chceš přidat sample data.
export async function POST() {
  const existingSupplier = await db.supplier.findFirst();

  // Supplier — jen pokud neexistuje
  let supplierId = existingSupplier?.id;
  if (!existingSupplier) {
    const s = await db.supplier.create({
      data: {
        name: "Jan Novák",
        street: "Husova 123",
        city: "Praha",
        zip: "11000",
        ico: "12345678",
        dic: "CZ12345678",
        bankAccount: "1234567890",
        bankCode: "0800",
        email: "jan@novak.cz",
        phone: "+420 777 123 456",
        vatPayer: true,
        vatRate: 21,
      },
    });
    supplierId = s.id;
  }

  // Klienti
  const clients = [
    { name: "MALFINI a.s.", ico: "25466615", dic: "CZ25466615", street: "Záhumenní 1784", city: "Ostrava", zip: "70800", hourlyRate: 1500 },
    { name: "Alza.cz a.s.", ico: "27082440", dic: "CZ27082440", street: "Jateční 33a", city: "Praha 7", zip: "17000", hourlyRate: 1800 },
    { name: "Škoda Auto a.s.", ico: "00177041", dic: "CZ00177041", street: "tř. Václava Klementa 869", city: "Mladá Boleslav", zip: "29301", hourlyRate: 2000 },
  ];

  const clientIds: string[] = [];
  for (const c of clients) {
    const existing = await db.client.findFirst({ where: { ico: c.ico } });
    if (existing) {
      clientIds.push(existing.id);
    } else {
      const created = await db.client.create({ data: { ...c, email: `info@${c.name.split(" ")[0].toLowerCase()}.cz` } });
      clientIds.push(created.id);
    }
  }

  // Faktury — 5 ukázkových za posledních 3 měsíce
  const now = new Date();
  const invoicesCreated: string[] = [];

  for (let i = 0; i < 5; i++) {
    const months = Math.floor(i / 2);
    const issueDate = new Date(now.getFullYear(), now.getMonth() - months, 10 + i * 3);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);
    const clientIdx = i % clientIds.length;
    const hours = 20 + i * 10;
    const rate = [1500, 1800, 2000][clientIdx];
    const vatRate = 21;
    const base = hours * rate;
    const vatAmount = Math.round(base * vatRate / 100);
    const total = base + vatAmount;
    const statuses = ["PAID", "PAID", "SENT", "DRAFT", "SENT"];

    const year = issueDate.getFullYear();
    const prefix = String(year);
    const last = await db.invoice.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" } });
    let seq = 1;
    if (last) { const p = parseInt(last.number.slice(prefix.length), 10); if (!isNaN(p)) seq = p + 1; }
    const number = `${prefix}${String(seq).padStart(3, "0")}`;

    const inv = await db.invoice.create({
      data: {
        number,
        issueDate,
        dueDate,
        hoursWorked: hours,
        hourlyRate: rate,
        vatRate,
        vatAmount,
        totalAmount: total,
        status: statuses[i],
        note: `Demo: vývoj webu měsíc ${months + 1}`,
        supplierId: supplierId!,
        clientId: clientIds[clientIdx],
        items: {
          create: [{
            description: `Vývoj webu — ${["frontend", "backend", "API", "design", "testování"][i]}`,
            quantity: hours,
            unit: "h",
            unitPrice: rate,
            vatRate,
            order: 0,
          }],
        },
      },
    });
    invoicesCreated.push(inv.number);
  }

  // Šablona
  await db.invoiceTemplate.create({
    data: {
      name: "Měsíční paušál MALFINI",
      hoursWorked: 40,
      hourlyRate: 1500,
      dueDays: 14,
      note: "Pravidelná měsíční spolupráce",
      clientId: clientIds[0],
      recurring: true,
      intervalDays: 30,
      nextRunAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      active: true,
    },
  });

  return NextResponse.json({
    ok: true,
    created: {
      supplier: !existingSupplier ? 1 : 0,
      clients: clientIds.length,
      invoices: invoicesCreated.length,
      templates: 1,
    },
    invoiceNumbers: invoicesCreated,
  });
}
