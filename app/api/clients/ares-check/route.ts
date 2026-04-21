import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type AresData = {
  ico: string;
  name: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
};

async function fetchAres(ico: string): Promise<AresData | null> {
  try {
    const res = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const raw = await res.json();
    const sidlo = raw.sidlo ?? {};
    let street = sidlo.nazevUlice ?? sidlo.nazevCastiObce ?? "";
    if (sidlo.cisloDomovni) {
      street += ` ${sidlo.cisloDomovni}`;
      if (sidlo.cisloOrientacni) {
        street += `/${sidlo.cisloOrientacni}`;
        if (sidlo.cisloOrientacniPismeno) street += sidlo.cisloOrientacniPismeno;
      }
    }
    return {
      ico: raw.ico ?? ico,
      name: raw.obchodniJmeno ?? "",
      dic: raw.dic ?? "",
      street: street.trim(),
      city: sidlo.nazevObce ?? "",
      zip: sidlo.psc ? String(sidlo.psc) : "",
    };
  } catch {
    return null;
  }
}

function diffFields(current: { name: string; street: string; city: string; zip: string; dic: string | null }, fresh: AresData): string[] {
  const changes: string[] = [];
  if (current.name !== fresh.name) changes.push(`název: "${current.name}" → "${fresh.name}"`);
  if (current.street !== fresh.street) changes.push(`ulice: "${current.street}" → "${fresh.street}"`);
  if (current.city !== fresh.city) changes.push(`město: "${current.city}" → "${fresh.city}"`);
  if (current.zip !== fresh.zip) changes.push(`PSČ: "${current.zip}" → "${fresh.zip}"`);
  if ((current.dic ?? "") !== fresh.dic) changes.push(`DIČ: "${current.dic ?? ""}" → "${fresh.dic}"`);
  return changes;
}

export async function POST() {
  const clients = await db.client.findMany();
  const results: Array<{ id: string; name: string; changes: string[] }> = [];

  for (const client of clients) {
    if (!/^\d{8}$/.test(client.ico)) continue; // skip invalid IČO

    const fresh = await fetchAres(client.ico);
    if (!fresh) continue;

    const changes = diffFields(client, fresh);
    const hasChanges = changes.length > 0;

    await db.client.update({
      where: { id: client.id },
      data: {
        aresSnapshot: JSON.stringify(fresh),
        aresCheckedAt: new Date(),
        aresHasChanges: hasChanges,
        aresChangesSummary: hasChanges ? changes.join("; ") : null,
      },
    });

    if (hasChanges) {
      results.push({ id: client.id, name: client.name, changes });
    }
  }

  return NextResponse.json({
    checked: clients.length,
    withChanges: results.length,
    changes: results,
  });
}

// Endpoint pro aplikaci navržených změn na konkrétního klienta
export async function PATCH(req: Request) {
  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "Chybí clientId" }, { status: 400 });

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client || !client.aresSnapshot) {
    return NextResponse.json({ error: "Žádné ARES data k aplikaci" }, { status: 400 });
  }

  const fresh: AresData = JSON.parse(client.aresSnapshot);
  await db.client.update({
    where: { id: clientId },
    data: {
      name: fresh.name,
      street: fresh.street,
      city: fresh.city,
      zip: fresh.zip,
      dic: fresh.dic || null,
      aresHasChanges: false,
      aresChangesSummary: null,
    },
  });

  return NextResponse.json({ ok: true });
}
