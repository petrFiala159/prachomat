import { NextResponse } from "next/server";

type AresResponse = {
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
  };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ico = searchParams.get("ico")?.replace(/\s/g, "");

  if (!ico || !/^\d{8}$/.test(ico)) {
    return NextResponse.json({ error: "Neplatné IČO" }, { status: 400 });
  }

  const res = await fetch(
    `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`,
    { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Subjekt nenalezen v ARES" },
      { status: 404 }
    );
  }

  const data: AresResponse = await res.json();
  const sidlo = data.sidlo ?? {};

  // Sestavení ulice
  let street = sidlo.nazevUlice ?? sidlo.nazevCastiObce ?? "";
  if (sidlo.cisloDomovni) {
    street += ` ${sidlo.cisloDomovni}`;
    if (sidlo.cisloOrientacni) {
      street += `/${sidlo.cisloOrientacni}`;
      if (sidlo.cisloOrientacniPismeno) {
        street += sidlo.cisloOrientacniPismeno;
      }
    }
  }

  return NextResponse.json({
    ico: data.ico,
    name: data.obchodniJmeno,
    dic: data.dic ?? "",
    street: street.trim(),
    city: sidlo.nazevObce ?? "",
    zip: sidlo.psc ? String(sidlo.psc) : "",
  });
}
