import { db } from "@/lib/db";
import Link from "next/link";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock, AlertCircle, FileText, Users, ChevronRight, Plus } from "lucide-react";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RemindAllButton } from "@/components/dashboard/remind-all-button";
import { AiInvoiceBar } from "@/components/dashboard/ai-invoice-bar";
import { FioSyncButton } from "@/components/dashboard/fio-sync-button";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";
import { nextInvoiceNumber } from "@/lib/invoice-number";

export const dynamic = "force-dynamic";

const MONTHS_CS = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const MONTHS_SHORT = ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"];

function formatCZK(amount: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:   { label: "Koncept",       className: "bg-zinc-100 text-zinc-500" },
  SENT:    { label: "Odesláno",      className: "bg-blue-50 text-blue-600" },
  PAID:    { label: "Zaplaceno",     className: "bg-emerald-50 text-emerald-600" },
  OVERDUE: { label: "Po splatnosti", className: "bg-red-50 text-red-600" },
};

function StatusBadge({ status }: { status: string }) {
  const { label, className } = statusConfig[status] ?? { label: status, className: "bg-zinc-100 text-zinc-500" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}>
      {label}
    </span>
  );
}

async function generateRecurringInvoices() {
  const now = new Date();
  const templates = await db.invoiceTemplate.findMany({
    where: { recurring: true, active: true, nextRunAt: { lte: now } },
  });
  if (templates.length === 0) return;

  const supplier = await db.supplier.findFirst();
  if (!supplier) return;

  for (const t of templates) {
    const base = t.hoursWorked * t.hourlyRate;
    const vatRate = supplier.vatPayer ? (supplier.vatRate ?? 21) : 0;
    const vatAmount = Math.round(base * vatRate / 100);
    const totalAmount = base + vatAmount;
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + t.dueDays);

    const number = await nextInvoiceNumber();

    await db.invoice.create({
      data: {
        number, issueDate: now, dueDate,
        hoursWorked: t.hoursWorked, hourlyRate: t.hourlyRate,
        vatRate, vatAmount, totalAmount,
        status: "DRAFT", note: t.note,
        supplierId: supplier.id, clientId: t.clientId,
        items: {
          create: [{
            description: t.note || "Odpracované hodiny",
            quantity: t.hoursWorked, unit: "h", unitPrice: t.hourlyRate,
            vatRate, order: 0,
          }],
        },
      },
    });

    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + t.intervalDays);
    await db.invoiceTemplate.update({ where: { id: t.id }, data: { lastRunAt: now, nextRunAt: nextRun } });
  }
}

