import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Kontrolní hlášení DPH — DPHKH1 XML pro EPO finanční správy.
// Schéma: https://adisepo.mfcr.cz/adistc/adis/idpr_epo/epo2/form/form_dat.faces
// Query: ?year=2026&month=4 (nebo ?year=2026&quarter=2)
//
// POZOR: Toto je zjednodušený generátor. Před odesláním do EPO ověř
// validaci přímo na portálu daňové správy.

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtCZK(n: number): string {
  // Kontrolní hlášení — částky celá čísla (Kč bez haléřů)
  return String(Math.round(n));
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
    return NextResponse.json({ error: "Kontrolní hlášení lze generovat jen pro plátce DPH s vyplněným DIČ" }, { status: 400 });
  }

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month, 1);

  const invoices = await db.invoice.findMany({
    where: {
      issueDate: { gte: rangeStart, lt: rangeEnd },
      invoiceType: { not: "credit" }, // storna řešit zvlášť
    },
    include: { client: true },
    orderBy: { issueDate: "asc" },
  });

  const receipts = await db.receipt.findMany({
    where: {
      date: { gte: rangeStart, lt: rangeEnd },
      status: { in: ["approved", "sent"] },
    },
    orderBy: { date: "asc" },
  });

  // A.4 — přijatá plnění (účtenky / přijaté faktury) s DIČ, hodnota nad 10 000 Kč
  // A.5 — ostatní přijatá plnění bez nutnosti uvádět protistranu (pod limit)
  const a4Items = receipts.filter((r) => r.vendorDic && r.totalAmount >= 10000);
  const a5Items = receipts.filter((r) => !r.vendorDic || r.totalAmount < 10000);

  // B.2 — uskutečněná zdanitelná plnění s DIČ, hodnota nad 10 000 Kč (vystavené faktury)
  // B.3 — zjednodušené daňové doklady (pod limit)
  const b2Items = invoices.filter((inv) => inv.client.dic && inv.totalAmount >= 10000 && !inv.reverseCharge);
  const b3Items = invoices.filter((inv) => !inv.client.dic || inv.totalAmount < 10000 || inv.reverseCharge);

  // Suma B3 po sazbách
  const b3Sum = {
    base21: 0, vat21: 0,
    base12: 0, vat12: 0,
  };
  for (const inv of b3Items) {
    const baseAmt = inv.totalAmount - inv.vatAmount;
    if (inv.vatRate === 21) {
      b3Sum.base21 += baseAmt;
      b3Sum.vat21 += inv.vatAmount;
    } else if (inv.vatRate === 12) {
      b3Sum.base12 += baseAmt;
      b3Sum.vat12 += inv.vatAmount;
    }
  }

  const a5Sum = a5Items.reduce((s, r) => ({ base: s.base + r.vatBase, vat: s.vat + r.vatAmount }), { base: 0, vat: 0 });

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  // Sestav XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost nazevSW="Prachomat" verzeSW="1.0">
  <DPHKH1 verzePis="02.01">
    <VetaD
      dan_obd_mesic="${month}"
      dan_obd_rok="${year}"
      dic="${escXml(supplier.dic.replace(/^CZ/i, ""))}"
      typ_platce="P"
      sest_jmeno=""
      sest_prijmeni=""
      sest_telefon=""
      sest_email="${escXml(supplier.email ?? "")}"
      d_poddp="${dateStr}"
    />
    <VetaP
      c_pop=""
      obec="${escXml(supplier.city)}"
      psc="${escXml(supplier.zip.replace(/\s/g, ""))}"
      stat="Česká republika"
      ulice="${escXml(supplier.street)}"
      zkrobchjm="${escXml(supplier.name)}"
    />
${a4Items.map((r, i) => `    <VetaA4
      c_evid_dd="${escXml(r.id.slice(-10))}"
      c_radku="${i + 1}"
      dic_dod="${escXml((r.vendorDic ?? "").replace(/^CZ/i, ""))}"
      dppd="${r.date.toISOString().split("T")[0]}"
      kod_rezim_pl="0"
      zakl_dane1="${fmtCZK(r.vatBase)}"
      dan1="${fmtCZK(r.vatAmount)}"
    />`).join("\n")}
    <VetaA5
      zakl_dane1="${fmtCZK(a5Sum.base)}"
      dan1="${fmtCZK(a5Sum.vat)}"
    />
${b2Items.map((inv, i) => {
  const base = inv.totalAmount - inv.vatAmount;
  return `    <VetaB2
      c_evid_dd="${escXml(inv.number)}"
      c_radku="${i + 1}"
      dic_odb="${escXml((inv.client.dic ?? "").replace(/^CZ/i, ""))}"
      dppd="${inv.issueDate.toISOString().split("T")[0]}"
      kod_rezim_pl="0"
      zakl_dane1="${fmtCZK(inv.vatRate === 21 ? base : 0)}"
      dan1="${fmtCZK(inv.vatRate === 21 ? inv.vatAmount : 0)}"
      zakl_dane2="${fmtCZK(inv.vatRate === 12 ? base : 0)}"
      dan2="${fmtCZK(inv.vatRate === 12 ? inv.vatAmount : 0)}"
    />`;
}).join("\n")}
    <VetaB3
      zakl_dane1="${fmtCZK(b3Sum.base21)}"
      dan1="${fmtCZK(b3Sum.vat21)}"
      zakl_dane2="${fmtCZK(b3Sum.base12)}"
      dan2="${fmtCZK(b3Sum.vat12)}"
    />
  </DPHKH1>
</Pisemnost>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="DPHKH1_${year}_${String(month).padStart(2, "0")}.xml"`,
    },
  });
}
