import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmtDate(d: Date): string {
  return new Date(d).toISOString().split("T")[0];
}

// mPohoda/Pohoda XML export — zjednodušená verze pro import do SW Pohoda.
// Plný schéma: http://www.stormware.cz/schema/version_2/invoice.xsd
// Query: ?year=2026&month=4 (volitelné — default celý aktuální rok)
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const monthParam = req.nextUrl.searchParams.get("month");

  let rangeStart: Date;
  let rangeEnd: Date;
  if (monthParam) {
    const m = Number(monthParam);
    rangeStart = new Date(year, m - 1, 1);
    rangeEnd = new Date(year, m, 1);
  } else {
    rangeStart = new Date(year, 0, 1);
    rangeEnd = new Date(year + 1, 0, 1);
  }

  const supplier = await db.supplier.findFirst();
  if (!supplier) {
    return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  }

  const invoices = await db.invoice.findMany({
    where: { issueDate: { gte: rangeStart, lt: rangeEnd } },
    include: { client: true, items: { orderBy: { order: "asc" } } },
    orderBy: { issueDate: "asc" },
  });

  const dataPackId = `DP-${Date.now()}`;
  const now = new Date();

  const items = invoices.map((inv, idx) => {
    const invoiceLines = inv.items.length > 0
      ? inv.items
      : [{
          id: "legacy",
          description: inv.note || "Odpracované hodiny",
          quantity: inv.hoursWorked,
          unit: "h",
          unitPrice: inv.hourlyRate,
          vatRate: inv.vatRate,
        }];

    const detailLines = invoiceLines.map((it) => {
      const lineBase = it.quantity * it.unitPrice;
      const lineVat = lineBase * (it.vatRate / 100);
      return `          <inv:invoiceItem>
            <inv:text>${escXml(it.description)}</inv:text>
            <inv:quantity>${it.quantity}</inv:quantity>
            <inv:unit>${escXml(it.unit)}</inv:unit>
            <inv:rateVAT>${it.vatRate === 21 ? "high" : it.vatRate === 12 ? "low" : "none"}</inv:rateVAT>
            <inv:homeCurrency>
              <typ:unitPrice>${it.unitPrice.toFixed(2)}</typ:unitPrice>
              <typ:price>${lineBase.toFixed(2)}</typ:price>
              <typ:priceVAT>${lineVat.toFixed(2)}</typ:priceVAT>
            </inv:homeCurrency>
          </inv:invoiceItem>`;
    }).join("\n");

    const base = inv.totalAmount - inv.vatAmount;

    return `  <dat:dataPackItem id="${idx + 1}" version="2.0">
    <inv:invoice version="2.0">
      <inv:invoiceHeader>
        <inv:invoiceType>issuedInvoice</inv:invoiceType>
        <inv:number>
          <typ:numberRequested>${escXml(inv.number)}</typ:numberRequested>
        </inv:number>
        <inv:symVar>${escXml(inv.number)}</inv:symVar>
        <inv:date>${fmtDate(inv.issueDate)}</inv:date>
        <inv:dateTax>${fmtDate(inv.issueDate)}</inv:dateTax>
        <inv:dateDue>${fmtDate(inv.dueDate)}</inv:dateDue>
        <inv:text>${escXml(inv.note ?? `Faktura ${inv.number}`)}</inv:text>
        <inv:partnerIdentity>
          <typ:address>
            <typ:company>${escXml(inv.client.name)}</typ:company>
            <typ:city>${escXml(inv.client.city)}</typ:city>
            <typ:street>${escXml(inv.client.street)}</typ:street>
            <typ:zip>${escXml(inv.client.zip)}</typ:zip>
            <typ:ico>${escXml(inv.client.ico)}</typ:ico>
            ${inv.client.dic ? `<typ:dic>${escXml(inv.client.dic)}</typ:dic>` : ""}
          </typ:address>
        </inv:partnerIdentity>
        <inv:classificationVAT>
          <typ:classificationVATType>${inv.reverseCharge ? "inland" : "inland"}</typ:classificationVATType>
        </inv:classificationVAT>
        <inv:paymentType>
          <typ:paymentType>draft</typ:paymentType>
        </inv:paymentType>
      </inv:invoiceHeader>
      <inv:invoiceDetail>
${detailLines}
      </inv:invoiceDetail>
      <inv:invoiceSummary>
        <inv:roundingDocument>math2one</inv:roundingDocument>
        <inv:homeCurrency>
          <typ:priceNone>${inv.reverseCharge ? inv.totalAmount.toFixed(2) : "0"}</typ:priceNone>
          <typ:priceLow>0</typ:priceLow>
          <typ:priceLowVAT>0</typ:priceLowVAT>
          <typ:priceHigh>${inv.reverseCharge ? "0" : base.toFixed(2)}</typ:priceHigh>
          <typ:priceHighVAT>${inv.reverseCharge ? "0" : inv.vatAmount.toFixed(2)}</typ:priceHighVAT>
          <typ:price3>0</typ:price3>
          <typ:price3VAT>0</typ:price3VAT>
        </inv:homeCurrency>
      </inv:invoiceSummary>
    </inv:invoice>
  </dat:dataPackItem>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="Windows-1250"?>
<dat:dataPack id="${dataPackId}" ico="${escXml(supplier.ico)}" application="Prachomat" version="2.0" note="${fmtDate(now)}"
  xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"
  xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"
  xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">
${items}
</dat:dataPack>`;

  const filename = monthParam
    ? `pohoda-${year}-${String(Number(monthParam)).padStart(2, "0")}.xml`
    : `pohoda-${year}.xml`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=windows-1250",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
