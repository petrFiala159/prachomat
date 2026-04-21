import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type TranscribedReceipt = {
  vendor: string;
  vendorIco: string | null;
  vendorDic: string | null;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  vatBase: number;
  vatAmount: number;
  vatRate: number;
  items: Array<{ name: string; quantity: number; unitPrice: number; vatRate: number }>;
  note: string | null;
};

type TranscribedBatch = {
  receipts: TranscribedReceipt[];
};

const SYSTEM_PROMPT = `Jsi asistent pro přepis českých účtenek. Z obrázku nebo PDF extrahuj strukturovaná data všech účtenek, které vidíš, a vrať POUZE čistý JSON.

DŮLEŽITÉ: Na jednom scanu může být VÍCE ÚČTENEK (uživatelé často skenují 3–5 účtenek najednou). Každou účtenku vrať jako samostatný objekt v poli "receipts".

Vrať tento tvar:
{
  "receipts": [
    {
      "vendor": "název prodejce",
      "vendorIco": "IČO prodejce nebo null",
      "vendorDic": "DIČ prodejce nebo null (ve tvaru CZ...)",
      "date": "YYYY-MM-DD (datum účtenky)",
      "totalAmount": 123.45,
      "vatBase": 102.0,
      "vatAmount": 21.45,
      "vatRate": 21,
      "items": [{"name": "položka", "quantity": 1, "unitPrice": 50, "vatRate": 21}],
      "note": null
    }
  ]
}

Pravidla:
- Pokud je na scanu JEDNA účtenka, pole "receipts" obsahuje jeden objekt
- Pokud jich je VÍC, vrať pro každou samostatný objekt (i když jsou částečně překryté nebo v různých orientacích)
- Všechny částky v Kč jako number (ne string)
- Datum vždy ve formátu YYYY-MM-DD
- Pokud účtenka má více sazeb DPH, použij tu převažující a detaily dej do "note"
- Pokud nejde extrahovat položky, vrať prázdné pole []
- Pokud si něčím nejsi jistý, použij null / 0 / "" — uživatel to pak doupraví
- NEOBALUJ výstup do markdown backticks, vrať čistý JSON`;

export async function POST(req: NextRequest) {
  const { image, mimeType } = await req.json();

  if (!image) {
    return NextResponse.json({ error: "Chybí obrázek" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
    return NextResponse.json(
      { error: "Chybí ANTHROPIC_API_KEY. Účtenku můžeš vyplnit ručně." },
      { status: 503 }
    );
  }

  // Strip data URL prefix if present
  const base64Data = image.replace(/^data:[^;]+;base64,/, "");
  const mt = mimeType ?? "image/jpeg";

  const isImage = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mt);
  const isPdf = mt === "application/pdf";

  if (!isImage && !isPdf) {
    return NextResponse.json({ error: `Nepodporovaný formát: ${mt}` }, { status: 400 });
  }

  // Claude dokumenty/obrázky
  const sourceBlock = isPdf
    ? {
        type: "document" as const,
        source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64Data },
      }
    : {
        type: "image" as const,
        source: { type: "base64" as const, media_type: mt as "image/jpeg", data: base64Data },
      };

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: [sourceBlock as any, { type: "text", text: "Přepiš tuto účtenku do JSON." }],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      // Backward-compat: pokud AI vrátí samostatný objekt místo batch, zabal ho
      const batch: TranscribedBatch = Array.isArray(parsed?.receipts)
        ? parsed
        : { receipts: [parsed] };
      return NextResponse.json({ receipts: batch.receipts, raw: text });
    } catch {
      return NextResponse.json(
        { error: "Nepodařilo se parsovat odpověď AI. Vyplň ručně.", raw: text },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("credit balance")) {
      return NextResponse.json(
        { error: "Nedostatek kreditů na Anthropic účtu. Dobij kredity nebo vyplň ručně." },
        { status: 402 }
      );
    }
    if (msg.includes("authentication") || msg.includes("api_key")) {
      return NextResponse.json({ error: "Neplatný Anthropic API klíč." }, { status: 401 });
    }
    return NextResponse.json({ error: `Chyba AI: ${msg}` }, { status: 500 });
  }
}
