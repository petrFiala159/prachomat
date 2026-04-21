import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nextInvoiceNumber } from "@/lib/invoice-number";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ParsedInvoice = {
  clientName: string | null;
  hours: number | null;
  hourlyRate: number | null;
  note: string | null;
  issueDate: string;
  dueDate: string;
  items?: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>;
};

async function parseWithAI(prompt: string): Promise<ParsedInvoice | null> {
  const today = new Date().toISOString().split("T")[0];
  const due14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `Jsi asistent pro generování faktur z přirozeného jazyka. Z českého textu extrahuj údaje a vrať POUZE čistý JSON.

Dnešní datum: ${today}

Vrať tento tvar:
{
  "clientName": "název klienta nebo null",
  "hours": 40,
  "hourlyRate": 1500,
  "note": "popis práce nebo null",
  "issueDate": "${today}",
  "dueDate": "${due14}",
  "items": [
    {"description": "Vývoj webu", "quantity": 40, "unit": "h", "unitPrice": 1500}
  ]
}

Pravidla:
- clientName: jméno firmy/osoby z textu. "pro MALFINI" → "MALFINI"
- hours: celkový počet hodin. Pokud uživatel zadal více položek, sečti.
- hourlyRate: sazba v Kč/hod. Pokud nezadaná → null.
- note: krátký popis práce.
- items: pole položek. Pokud uživatel zmíní jen "40 hodin", vytvoř jednu položku. Pokud zmíní víc věcí ("20h vývoj + 10h konzultace"), vytvoř více.
- Splatnost výchozí 14 dní od dneška, pokud nezadaná.
- NEOBALUJ do markdown backticks. Vrať čistý JSON.`,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Regex fallback — pokud Claude nefunguje
function parseWithRegex(prompt: string): ParsedInvoice {
  const text = prompt.trim();
  const today = new Date().toISOString().split("T")[0];
  const due14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  let clientName: string | null = null;
  const cm = text.match(/(?:pro|klient|odběratel|firma|zákazník)\s+([A-ZÁ-Ža-zá-ž0-9][\w\s.&-]*?)(?:\s*[,.]|\s+\d|\s+sazba|\s+splatnost|$)/i)
    || text.match(/(?:faktura|fakt\.?)\s+([A-ZÁ-Ža-zá-ž][\w\s.&-]*?)(?:\s*[,.]|\s+\d|\s+sazba|\s+splatnost|$)/i);
  if (cm) clientName = cm[1].trim();

  let hours: number | null = null;
  const hm = text.match(/(\d+(?:[.,]\d+)?)\s*(?:hodin[y]?|hod\.?|h\b)/i);
  if (hm) hours = parseFloat(hm[1].replace(",", "."));

  let hourlyRate: number | null = null;
  const rm = text.match(/(?:sazba|rate)\s+(\d+)/i) || text.match(/(\d+)\s*(?:kč|czk)\s*\/\s*(?:hod|h)\b/i);
  if (rm) hourlyRate = parseInt(rm[1]);

  let dueDays = 14;
  const dm = text.match(/splatnost\s+(\d+)\s*(?:dn[íů]|dny|den)/i);
  if (dm) dueDays = parseInt(dm[1]);

  let note: string | null = null;
  const nm = text.match(/(?:poznámka|popis|note)[:\s]+(.+?)(?:\s*[,.]|$)/i);
  if (nm) note = nm[1].trim();

  const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split("T")[0];

  return { clientName, hours, hourlyRate, note, issueDate: today, dueDate: dueDays !== 14 ? dueDate : due14 };
}

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt?.trim()) return NextResponse.json({ error: "Prázdný prompt" }, { status: 400 });

  // Zkus Claude AI, fallback na regex
  let parsed = await parseWithAI(prompt);
  if (!parsed) {
    parsed = parseWithRegex(prompt);
  }

  // Najdi dodavatele
  const supplier = await db.supplier.findFirst();
  if (!supplier) {
    return NextResponse.json({ error: "Nejdřív vyplň své údaje v Nastavení." }, { status: 400 });
  }

  // Najdi klienta fuzzy matchem
  let client = null;
  if (parsed.clientName) {
    const clients = await db.client.findMany();
    const lower = parsed.clientName.toLowerCase();
    client = clients.find((c: { name: string }) =>
      c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
    ) ?? null;
  }

  if (!client) {
    return NextResponse.json({
      error: parsed.clientName
        ? `Klient "${parsed.clientName}" nenalezen. Přidej ho nejdřív v sekci Odběratelé.`
        : "Nebyl rozpoznán žádný klient. Zkus např. \"faktura pro Alza 40 hodin\".",
    }, { status: 400 });
  }

  if (!parsed.hours && (!parsed.items || parsed.items.length === 0)) {
    return NextResponse.json({ error: "Nebyl rozpoznán počet hodin ani položky." }, { status: 400 });
  }

  // Sazba: z AI → z klienta
  const hourlyRate = parsed.hourlyRate ?? (client as { hourlyRate: number }).hourlyRate;
  if (!hourlyRate && !parsed.items?.length) {
    return NextResponse.json({ error: "Nebyla rozpoznána sazba a klient nemá nastavenou výchozí." }, { status: 400 });
  }

  const vatRate = supplier.vatPayer ? (supplier.vatRate ?? 21) : 0;

  // Položky — buď z AI (multi-item) nebo single
  const invoiceItems = (parsed.items && parsed.items.length > 0)
    ? parsed.items.map((it, idx) => ({
        description: it.description,
        quantity: it.quantity,
        unit: it.unit || "h",
        unitPrice: it.unitPrice || hourlyRate || 0,
        vatRate,
        order: idx,
      }))
    : [{
        description: parsed.note || "Odpracované hodiny",
        quantity: parsed.hours || 0,
        unit: "h",
        unitPrice: hourlyRate || 0,
        vatRate,
        order: 0,
      }];

  const base = invoiceItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const vatAmount = Math.round(base * vatRate / 100);
  const totalAmount = base + vatAmount;
  const totalHours = invoiceItems.reduce((s, it) => it.unit === "h" ? s + it.quantity : s, 0);
  const number = await nextInvoiceNumber();

  const invoice = await db.invoice.create({
    data: {
      number,
      issueDate: new Date(parsed.issueDate),
      dueDate: new Date(parsed.dueDate),
      hoursWorked: totalHours,
      hourlyRate: hourlyRate || 0,
      vatRate,
      vatAmount,
      totalAmount,
      status: "DRAFT",
      note: parsed.note,
      supplierId: supplier.id,
      clientId: client.id,
      items: { create: invoiceItems },
    },
  });

  await db.auditLog.create({
    data: {
      action: "created",
      entityType: "invoice",
      entityId: invoice.id,
      summary: `AI vytvořila fakturu ${invoice.number} z promptu`,
    },
  });

  return NextResponse.json({ id: invoice.id, number: invoice.number });
}
