import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyVies, verifyCzVatPayer } from "@/lib/vat-verification";

// Ověří klienta proti VIES a Výpisu plátců DPH a uloží výsledek.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });

  const result: {
    vies: { valid: boolean; name?: string; address?: string } | null;
    vatPayer: { isPayer: boolean; status: string } | null;
  } = { vies: null, vatPayer: null };

  // VIES — jen pokud má DIČ začínající zemí EU
  if (client.dic && /^[A-Z]{2}/i.test(client.dic)) {
    const vies = await verifyVies(client.dic);
    if (vies) {
      result.vies = { valid: vies.valid, name: vies.name, address: vies.address };
    }
  }

  // CZ plátce DPH — podle IČO
  const vatPayer = await verifyCzVatPayer(client.ico);
  if (vatPayer) {
    result.vatPayer = { isPayer: vatPayer.isPayer, status: vatPayer.status };
  }

  // Ulož do klienta
  await db.client.update({
    where: { id },
    data: {
      viesValid: result.vies ? result.vies.valid : null,
      viesCheckedAt: result.vies ? new Date() : undefined,
      vatPayerStatus: result.vatPayer?.status ?? null,
      vatPayerCheckedAt: result.vatPayer ? new Date() : undefined,
    },
  });

  return NextResponse.json(result);
}
