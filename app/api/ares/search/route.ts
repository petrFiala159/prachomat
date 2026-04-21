import { NextResponse } from "next/server";

type AresSubjekt = {
  ico: string;
  obchodniJmeno: string;
  dic?: string;
  sidlo?: {
    nazevObce?: string;
    nazevCastiObce?: string;
    nazevUlice?: string;
    cisloDomovni?: number;
    cisloOrientacni?: number;
    cisloOrientacniPismeno?: string;
    psc?: number;
    textovaAdresa?: string;
  };
};

function buildStreet(sidlo: AresSubjekt["sidlo"]): string {
  if (!sidlo) return "";
  let street = sidlo.nazevUlice ?? sidlo.nazevCastiObce ?? "";
  if (sidlo.cisloDomovni) {
    street += ` ${sidlo.cisloDomovni}`;
    if (sidlo.cisloOrientacni) {
      street += `/${sidlo.cisloOrientacni}`;
      if (sidlo.cisloOrientacniPismeno) street += sidlo.cisloOrientacniPismeno;
    }
  }
  return street.trim();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  // Rozlišíme IČO (8 číslic) vs. název
  const isIco = /^\d{1,8}$/.test(q);
  const body = isIco
    ? { ico: [q.padStart(8, "0")], start: 0, pocet: 8 }
    : { obchodniJmeno: q, start: 0, pocet: 8 };

  try {
    const res = await fetch(
      "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) return NextResponse.json([]);

    const data: { ekonomickeSubjekty?: AresSubjekt[] } = await res.json();
    const subjekty = data.ekonomickeSubjekty ?? [];

    const results = subjekty.map((s) => ({
      ico: s.ico,
      name: s.obchodniJmeno,
      dic: s.dic ?? "",
      street: buildStreet(s.sidlo),
      city: s.sidlo?.nazevObce ?? "",
      zip: s.sidlo?.psc ? String(s.sidlo.psc) : "",
    }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
