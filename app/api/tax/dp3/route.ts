import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// DPH přiznání — DPHDP3 XML.
// Schéma: EPO formulář DPH přiznání k dani z přidané hodnoty.
// Query: ?year=2026&month=4

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function n(value: number): string {
  return String(Math.round(value));
}

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const monthParam = req.nextUrl.searchParams.get("month");

  if (!monthParam) {
    return NextResponse.json({ error: "Parametr month je povinný (1-12)" }, { status: 400 });
  }
  const month = Number(monthParam);
  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "Neplatný měsíc" }, { status: 400 });
  }

  const supplier = await db.supplier.findFirst();
  if (!supplier) return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  if (!supplier.vatPayer || !supplier.dic) {
    return NextResponse.json({ error: "Jen pro plátce DPH s DIČ" }, { status: 400 });
  }

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month, 1);

  const [invoices, receipts] = await Promise.all([
    db.invoice.findMany({
      where: { issueDate: { gte: rangeStart, lt: rangeEnd }, invoiceType: { not: "credit" } },
      include: { client: true },
    }),
    db.receipt.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd }, status: { in: ["approved", "sent"] } },
    }),
  ]);

  // Řádek 1 — uskutečněná plnění základní sazba (21%)
  // Řádek 2 — uskutečněná plnění snížená sazba (12%)
  let r1_base = 0, r1_vat = 0;
  let r2_base = 0, r2_vat = 0;

  for (const inv of invoices) {
    if (inv.reverseCharge) continue; // reverse charge jde jinam
    const base = inv.totalAmount - inv.vatAmount;
    if (inv.vatRate === 21) {
      r1_base += base;
      r1_vat += inv.vatAmount;
    } else if (inv.vatRate === 12) {
      r2_base += base;
      r2_vat += inv.vatAmount;
    }
  }

  // Řádek 40 — přijatá plnění základní sazba (21%)
  // Řádek 41 — přijatá plnění snížená sazba (12%)
  let r40_base = 0, r40_vat = 0;
  let r41_base = 0, r41_vat = 0;

  for (const r of receipts) {
    if (r.vatRate === 21) {
      r40_base += r.vatBase;
      r40_vat += r.vatAmount;
    } else if (r.vatRate === 12) {
      r41_base += r.vatBase;
      r41_vat += r.vatAmount;
    }
  }

  // Řádek 62 — DPH k platbě (na výstupu − na vstupu)
  const r62 = Math.max((r1_vat + r2_vat) - (r40_vat + r41_vat), 0);

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost nazevSW="Prachomat" verzeSW="1.0">
  <DPHDP3 verzePis="01.02">
    <VetaD
      dapdph_forma="B"
      dan_obd_mesic="${month}"
      dan_obd_rok="${year}"
      dic="${escXml(supplier.dic.replace(/^CZ/i, ""))}"
      typ_platce="P"
      c_ufo="451"
      c_pracufo="2801"
      d_poddp="${dateStr}"
    />
    <VetaP
      c_pop=""
      obec="${escXml(supplier.city)}"
      psc="${escXml(supplier.zip.replace(/\s/g, ""))}"
      stat="Česká republika"
      ulice="${escXml(supplier.street)}"
      zkrobchjm="${escXml(supplier.name)}"
      email="${escXml(supplier.email ?? "")}"
    />
    <Veta1
      obrat23="${n(r1_base)}"
      dan23="${n(r1_vat)}"
      obrat5="${n(r2_base)}"
      dan5="${n(r2_vat)}"
    />
    <Veta4
      pln23_nar="${n(r40_base)}"
      odp_tuz23_nar="${n(r40_vat)}"
      pln5_nar="${n(r41_base)}"
      odp_tuz5_nar="${n(r41_vat)}"
    />
    <Veta6
      dan_zocelk="${n(r1_vat + r2_vat)}"
      odp_zocelk="${n(r40_vat + r41_vat)}"
      dano_dan_pov="${n(r62)}"
    />
  </DPHDP3>
</Pisemnost>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="DPHDP3_${year}_${String(month).padStart(2, "0")}.xml"`,
    },
  });
}
