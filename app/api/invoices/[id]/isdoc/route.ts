import { db } from "@/lib/db";
import { NextResponse } from "next/server";

function fmtDate(d: Date) {
  return new Date(d).toISOString().split("T")[0];
}

function escXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toIBAN(account: string, bankCode: string): string {
  const padAccount = account.replace(/-/g, "").padStart(16, "0");
  const bban = bankCode.padStart(4, "0") + padAccount;
  const check = bban + "CZ00";
  const numeric = check.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = "";
  for (const ch of numeric) {
    remainder = String(Number(remainder + ch) % 97);
  }
  const checkDigits = String(98 - Number(remainder)).padStart(2, "0");
  return `CZ${checkDigits}${bban}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { client: true, supplier: true, items: { orderBy: { order: "asc" } } },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
  }

  const { supplier: s, client: c } = invoice;
  const base = invoice.totalAmount - invoice.vatAmount;
  const iban = toIBAN(s.bankAccount, s.bankCode);

  // Items — buď z relace, nebo virtuální z legacy polí
  const items = invoice.items.length > 0
    ? invoice.items
    : [{
        id: "1",
        description: invoice.note || "Odpracované hodiny",
        quantity: invoice.hoursWorked,
        unit: "h",
        unitPrice: invoice.hourlyRate,
        vatRate: invoice.vatRate,
      }];

  // Unit code podle ISDOC (HUR = hodina, KGM = kg, ...)
  const unitCodeMap: Record<string, string> = {
    h: "HUR", ks: "PCE", kg: "KGM", m: "MTR", l: "LTR",
    den: "DAY", měsíc: "MON", year: "ANN",
  };
  const getUnitCode = (u: string) => unitCodeMap[u.toLowerCase()] ?? "PCE";

  const invoiceLines = items.map((it, idx) => {
    const lineBase = it.quantity * it.unitPrice;
    const lineVat = lineBase * (it.vatRate / 100);
    const lineTotal = lineBase + lineVat;
    return `    <InvoiceLine>
      <ID>${idx + 1}</ID>
      <InvoicedQuantity unitCode="${getUnitCode(it.unit)}">${it.quantity}</InvoicedQuantity>
      <LineExtensionAmount>${lineBase.toFixed(2)}</LineExtensionAmount>
      <LineExtensionAmountTaxInclusive>${lineTotal.toFixed(2)}</LineExtensionAmountTaxInclusive>
      <LineExtensionTaxAmount>${lineVat.toFixed(2)}</LineExtensionTaxAmount>
      <UnitPrice>${it.unitPrice.toFixed(2)}</UnitPrice>
      <UnitPriceTaxInclusive>${(it.unitPrice * (1 + it.vatRate / 100)).toFixed(2)}</UnitPriceTaxInclusive>
      <ClassifiedTaxCategory>
        <Percent>${it.vatRate}</Percent>
        <VATCalculationMethod>0</VATCalculationMethod>
      </ClassifiedTaxCategory>
      <Item>
        <Description>${escXml(it.description)}</Description>
      </Item>
    </InvoiceLine>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.1">
  <DocumentType>1</DocumentType>
  <ID>${escXml(invoice.number)}</ID>
  <UUID>${invoice.id}</UUID>
  <IssuingSystem>Prachomat</IssuingSystem>
  <IssueDate>${fmtDate(invoice.issueDate)}</IssueDate>
  <TaxPointDate>${fmtDate(invoice.issueDate)}</TaxPointDate>
  <VATApplicable>${invoice.vatRate > 0 ? "true" : "false"}</VATApplicable>
  <Note>${escXml(invoice.note ?? "")}</Note>
  <LocalCurrencyCode>CZK</LocalCurrencyCode>
  <ForeignCurrencyCode>CZK</ForeignCurrencyCode>
  <CurrRate>1</CurrRate>
  <RefCurrRate>1</RefCurrRate>
  <AccountingSupplierParty>
    <Party>
      <PartyIdentification>
        <UserID>${escXml(s.ico)}</UserID>
        <CatalogFirmIdentification>${escXml(s.ico)}</CatalogFirmIdentification>
        <ID>${escXml(s.ico)}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${escXml(s.name)}</Name>
      </PartyName>
      <PostalAddress>
        <StreetName>${escXml(s.street)}</StreetName>
        <CityName>${escXml(s.city)}</CityName>
        <PostalZone>${escXml(s.zip)}</PostalZone>
        <Country>
          <IdentificationCode>CZ</IdentificationCode>
          <Name>Česká republika</Name>
        </Country>
      </PostalAddress>${s.dic ? `
      <PartyTaxScheme>
        <CompanyID>${escXml(s.dic)}</CompanyID>
        <TaxScheme>VAT</TaxScheme>
      </PartyTaxScheme>` : ""}
    </Party>
  </AccountingSupplierParty>
  <AccountingCustomerParty>
    <Party>
      <PartyIdentification>
        <UserID>${escXml(c.ico)}</UserID>
        <CatalogFirmIdentification>${escXml(c.ico)}</CatalogFirmIdentification>
        <ID>${escXml(c.ico)}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${escXml(c.name)}</Name>
      </PartyName>
      <PostalAddress>
        <StreetName>${escXml(c.street)}</StreetName>
        <CityName>${escXml(c.city)}</CityName>
        <PostalZone>${escXml(c.zip)}</PostalZone>
        <Country>
          <IdentificationCode>CZ</IdentificationCode>
          <Name>Česká republika</Name>
        </Country>
      </PostalAddress>${c.dic ? `
      <PartyTaxScheme>
        <CompanyID>${escXml(c.dic)}</CompanyID>
        <TaxScheme>VAT</TaxScheme>
      </PartyTaxScheme>` : ""}
    </Party>
  </AccountingCustomerParty>
  <InvoiceLines>
${invoiceLines}
  </InvoiceLines>
  <TaxTotal>
    <TaxSubTotal>
      <TaxableAmount>${base.toFixed(2)}</TaxableAmount>
      <TaxAmount>${invoice.vatAmount.toFixed(2)}</TaxAmount>
      <TaxInclusiveAmount>${invoice.totalAmount.toFixed(2)}</TaxInclusiveAmount>
      <AlreadyClaimedTaxableAmount>0</AlreadyClaimedTaxableAmount>
      <AlreadyClaimedTaxAmount>0</AlreadyClaimedTaxAmount>
      <AlreadyClaimedTaxInclusiveAmount>0</AlreadyClaimedTaxInclusiveAmount>
      <DifferenceTaxableAmount>${base.toFixed(2)}</DifferenceTaxableAmount>
      <DifferenceTaxAmount>${invoice.vatAmount.toFixed(2)}</DifferenceTaxAmount>
      <DifferenceTaxInclusiveAmount>${invoice.totalAmount.toFixed(2)}</DifferenceTaxInclusiveAmount>
      <TaxCategory>
        <Percent>${invoice.vatRate}</Percent>
      </TaxCategory>
    </TaxSubTotal>
    <TaxAmount>${invoice.vatAmount.toFixed(2)}</TaxAmount>
  </TaxTotal>
  <LegalMonetaryTotal>
    <TaxExclusiveAmount>${base.toFixed(2)}</TaxExclusiveAmount>
    <TaxInclusiveAmount>${invoice.totalAmount.toFixed(2)}</TaxInclusiveAmount>
    <AlreadyClaimedTaxExclusiveAmount>0</AlreadyClaimedTaxExclusiveAmount>
    <AlreadyClaimedTaxInclusiveAmount>0</AlreadyClaimedTaxInclusiveAmount>
    <DifferenceTaxExclusiveAmount>${base.toFixed(2)}</DifferenceTaxExclusiveAmount>
    <DifferenceTaxInclusiveAmount>${invoice.totalAmount.toFixed(2)}</DifferenceTaxInclusiveAmount>
    <PayableRoundingAmount>0</PayableRoundingAmount>
    <PaidDepositsAmount>0</PaidDepositsAmount>
    <PayableAmount>${invoice.totalAmount.toFixed(2)}</PayableAmount>
  </LegalMonetaryTotal>
  <PaymentMeans>
    <Payment>
      <PaidAmount>${invoice.totalAmount.toFixed(2)}</PaidAmount>
      <PaymentMeansCode>42</PaymentMeansCode>
      <Details>
        <PaymentDueDate>${fmtDate(invoice.dueDate)}</PaymentDueDate>
        <ID>${invoice.number}</ID>
        <BankCode>${escXml(s.bankCode)}</BankCode>
        <Name>${escXml(s.bankAccount)}</Name>
        <IBAN>${iban}</IBAN>
        <VariableSymbol>${escXml(invoice.number)}</VariableSymbol>
      </Details>
    </Payment>
  </PaymentMeans>
</Invoice>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="faktura-${invoice.number}.isdoc"`,
    },
  });
}
