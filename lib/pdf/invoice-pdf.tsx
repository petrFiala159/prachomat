import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// Výchozí paleta — barva akcentu se přepíše z supplier.pdfAccentColor
const c = {
  ink:      "#111827",
  sub:      "#6B7280",
  faint:    "#F9FAFB",
  border:   "#E5E7EB",
  white:    "#FFFFFF",
};

const PH = 52;

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: c.ink,
    backgroundColor: c.white,
  },

  // Tenký barevný pruh nahoře
  topStripe: {
    height: 4,
    backgroundColor: c.stripe,
  },

  // ── HEADER ───────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: PH,
    paddingTop: 32,
    paddingBottom: 28,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceWord: {
    fontSize: 22,
    fontWeight: 700,
    color: c.ink,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  invoiceNum: {
    fontSize: 11,
    color: c.sub,
  },

  // ── SEPARATOR ────────────────────────────────────────
  sep: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: PH,
  },

  // ── PARTIES ──────────────────────────────────────────
  parties: {
    flexDirection: "row",
    paddingHorizontal: PH,
    paddingVertical: 24,
    gap: 24,
  },
  partyBox:   { flex: 1 },
  partyLabel: { fontSize: 7, fontWeight: 700, color: c.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  partyName:  { fontSize: 10, fontWeight: 700, color: c.ink, marginBottom: 3 },
  partyLine:  { fontSize: 8.5, color: c.sub, lineHeight: 1.5 },

  // ── DATES ────────────────────────────────────────────
  dates: {
    flexDirection: "row",
    paddingHorizontal: PH,
    paddingBottom: 24,
    gap: 32,
  },
  dateBlock: { gap: 3 },
  dateLabel: { fontSize: 7, fontWeight: 700, color: c.sub, textTransform: "uppercase", letterSpacing: 1 },
  dateValue: { fontSize: 9.5, fontWeight: 700, color: c.ink },

  // ── TABLE ────────────────────────────────────────────
  tableWrapper: { paddingHorizontal: PH },
  tableHead: {
    flexDirection: "row",
    backgroundColor: c.faint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  thText: {
    fontSize: 7,
    fontWeight: 700,
    color: c.sub,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tdText:   { fontSize: 9, color: c.ink },
  colDesc:  { flex: 1 },
  colQty:   { width: 40, textAlign: "right" },
  colUnit:  { width: 30, textAlign: "center", color: c.sub },
  colPrice: { width: 68, textAlign: "right" },
  colVat:   { width: 38, textAlign: "right" },
  colTotal: { width: 80, textAlign: "right" },

  // ── TOTALS ───────────────────────────────────────────
  totalsSection: {
    paddingHorizontal: PH,
    alignItems: "flex-end",
    paddingTop: 16,
    paddingBottom: 24,
  },
  totalsBox: { width: 260 },
  subRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  subLabel: { fontSize: 8.5, color: c.sub },
  subValue: { fontSize: 8.5, color: c.ink },
  grandSep: {
    height: 1,
    backgroundColor: c.ink,
    marginVertical: 6,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  grandLabel: { fontSize: 9, fontWeight: 700, color: c.ink },
  grandValue: { fontSize: 16, fontWeight: 700, color: c.ink },

  // ── FOOTER ───────────────────────────────────────────
  footer: {
    flexDirection: "row",
    paddingHorizontal: PH,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 24,
  },
  payBox:   { flex: 1 },
  payLabel: { fontSize: 7, fontWeight: 700, color: c.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  payRow:   { flexDirection: "row", marginBottom: 4 },
  payKey:   { fontSize: 8, color: c.sub, width: 96 },
  payVal:   { fontSize: 8, color: c.ink, fontWeight: 700 },
  qrLabel:  { fontSize: 7, color: c.sub, textAlign: "center", marginTop: 4 },
});

type InvoiceItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

type Props = {
  invoice: {
    number: string;
    issueDate: Date;
    dueDate: Date;
    hoursWorked: number;
    hourlyRate: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    note: string | null;
    currency?: string;
    exchangeRate?: number;
    reverseCharge?: boolean;
    language?: string;
    invoiceType?: string;
    roundingAmount?: number;
    items?: InvoiceItem[];
    supplier: {
      name: string; street: string; city: string; zip: string;
      ico: string; dic: string | null;
      bankAccount: string; bankCode: string;
      vatPayer: boolean; logo: string | null;
      pdfAccentColor?: string;
      pdfFooterText?: string | null;
      pdfTerms?: string | null;
    };
    client: {
      name: string; street: string; city: string; zip: string;
      ico: string; dic: string | null;
    };
  };
  iban: string;
  qrDataUrl: string;
};

type Lang = "cs" | "en";
const L = {
  cs: {
    invoice: "FAKTURA",
    invoiceNo: "č.",
    supplier: "Dodavatel",
    client: "Odběratel",
    issueDate: "Datum vystavení",
    dueDate: "Datum splatnosti",
    description: "Popis",
    quantity: "Množství",
    unit: "J.",
    pricePerUnit: "Cena/j.",
    vat: "DPH",
    total: "Celkem",
    taxBase: "Základ daně",
    vatRate: "DPH",
    grandTotal: "Celkem k úhradě",
    paymentDetails: "Platební údaje",
    bankAccount: "Číslo účtu",
    iban: "IBAN",
    vs: "Variabilní symbol",
    qrPayment: "QR platba",
    notVatPayer: "Nejsem plátce DPH.",
    reverseCharge: "Daň odvede zákazník (přenesená daňová povinnost, § 92a zákona č. 235/2004 Sb.).",
    exchangeRate: (from: string, rate: number) => `Kurz ČNB: 1 ${from} = ${rate.toFixed(3)} CZK`,
    equivCzk: "Ekvivalent v Kč",
  },
  en: {
    invoice: "INVOICE",
    invoiceNo: "No.",
    supplier: "Supplier",
    client: "Customer",
    issueDate: "Issue date",
    dueDate: "Due date",
    description: "Description",
    quantity: "Quantity",
    unit: "Unit",
    pricePerUnit: "Unit price",
    vat: "VAT",
    total: "Total",
    taxBase: "Tax base",
    vatRate: "VAT",
    grandTotal: "Total to pay",
    paymentDetails: "Payment details",
    bankAccount: "Bank account",
    iban: "IBAN",
    vs: "Variable symbol",
    qrPayment: "QR payment",
    notVatPayer: "Not a VAT payer.",
    reverseCharge: "Reverse charge — VAT to be accounted for by the customer (Article 196 of the Council Directive 2006/112/EC).",
    exchangeRate: (from: string, rate: number) => `CNB rate: 1 ${from} = ${rate.toFixed(3)} CZK`,
    equivCzk: "Equivalent in CZK",
  },
};

const fmt = (n: number, currency = "CZK") =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

export function InvoicePDF({ invoice, iban, qrDataUrl }: Props) {
  const { supplier, client } = invoice;
  const currency = invoice.currency ?? "CZK";
  const base = invoice.totalAmount - invoice.vatAmount;
  const reverseCharge = Boolean(invoice.reverseCharge);
  const showVatPayer = supplier.vatPayer && !reverseCharge;
  const accent = supplier.pdfAccentColor || "#111827";
  const lang: Lang = (invoice.language as Lang) === "en" ? "en" : "cs";
  const t = L[lang];
  const exchangeRate = invoice.exchangeRate ?? 1;
  const showEquiv = currency !== "CZK" && exchangeRate > 0;
  const invoiceType = (invoice as { invoiceType?: string }).invoiceType ?? "regular";
  const titleMap: Record<string, string> = {
    regular: t.invoice,
    deposit: lang === "cs" ? "ZÁLOHOVÁ FAKTURA" : "DEPOSIT INVOICE",
    proforma: "PROFORMA",
    settlement: lang === "cs" ? "VYÚČTOVACÍ FAKTURA" : "SETTLEMENT INVOICE",
    credit: lang === "cs" ? "DOBROPIS" : "CREDIT NOTE",
  };
  const pdfTitle = titleMap[invoiceType] ?? t.invoice;

  // Položky — buď z relace, nebo virtuální z legacy polí
  const items: InvoiceItem[] = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items
    : [{
        description: invoice.note?.trim() || "Odpracované hodiny",
        quantity: invoice.hoursWorked,
        unit: "h",
        unitPrice: invoice.hourlyRate,
        vatRate: invoice.vatRate,
      }];

  // Souhrn DPH po sazbách
  const vatByRate = new Map<number, { base: number; vat: number }>();
  for (const it of items) {
    const lineBase = it.quantity * it.unitPrice;
    const lineVat = lineBase * (it.vatRate / 100);
    const existing = vatByRate.get(it.vatRate) ?? { base: 0, vat: 0 };
    existing.base += lineBase;
    existing.vat += lineVat;
    vatByRate.set(it.vatRate, existing);
  }
  const vatRates = [...vatByRate.keys()].sort((a, b) => b - a);

  return (
    <Document title={`Faktura ${invoice.number}`} author={supplier.name}>
      <Page size="A4" style={s.page}>

        {/* Tenký pruh nahoře */}
        <View style={[s.topStripe, { backgroundColor: accent }]} />

        {/* ── HEADER: logo + název faktury ── */}
        <View style={s.header}>
          {supplier.logo ? (
            <Image src={supplier.logo} style={{ height: 90, alignSelf: "flex-start" }} />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, backgroundColor: c.ink, borderRadius: 5, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: c.white, fontSize: 14, fontWeight: 700 }}>P</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: 700, color: c.ink }}>Prachomat</Text>
            </View>
          )}
          <View style={s.headerRight}>
            <Text style={[s.invoiceWord, { color: accent }]}>{pdfTitle}</Text>
            <Text style={s.invoiceNum}>{t.invoiceNo} {invoice.number}</Text>
          </View>
        </View>

        <View style={s.sep} />

        {/* ── STRANY ── */}
        <View style={s.parties}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>{t.supplier}</Text>
            <Text style={s.partyName}>{supplier.name}</Text>
            <Text style={s.partyLine}>{supplier.street}</Text>
            <Text style={s.partyLine}>{supplier.zip} {supplier.city}</Text>
            <Text style={[s.partyLine, { marginTop: 5 }]}>{lang === "cs" ? "IČO" : "Reg. No."}: {supplier.ico}</Text>
            {supplier.dic ? <Text style={s.partyLine}>{lang === "cs" ? "DIČ" : "VAT No."}: {supplier.dic}</Text> : null}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>{t.client}</Text>
            <Text style={s.partyName}>{client.name}</Text>
            <Text style={s.partyLine}>{client.street}</Text>
            <Text style={s.partyLine}>{client.zip} {client.city}</Text>
            <Text style={[s.partyLine, { marginTop: 5 }]}>{lang === "cs" ? "IČO" : "Reg. No."}: {client.ico}</Text>
            {client.dic ? <Text style={s.partyLine}>{lang === "cs" ? "DIČ" : "VAT No."}: {client.dic}</Text> : null}
          </View>
        </View>

        <View style={s.sep} />

        {/* ── DATUMY ── */}
        <View style={s.dates}>
          <View style={s.dateBlock}>
            <Text style={s.dateLabel}>{t.issueDate}</Text>
            <Text style={s.dateValue}>{fmtDate(invoice.issueDate)}</Text>
          </View>
          <View style={s.dateBlock}>
            <Text style={s.dateLabel}>{t.dueDate}</Text>
            <Text style={s.dateValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          {showEquiv && (
            <View style={s.dateBlock}>
              <Text style={s.dateLabel}>{t.exchangeRate(currency, exchangeRate).split(":")[0]}</Text>
              <Text style={s.dateValue}>1 {currency} = {exchangeRate.toFixed(3)} CZK</Text>
            </View>
          )}
        </View>

        {/* ── TABULKA POLOŽEK ── */}
        <View style={s.tableWrapper}>
          <View style={s.tableHead}>
            <Text style={[s.thText, s.colDesc]}>{t.description}</Text>
            <Text style={[s.thText, s.colQty]}>{t.quantity}</Text>
            <Text style={[s.thText, s.colUnit]}>{t.unit}</Text>
            <Text style={[s.thText, s.colPrice]}>{t.pricePerUnit}</Text>
            {showVatPayer && <Text style={[s.thText, s.colVat]}>{t.vat}</Text>}
            <Text style={[s.thText, s.colTotal]}>{t.total}</Text>
          </View>
          {items.map((it, idx) => {
            const lineBase = it.quantity * it.unitPrice;
            return (
              <View key={idx} style={s.tableRow}>
                <Text style={[s.tdText, s.colDesc]}>{it.description}</Text>
                <Text style={[s.tdText, s.colQty]}>{it.quantity}</Text>
                <Text style={[s.tdText, s.colUnit]}>{it.unit}</Text>
                <Text style={[s.tdText, s.colPrice]}>{fmt(it.unitPrice, currency)}</Text>
                {showVatPayer && <Text style={[s.tdText, s.colVat]}>{it.vatRate}%</Text>}
                <Text style={[s.tdText, s.colTotal, { fontWeight: 700 }]}>
                  {fmt(lineBase, currency)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── CELKOVÁ ČÁSTKA ── */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            {showVatPayer && vatRates.length > 0 && (
              <>
                <View style={s.subRow}>
                  <Text style={s.subLabel}>{t.taxBase}</Text>
                  <Text style={s.subValue}>{fmt(base, currency)}</Text>
                </View>
                {vatRates.map((rate) => {
                  const v = vatByRate.get(rate)!;
                  return (
                    <View key={rate} style={s.subRow}>
                      <Text style={s.subLabel}>{t.vatRate} {rate} %</Text>
                      <Text style={s.subValue}>{fmt(v.vat, currency)}</Text>
                    </View>
                  );
                })}
              </>
            )}
            <View style={s.grandSep} />
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>{t.grandTotal}</Text>
              <Text style={s.grandValue}>{fmt(invoice.totalAmount, currency)}</Text>
            </View>
            {showEquiv && (
              <View style={[s.subRow, { marginTop: 6 }]}>
                <Text style={s.subLabel}>{t.equivCzk}</Text>
                <Text style={s.subValue}>{fmt(invoice.totalAmount * exchangeRate, "CZK")}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.sep} />

        {/* ── PLATEBNÍ ÚDAJE + QR ── */}
        <View style={s.footer}>
          <View style={s.payBox}>
            <Text style={s.payLabel}>{t.paymentDetails}</Text>
            <View style={s.payRow}>
              <Text style={s.payKey}>{t.bankAccount}</Text>
              <Text style={s.payVal}>{supplier.bankAccount}/{supplier.bankCode}</Text>
            </View>
            <View style={s.payRow}>
              <Text style={s.payKey}>{t.iban}</Text>
              <Text style={s.payVal}>{iban}</Text>
            </View>
            <View style={s.payRow}>
              <Text style={s.payKey}>{t.vs}</Text>
              <Text style={s.payVal}>{invoice.number}</Text>
            </View>
          </View>
          <View style={{ alignItems: "center", justifyContent: "flex-start" }}>
            <Image src={qrDataUrl} style={{ width: 80, height: 80 }} />
            <Text style={s.qrLabel}>{t.qrPayment}</Text>
          </View>
        </View>

        {invoiceType === "proforma" && (
          <View style={{ paddingHorizontal: PH, paddingTop: 8 }}>
            <Text style={{ fontSize: 8, color: c.sub, fontWeight: 700 }}>
              {lang === "cs"
                ? "Tento doklad není daňovým dokladem."
                : "This document is not a tax invoice."}
            </Text>
          </View>
        )}

        {reverseCharge && (
          <View style={{ paddingHorizontal: PH, paddingTop: 8 }}>
            <Text style={{ fontSize: 8, color: c.ink, fontWeight: 700 }}>{t.reverseCharge}</Text>
          </View>
        )}

        {!supplier.vatPayer && !reverseCharge && (
          <View style={{ paddingHorizontal: PH }}>
            <Text style={{ fontSize: 7.5, color: c.sub }}>{t.notVatPayer}</Text>
          </View>
        )}

        {supplier.pdfTerms && (
          <View style={{ paddingHorizontal: PH, paddingTop: 12 }}>
            <Text style={{ fontSize: 7.5, color: c.sub, lineHeight: 1.5 }}>{supplier.pdfTerms}</Text>
          </View>
        )}

        {supplier.pdfFooterText && (
          <View style={{ paddingHorizontal: PH, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 7, color: c.sub, textAlign: "center" }}>{supplier.pdfFooterText}</Text>
          </View>
        )}

      </Page>
    </Document>
  );
}
