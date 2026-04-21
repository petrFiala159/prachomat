import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../prisma/dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const db = new PrismaClient({ adapter });

const SUPPLIER_ID = "cmnhsdoc40000mhnnppo65e97";

const clients = [
  { name: "MALFINI, a.s.", ico: "27741890", dic: "CZ27741890", street: "Holická 1098/31m", city: "Olomouc", zip: "77900", email: "fakturace@malfini.com", hourlyRate: 1200 },
  { name: "Avast Software s.r.o.", ico: "02476820", dic: "CZ02476820", street: "Pikrtova 1737/1a", city: "Praha", zip: "14000", email: "billing@avast.com", hourlyRate: 1500 },
  { name: "Kiwi.com s.r.o.", ico: "29352886", dic: "CZ29352886", street: "Palachovo náměstí 797/4", city: "Brno", zip: "62500", email: "invoices@kiwi.com", hourlyRate: 1800 },
  { name: "Productboard s.r.o.", ico: "04869901", dic: "CZ04869901", street: "Dělnická 213/12", city: "Praha", zip: "17000", email: "finance@productboard.com", hourlyRate: 2000 },
];

// Generátor náhodného čísla v rozsahu
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Datum v daném měsíci a roku
function dateOf(year, month, day = 1) {
  return new Date(year, month, day);
}

async function main() {
  console.log("🌱 Seeduji testovací data...");

  // Vytvoř nebo načti klienty
  const clientIds = [];
  for (const c of clients) {
    const existing = await db.client.findFirst({ where: { ico: c.ico } });
    if (existing) {
      clientIds.push(existing.id);
      console.log(`  ✓ Klient existuje: ${c.name}`);
    } else {
      const created = await db.client.create({ data: c });
      clientIds.push(created.id);
      console.log(`  + Klient vytvořen: ${c.name}`);
    }
  }

  // Smažeme existující testovací faktury (čísla začínající 2024 nebo 2025)
  const deleted = await db.invoice.deleteMany({
    where: { number: { in: [] } }, // nepřepisujeme existující
  });

  // Generuj faktury pro 2024 a 2025
  const invoicesToCreate = [];
  let counter2024 = 1;
  let counter2025 = 1;

  const statuses2024 = ["PAID", "PAID", "PAID", "PAID", "SENT", "OVERDUE"];
  const statuses2025 = ["PAID", "PAID", "PAID", "SENT", "SENT", "OVERDUE", "DRAFT"];

  // 2024 — 18 faktur, různí klienti
  for (let month = 0; month < 12; month++) {
    const count = month < 10 ? rand(1, 2) : 1;
    for (let i = 0; i < count; i++) {
      const clientId = clientIds[rand(0, clientIds.length - 1)];
      const client = clients[clientIds.indexOf(clientId)];
      const hours = rand(40, 180);
      const rate = client.hourlyRate;
      const base = hours * rate;
      const vatAmount = Math.round(base * 0.21);
      const totalAmount = base + vatAmount;
      const issueDate = dateOf(2024, month, rand(1, 20));
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 14);
      const status = statuses2024[rand(0, statuses2024.length - 1)];

      invoicesToCreate.push({
        year: 2024,
        seq: counter2024++,
        number: `2024${String(counter2024 - 1).padStart(3, "0")}`,
        issueDate,
        dueDate,
        hoursWorked: hours,
        hourlyRate: rate,
        vatRate: 21,
        vatAmount,
        totalAmount,
        status,
        note: null,
        supplierId: SUPPLIER_ID,
        clientId,
      });
    }
  }

  // 2025 — 14 faktur
  for (let month = 0; month < 12; month++) {
    if (Math.random() < 0.15) continue; // občas přeskočit měsíc
    const clientId = clientIds[rand(0, clientIds.length - 1)];
    const client = clients[clientIds.indexOf(clientId)];
    const hours = rand(60, 160);
    const rate = client.hourlyRate;
    const base = hours * rate;
    const vatAmount = Math.round(base * 0.21);
    const totalAmount = base + vatAmount;
    const issueDate = dateOf(2025, month, rand(1, 20));
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);
    const status = statuses2025[rand(0, statuses2025.length - 1)];

    invoicesToCreate.push({
      year: 2025,
      seq: counter2025++,
      number: `2025${String(counter2025 - 1).padStart(3, "0")}`,
      issueDate,
      dueDate,
      hoursWorked: hours,
      hourlyRate: rate,
      vatRate: 21,
      vatAmount,
      totalAmount,
      status,
      note: null,
      supplierId: SUPPLIER_ID,
      clientId,
    });
  }

  // Zkontroluj kolize čísel a vytvoř
  for (const inv of invoicesToCreate) {
    const exists = await db.invoice.findUnique({ where: { number: inv.number } });
    if (exists) {
      console.log(`  ~ Přeskakuji ${inv.number} (existuje)`);
      continue;
    }
    const { year, seq, ...data } = inv;
    await db.invoice.create({ data });
    console.log(`  + Faktura ${inv.number} (${inv.status})`);
  }

  const total = await db.invoice.count();
  console.log(`\n✅ Hotovo! Celkem faktur v DB: ${total}`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