export default async function DashboardPage() {
  await generateRecurringInvoices();

  await db.invoice.updateMany({
    where: { status: "SENT", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const in7days = new Date(now);
  in7days.setDate(in7days.getDate() + 7);

  const in90days = new Date(now);
  in90days.setDate(in90days.getDate() + 90);

  const [invoiceCount, clientCount, paidThisYear, pendingAmount, overdueInvoices, dueSoonInvoices, recentInvoices, chartInvoices, supplierInfo, cashflowInvoices] =
    await Promise.all([
      db.invoice.count({ where: { issueDate: { gte: yearStart } } }),
      db.client.count(),
      db.invoice.aggregate({ where: { status: "PAID", issueDate: { gte: yearStart } }, _sum: { totalAmount: true } }),
      db.invoice.aggregate({ where: { status: { in: ["SENT", "OVERDUE"] } }, _sum: { totalAmount: true } }),
      db.invoice.findMany({ where: { status: "OVERDUE" }, include: { client: true }, orderBy: { dueDate: "asc" } }),
      db.invoice.findMany({
        where: { status: "SENT", dueDate: { gte: now, lte: in7days } },
        include: { client: true },
        orderBy: { dueDate: "asc" },
      }),
      db.invoice.findMany({ orderBy: { issueDate: "desc" }, take: 5, include: { client: true } }),
      db.invoice.findMany({
        where: { issueDate: { gte: chartStart } },
        select: { issueDate: true, totalAmount: true, status: true },
      }),
      db.supplier.findFirst({ select: { id: true, name: true, fioToken: true } }),
      db.invoice.findMany({
        where: { status: { in: ["SENT", "OVERDUE"] }, dueDate: { lte: in90days } },
        select: { dueDate: true, totalAmount: true, status: true },
      }),
    ]);

  const hasFio = Boolean(supplierInfo?.fioToken);
  const needsOnboarding = !supplierInfo || !supplierInfo.name;

  // Cash flow prognóza 30/60/90 dní
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
  const in60 = new Date(now); in60.setDate(in60.getDate() + 60);
  // Predikce z recurring šablon — kolik přibude za 30/60/90 dní
  const recurringTemplates = await db.invoiceTemplate.findMany({
    where: { recurring: true, active: true },
  });
  const supVatRate = supplierInfo?.id ? (await db.supplier.findFirst({ select: { vatPayer: true, vatRate: true } })) : null;
  const sVat = supVatRate?.vatPayer ? (supVatRate.vatRate ?? 21) : 0;
  let recurringIn30 = 0, recurringIn60 = 0, recurringIn90 = 0;
  for (const t of recurringTemplates) {
    const base = t.hoursWorked * t.hourlyRate;
    const total = base + Math.round(base * sVat / 100);
    const runsIn30 = Math.floor(30 / t.intervalDays);
    const runsIn60 = Math.floor(60 / t.intervalDays);
    const runsIn90 = Math.floor(90 / t.intervalDays);
    recurringIn30 += total * Math.max(runsIn30, 0);
    recurringIn60 += total * Math.max(runsIn60, 0);
    recurringIn90 += total * Math.max(runsIn90, 0);
  }

  const pendingIn30 = cashflowInvoices.filter((i) => new Date(i.dueDate) <= in30).reduce((s, i) => s + i.totalAmount, 0);
  const pendingIn60 = cashflowInvoices.filter((i) => new Date(i.dueDate) <= in60).reduce((s, i) => s + i.totalAmount, 0);
  const pendingIn90 = cashflowInvoices.reduce((s, i) => s + i.totalAmount, 0);

  const cashflow = {
    in30: pendingIn30 + recurringIn30,
    in60: pendingIn60 + recurringIn60,
    in90: pendingIn90 + recurringIn90,
    overdue: cashflowInvoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.totalAmount, 0),
    recurringIn90,
  };

  // Posledních 12 měsíců pro graf
  const chartMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthInvoices = chartInvoices.filter((inv) => {
      const id = new Date(inv.issueDate);
      return id.getFullYear() === y && id.getMonth() === m;
    });
    return {
      label: `${MONTHS_CS[m]} ${y}`,
      shortLabel: MONTHS_SHORT[m],
      invoiced: monthInvoices.reduce((s, inv) => s + inv.totalAmount, 0),
      paid: monthInvoices.filter((inv) => inv.status === "PAID").reduce((s, inv) => s + inv.totalAmount, 0),
    };
  });

  const stats = [
    { label: `Zaplaceno ${now.getFullYear()}`, value: formatCZK(paidThisYear._sum.totalAmount ?? 0), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Čeká na platbu", value: formatCZK(pendingAmount._sum.totalAmount ?? 0), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: `Faktury ${now.getFullYear()}`, value: String(invoiceCount), icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Odběratelé", value: String(clientCount), icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Vítej zpět</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Přehled</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasFio && <FioSyncButton />}
          <Link href="/invoices/new" className={cn(buttonVariants(), "rounded-full gap-1.5")}>
            <Plus className="h-4 w-4" />
            Nová faktura
          </Link>
        </div>
      </div>

      {/* Onboarding — jen pokud dodavatel není nastavený */}
      {needsOnboarding && <OnboardingWizard />}

      {/* AI bar */}
      {!needsOnboarding && <AiInvoiceBar />}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card rounded-2xl p-5 shadow-sm border border-border/50">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-4", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Cash flow prognóza */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Cash flow prognóza</p>
            <p className="text-xs text-muted-foreground">Očekávané příjmy z nesplacených faktur</p>
          </div>
          <div className="text-right space-y-0.5">
            {cashflow.overdue > 0 && (
              <p className="text-xs text-red-600">⚠ {formatCZK(cashflow.overdue)} po splatnosti</p>
            )}
            {cashflow.recurringIn90 > 0 && (
              <p className="text-[11px] text-muted-foreground">z toho {formatCZK(cashflow.recurringIn90)} z recurring šablon</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Do 30 dní", value: cashflow.in30, pct: cashflow.in90 > 0 ? (cashflow.in30 / cashflow.in90) * 100 : 0 },
            { label: "Do 60 dní", value: cashflow.in60, pct: cashflow.in90 > 0 ? (cashflow.in60 / cashflow.in90) * 100 : 0 },
            { label: "Do 90 dní", value: cashflow.in90, pct: 100 },
          ].map(({ label, value, pct }) => (
            <div key={label} className="bg-muted/30 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
              <p className="text-xl font-bold tracking-tight tabular-nums">{formatCZK(value)}</p>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-primary/60 rounded-full"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Graf */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
        <p className="text-sm font-semibold text-foreground mb-1">Příjmy — posledních 12 měsíců</p>
        <p className="text-xs text-muted-foreground mb-5">Klikni na legendu pro zobrazení/skrytí řady</p>
        <RevenueChart months={chartMonths} />
      </div>

      {/* Blížící se splatnost */}
      {dueSoonInvoices.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-700">
              {dueSoonInvoices.length === 1 ? "1 faktura se blíží splatnosti" : `${dueSoonInvoices.length} faktur se blíží splatnosti`} (7 dní)
            </p>
          </div>
          <div className="space-y-2">
            {dueSoonInvoices.map((inv) => {
              const daysLeft = Math.ceil((new Date(inv.dueDate).getTime() - now.getTime()) / 86400000);
              return (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.client.name} · {daysLeft === 0 ? "dnes" : daysLeft === 1 ? "zítra" : `za ${daysLeft} dní`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tabular-nums text-amber-600">{formatCZK(inv.totalAmount)}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Upozornění na po splatnosti */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                {overdueInvoices.length === 1 ? "1 faktura po splatnosti" : `${overdueInvoices.length} faktury po splatnosti`}
              </p>
            </div>
            {overdueInvoices.some((inv) => inv.client.email) && (
              <RemindAllButton invoiceIds={overdueInvoices.filter((inv) => inv.client.email).map((inv) => inv.id)} />
            )}
          </div>
          <div className="space-y-2">
            {overdueInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 hover:bg-red-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{inv.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.client.name} · splatnost {new Date(inv.dueDate).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold tabular-nums text-red-600">{formatCZK(inv.totalAmount)}</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Poslední faktury */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Poslední faktury</h2>
          <Link href="/invoices" className="text-sm text-primary font-medium hover:underline flex items-center gap-0.5">
            Zobrazit vše <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-16 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Zatím žádné faktury.</p>
            <Link href="/invoices/new" className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
              Vytvoř první →
            </Link>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
            {recentInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">{inv.client.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={inv.status} />
                  <p className="text-sm font-semibold text-foreground tabular-nums">{formatCZK(inv.totalAmount)}</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
