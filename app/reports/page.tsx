import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import Link from "next/link";
import { YearSwitcher } from "./year-switcher";
import { MonthSwitcher } from "./month-switcher";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ year?: string; month?: string }>;

const MONTHS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function fmt(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { year, month } = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = Number(year ?? currentYear);
  const selectedMonth = month ? Math.max(1, Math.min(12, Number(month))) : null;

  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear + 1, 0, 1);

  const prevYearStart = new Date(selectedYear - 1, 0, 1);
  const prevYearEnd = new Date(selectedYear, 0, 1);

  const [invoices, allYears, receipts, prevYearInvoices, paidInvoices] = await Promise.all([
    db.invoice.findMany({
      where: { issueDate: { gte: yearStart, lt: yearEnd } },
      include: { client: true },
      orderBy: { issueDate: "asc" },
    }),
    db.invoice.findMany({ select: { issueDate: true } }),
    db.receipt.findMany({
      where: { date: { gte: yearStart, lt: yearEnd }, status: { in: ["approved", "sent"] } },
      orderBy: { date: "asc" },
    }),
    // Předchozí rok — pro YoY srovnání
    db.invoice.findMany({
      where: { issueDate: { gte: prevYearStart, lt: prevYearEnd } },
      select: { issueDate: true, totalAmount: true },
    }),
    // Platební historie — pro "nejhorší platiče"
    db.invoice.findMany({
      where: { status: "PAID", updatedAt: { gte: new Date(selectedYear - 1, 0, 1) } },
      include: { client: { select: { id: true, name: true } } },
    }),
  ]);

  const years = [...new Set(allYears.map((i) => new Date(i.issueDate).getFullYear()))].sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  // Měsíční data
  const monthlyData = MONTHS.map((label, i) => {
    const monthInvoices = invoices.filter((inv) => new Date(inv.issueDate).getMonth() === i);
    const monthReceipts = receipts.filter((r) => new Date(r.date).getMonth() === i);
    const vatOutput = monthInvoices.reduce((s, inv) => s + inv.vatAmount, 0);
    const vatInput = monthReceipts.reduce((s, r) => s + r.vatAmount, 0);
    return {
      label,
      invoiced: monthInvoices.reduce((s, inv) => s + inv.totalAmount, 0),
      paid: monthInvoices.filter((inv) => inv.status === "PAID").reduce((s, inv) => s + inv.totalAmount, 0),
      hours: monthInvoices.reduce((s, inv) => s + inv.hoursWorked, 0),
      count: monthInvoices.length,
      vatOutput,
      vatInput,
      vatToPay: Math.max(vatOutput - vatInput, 0),
    };
  });

  const totalInvoiced = monthlyData.reduce((s, m) => s + m.invoiced, 0);
  const totalPaid = monthlyData.reduce((s, m) => s + m.paid, 0);
  const totalHours = monthlyData.reduce((s, m) => s + m.hours, 0);
  const totalVatOutput = monthlyData.reduce((s, m) => s + m.vatOutput, 0);
  const totalVatInput = monthlyData.reduce((s, m) => s + m.vatInput, 0);
  const totalVatToPay = Math.max(totalVatOutput - totalVatInput, 0);
  const maxInvoiced = Math.max(...monthlyData.map((m) => m.invoiced), 1);

  // YoY srovnání — per měsíc
  const prevYearMonthly = MONTHS.map((_, i) => {
    return prevYearInvoices
      .filter((inv) => new Date(inv.issueDate).getMonth() === i)
      .reduce((s, inv) => s + inv.totalAmount, 0);
  });

  // Nejhorší platiči — průměrná doba od issueDate do updatedAt (= den zaplacení)
  const paymentByClient = new Map<string, { name: string; totalDays: number; count: number; totalAmount: number }>();
  for (const inv of paidInvoices) {
    const days = Math.max(Math.floor((new Date(inv.updatedAt).getTime() - new Date(inv.issueDate).getTime()) / 86400000), 0);
    const existing = paymentByClient.get(inv.clientId) ?? { name: inv.client.name, totalDays: 0, count: 0, totalAmount: 0 };
    existing.totalDays += days;
    existing.count += 1;
    existing.totalAmount += inv.totalAmount;
    paymentByClient.set(inv.clientId, existing);
  }
  const paymentRanking = [...paymentByClient.values()]
    .map((c) => ({ ...c, avgDays: Math.round(c.totalDays / c.count) }))
    .sort((a, b) => b.avgDays - a.avgDays);

  // Breakdown podle odběratelů
  const clientMap = new Map<string, { name: string; invoiced: number; paid: number; hours: number; count: number }>();
  for (const inv of invoices) {
    const existing = clientMap.get(inv.clientId) ?? { name: inv.client.name, invoiced: 0, paid: 0, hours: 0, count: 0 };
    existing.invoiced += inv.totalAmount;
    if (inv.status === "PAID") existing.paid += inv.totalAmount;
    existing.hours += inv.hoursWorked;
    existing.count += 1;
    clientMap.set(inv.clientId, existing);
  }
  const clientData = [...clientMap.values()].sort((a, b) => b.invoiced - a.invoiced);

  const currentMonth = new Date().getMonth();

  // Detailní data pro vybraný měsíc
  const monthInvoices = selectedMonth
    ? invoices.filter((inv) => new Date(inv.issueDate).getMonth() === selectedMonth - 1)
    : [];
  const monthReceipts = selectedMonth
    ? receipts.filter((r) => new Date(r.date).getMonth() === selectedMonth - 1)
    : [];
  const mData = selectedMonth ? monthlyData[selectedMonth - 1] : null;

  if (invoices.length === 0 && allYears.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Statistiky</p>
          <h1 className="text-3xl font-bold tracking-tight">Výkazy</h1>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-20 text-center">
          <p className="text-foreground font-semibold mb-1">Zatím žádná data</p>
          <p className="text-muted-foreground text-sm">Výkazy se zobrazí jakmile vytvoříš první faktury.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Statistiky</p>
            <h1 className="text-3xl font-bold tracking-tight">
              Výkazy {selectedMonth && <span className="text-muted-foreground font-normal">· {MONTHS[selectedMonth - 1]}</span>}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`/api/reports/tax-summary?year=${selectedYear}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-input bg-transparent text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              CSV přehled
            </a>
            <a
              href={`/api/invoices/pohoda-export?year=${selectedYear}${selectedMonth ? `&month=${selectedMonth}` : ""}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-input bg-transparent text-xs font-medium hover:bg-muted/50 transition-colors"
              title="Export do SW Pohoda"
            >
              Pohoda XML
            </a>
            {selectedMonth && (
              <>
                <a
                  href={`/api/tax/kh1?year=${selectedYear}&month=${selectedMonth}`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-input bg-transparent text-xs font-medium hover:bg-muted/50 transition-colors"
                  title="Kontrolní hlášení DPH"
                >
                  KH DPH
                </a>
                <a
                  href={`/api/tax/dp3?year=${selectedYear}&month=${selectedMonth}`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-input bg-transparent text-xs font-medium hover:bg-muted/50 transition-colors"
                  title="Přiznání k DPH"
                >
                  Přiznání DPH
                </a>
              </>
            )}
            <Suspense>
              <YearSwitcher years={years} currentYear={selectedYear} />
            </Suspense>
          </div>
        </div>
        <Suspense>
          <MonthSwitcher currentMonth={selectedMonth} />
        </Suspense>
      </div>

      {/* Souhrn — roční nebo měsíční */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {(selectedMonth && mData
          ? [
              { label: "Fakturováno", value: fmt(mData.invoiced), sub: `${mData.count} faktur` },
              { label: "Zaplaceno", value: fmt(mData.paid), sub: mData.invoiced > 0 ? `${Math.round(mData.paid / mData.invoiced * 100)} %` : "0 %" },
              { label: "DPH na výstupu", value: fmt(mData.vatOutput), sub: "z faktur" },
              { label: "DPH na vstupu", value: fmt(mData.vatInput), sub: `${monthReceipts.length} účtenek` },
              { label: "DPH k platbě", value: fmt(mData.vatToPay), sub: MONTHS[selectedMonth - 1] },
            ]
          : [
              { label: "Fakturováno", value: fmt(totalInvoiced), sub: `${invoices.length} faktur` },
              { label: "Zaplaceno", value: fmt(totalPaid), sub: totalInvoiced > 0 ? `${Math.round(totalPaid / totalInvoiced * 100)} %` : "0 %" },
              { label: "DPH na výstupu", value: fmt(totalVatOutput), sub: "z vystavených faktur" },
              { label: "DPH na vstupu", value: fmt(totalVatInput), sub: `${receipts.length} účtenek` },
              { label: "DPH k platbě", value: fmt(totalVatToPay), sub: "roční souhrn" },
            ]
        ).map(({ label, value, sub }) => (
          <div key={label} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Měsíční detail — faktury a účtenky */}
      {selectedMonth && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Faktury v měsíci */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">Faktury ({monthInvoices.length})</h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {mData ? fmt(mData.invoiced) : ""}
              </p>
            </div>
            {monthInvoices.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-10 text-center">
                <p className="text-sm text-muted-foreground">V tomto měsíci nebyly vystavené žádné faktury.</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
                {monthInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{inv.number}</p>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded text-muted-foreground bg-muted">
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.client.name} · {new Date(inv.issueDate).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold tabular-nums">{fmt(inv.totalAmount)}</p>
                      {inv.vatAmount > 0 && (
                        <p className="text-[11px] text-muted-foreground">DPH {fmt(inv.vatAmount)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Účtenky v měsíci */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">Účtenky ({monthReceipts.length})</h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {fmt(monthReceipts.reduce((s, r) => s + r.totalAmount, 0))}
              </p>
            </div>
            {monthReceipts.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  V tomto měsíci nejsou žádné schválené účtenky.
                </p>
                <Link href={`/receipts?month=${selectedYear}-${String(selectedMonth).padStart(2, "0")}`} className="text-primary text-xs font-medium mt-2 inline-block hover:underline">
                  Přidat účtenky →
                </Link>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
                {monthReceipts.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {r.vendor || <span className="text-muted-foreground italic">Bez názvu</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(r.date).toLocaleDateString("cs-CZ")}
                        {r.vendorIco ? ` · IČ ${r.vendorIco}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold tabular-nums">{fmt(r.totalAmount)}</p>
                      {r.vatAmount > 0 && (
                        <p className="text-[11px] text-muted-foreground">DPH {fmt(r.vatAmount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Měsíční přehled — pouze když je vybraný celý rok */}
      {!selectedMonth && (
      <div>
        <h2 className="text-lg font-semibold mb-4">Měsíc po měsíci</h2>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Měsíc</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fakturováno</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Zaplaceno</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">DPH k platbě</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Hodin</th>
                <th className="px-5 py-3 hidden lg:table-cell w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {monthlyData.map((m, i) => {
                const isFuture = selectedYear === currentYear && i > currentMonth;
                const isEmpty = m.count === 0;
                return (
                  <tr
                    key={m.label}
                    className={cn(
                      "transition-colors",
                      isFuture ? "opacity-35" : isEmpty ? "opacity-50" : "hover:bg-muted/30",
                      !isFuture && i === currentMonth && selectedYear === currentYear ? "bg-primary/5" : ""
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-foreground">{m.label}</span>
                      {m.count > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">{m.count} fakt.</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {m.invoiced > 0 ? fmt(m.invoiced) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums hidden md:table-cell">
                      {m.paid > 0 ? (
                        <span className="text-emerald-600 font-medium">{fmt(m.paid)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums hidden md:table-cell">
                      {m.vatToPay > 0 ? (
                        <span className="text-violet-600 font-medium">{fmt(m.vatToPay)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                      {m.hours > 0 ? `${m.hours} h` : "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{ width: m.invoiced > 0 ? `${(m.invoiced / maxInvoiced) * 100}%` : "0%" }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/50 bg-muted/30 font-semibold">
                <td className="px-5 py-3.5 text-sm">Celkem {selectedYear}</td>
                <td className="px-5 py-3.5 text-right tabular-nums">{fmt(totalInvoiced)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-emerald-600 hidden md:table-cell">{fmt(totalPaid)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-violet-600 hidden md:table-cell">{fmt(totalVatToPay)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{totalHours} h</td>
                <td className="hidden lg:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* Breakdown podle odběratelů — jen v ročním pohledu */}
      {!selectedMonth && clientData.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Podle odběratelů</h2>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Odběratel</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fakturováno</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Zaplaceno</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Hodin</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Faktur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {clientData.map((c) => (
                  <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">{c.name}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{fmt(c.invoiced)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-emerald-600 hidden md:table-cell">
                      {c.paid > 0 ? fmt(c.paid) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{c.hours} h</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YoY srovnání — jen roční pohled */}
      {!selectedMonth && prevYearInvoices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Srovnání {selectedYear} vs. {selectedYear - 1}</h2>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Měsíc</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{selectedYear - 1}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{selectedYear}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Změna</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {monthlyData.map((m, i) => {
                  const prev = prevYearMonthly[i];
                  const curr = m.invoiced;
                  const diff = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
                  return (
                    <tr key={m.label} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium">{m.label}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{prev > 0 ? fmt(prev) : "—"}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold">{curr > 0 ? fmt(curr) : "—"}</td>
                      <td className={cn(
                        "px-5 py-3 text-right tabular-nums font-medium",
                        diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nejhorší platiči — jen roční pohled a pokud jsou data */}
      {!selectedMonth && paymentRanking.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Doba úhrady po klientech</h2>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Klient</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ø dny</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Faktur</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Celkem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paymentRanking.map((c) => (
                  <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className={cn(
                      "px-5 py-3 text-right tabular-nums font-semibold",
                      c.avgDays > 30 ? "text-red-600" : c.avgDays > 14 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {c.avgDays} dní
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">{c.count}</td>
                    <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell">{fmt(c.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
