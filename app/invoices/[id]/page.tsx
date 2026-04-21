import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Download, Pencil, FileCode } from "lucide-react";
import { DuplicateButton } from "./duplicate-button";
import { SendButton } from "./send-button";
import { RemindButton } from "./remind-button";
import { DeleteButton } from "./delete-button";
import { SettleButton } from "./settle-button";
import { ShareButton } from "./share-button";
import { CreditNoteButton } from "./credit-note-button";

const typeLabels: Record<string, { label: string; className: string }> = {
  deposit:    { label: "Zálohová",    className: "bg-amber-50 text-amber-600" },
  proforma:   { label: "Proforma",   className: "bg-sky-50 text-sky-600" },
  settlement: { label: "Vyúčtovací", className: "bg-violet-50 text-violet-600" },
  credit:     { label: "Dobropis",   className: "bg-red-50 text-red-600" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:   { label: "Koncept",       className: "bg-zinc-100 text-zinc-500" },
  SENT:    { label: "Odesláno",      className: "bg-blue-50 text-blue-600" },
  PAID:    { label: "Zaplaceno",     className: "bg-emerald-50 text-emerald-600" },
  OVERDUE: { label: "Po splatnosti", className: "bg-red-50 text-red-600" },
};

function formatCZK(amount: number, currency = "CZK") {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Automaticky označ jako po splatnosti
  await db.invoice.updateMany({
    where: { id, status: "SENT", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      supplier: true,
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!invoice) notFound();

  const { label, className } = statusConfig[invoice.status] ?? statusConfig.DRAFT;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na faktury
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">Faktura {invoice.number}</h1>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shrink-0", className)}>
                {label}
              </span>
              {typeLabels[invoice.invoiceType] && (
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shrink-0", typeLabels[invoice.invoiceType].className)}>
                  {typeLabels[invoice.invoiceType].label}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Vystaveno {formatDate(invoice.issueDate)} · Splatnost {formatDate(invoice.dueDate)}
            </p>
            {invoice.tags && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {invoice.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {invoice.reverseCharge && (
              <p className="text-[11px] text-muted-foreground mt-2 italic">Reverse charge — daň odvede zákazník</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {invoice.status === "OVERDUE" ? (
              <RemindButton invoiceId={invoice.id} clientEmail={invoice.client.email ?? null} />
            ) : (
              <SendButton invoiceId={invoice.id} clientEmail={invoice.client.email ?? null} />
            )}
            {invoice.invoiceType === "deposit" && invoice.status === "PAID" && (
              <SettleButton invoiceId={invoice.id} />
            )}
            <ShareButton invoiceId={invoice.id} />
            <DuplicateButton invoiceId={invoice.id} />
            {invoice.invoiceType !== "credit" && (
              <CreditNoteButton invoiceId={invoice.id} />
            )}
            <Link
              href={`/invoices/${invoice.id}/edit`}
              aria-label="Upravit fakturu"
              title="Upravit fakturu"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full w-9 h-9 p-0")}
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              aria-label="Stáhnout PDF"
              title="Stáhnout PDF"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            <a
              href={`/api/invoices/${invoice.id}/isdoc`}
              aria-label="Stáhnout ISDOC"
              title="Stáhnout ISDOC"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}
            >
              <FileCode className="h-4 w-4" />
              ISDOC
            </a>
            <div className="w-px h-6 bg-border mx-1" />
            <DeleteButton invoiceId={invoice.id} />
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Dodavatel</p>
          <p className="font-semibold text-foreground">{invoice.supplier.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{invoice.supplier.street}</p>
          <p className="text-sm text-muted-foreground">{invoice.supplier.zip} {invoice.supplier.city}</p>
          <p className="text-sm text-muted-foreground mt-2">IČO: {invoice.supplier.ico}</p>
          {invoice.supplier.dic && <p className="text-sm text-muted-foreground">DIČ: {invoice.supplier.dic}</p>}
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Odběratel</p>
          <p className="font-semibold text-foreground">{invoice.client.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{invoice.client.street}</p>
          <p className="text-sm text-muted-foreground">{invoice.client.zip} {invoice.client.city}</p>
          <p className="text-sm text-muted-foreground mt-2">IČO: {invoice.client.ico}</p>
          {invoice.client.dic && <p className="text-sm text-muted-foreground">DIČ: {invoice.client.dic}</p>}
        </div>
      </div>

      {/* Line items */}
      {(() => {
        const items = invoice.items.length > 0
          ? invoice.items
          : [{
              id: "legacy",
              description: invoice.note || "Odpracované hodiny",
              quantity: invoice.hoursWorked,
              unit: "h",
              unitPrice: invoice.hourlyRate,
              vatRate: invoice.vatRate,
            }];
        const showVat = invoice.supplier.vatPayer;
        const curr = invoice.currency ?? "CZK";
        // Souhrn DPH po sazbách
        const vatByRate = new Map<number, { base: number; vat: number }>();
        for (const it of items) {
          const lineBase = it.quantity * it.unitPrice;
          const lineVat = lineBase * (it.vatRate / 100);
          const ex = vatByRate.get(it.vatRate) ?? { base: 0, vat: 0 };
          ex.base += lineBase;
          ex.vat += lineVat;
          vatByRate.set(it.vatRate, ex);
        }
        const vatRates = [...vatByRate.keys()].sort((a, b) => b - a);

        return (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Položky</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Popis</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Množství</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">J.</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Cena/j.</th>
                  {showVat && <th className="text-right px-3 py-3 font-medium text-muted-foreground text-xs">DPH</th>}
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Celkem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const lineBase = it.quantity * it.unitPrice;
                  return (
                    <tr key={it.id} className="border-b border-border/30 last:border-b-0">
                      <td className="px-5 py-4 text-foreground">{it.description}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{it.quantity}</td>
                      <td className="px-3 py-4 text-center text-muted-foreground text-xs">{it.unit}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{formatCZK(it.unitPrice, curr)}</td>
                      {showVat && <td className="px-3 py-4 text-right text-muted-foreground text-xs">{it.vatRate}%</td>}
                      <td className="px-5 py-4 text-right font-semibold tabular-nums">{formatCZK(lineBase, curr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-border/50 px-5 py-4 flex justify-end">
              <div className="text-right space-y-1">
                {showVat && (
                  <>
                    <div className="flex items-center gap-16 justify-end">
                      <p className="text-xs text-muted-foreground">Základ daně</p>
                      <p className="text-sm tabular-nums">{formatCZK(invoice.totalAmount - invoice.vatAmount, curr)}</p>
                    </div>
                    {vatRates.map((r) => {
                      const v = vatByRate.get(r)!;
                      return (
                        <div key={r} className="flex items-center gap-16 justify-end">
                          <p className="text-xs text-muted-foreground">DPH {r} %</p>
                          <p className="text-sm tabular-nums">{formatCZK(v.vat, curr)}</p>
                        </div>
                      );
                    })}
                  </>
                )}
                <div className="flex items-center gap-16 justify-end pt-1">
                  <p className="text-xs text-muted-foreground">Celkem k úhradě</p>
                  <p className="text-2xl font-bold tabular-nums">{formatCZK(invoice.totalAmount, curr)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payment */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Platební údaje</p>
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Číslo účtu</p>
            <p className="text-sm font-semibold">{invoice.supplier.bankAccount}/{invoice.supplier.bankCode}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Variabilní symbol</p>
            <p className="text-sm font-semibold">{invoice.number}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Stav faktury</p>
        <StatusChanger invoiceId={invoice.id} currentStatus={invoice.status} />
      </div>
    </div>
  );
}

function StatusChanger({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: string }) {
  const statuses = ["DRAFT", "SENT", "PAID", "OVERDUE"];
  return (
    <form className="flex gap-2 flex-wrap">
      {statuses.map((s) => {
        const { label } = statusConfig[s];
        const active = currentStatus === s;
        return (
          <Button
            key={s}
            formAction={async () => {
              "use server";
              const { db } = await import("@/lib/db");
              await db.invoice.update({ where: { id: invoiceId }, data: { status: s } });
              const { revalidatePath } = await import("next/cache");
              revalidatePath(`/invoices/${invoiceId}`);
            }}
            variant={active ? "default" : "outline"}
            size="sm"
            type="submit"
            className="rounded-full"
          >
            {label}
          </Button>
        );
      })}
    </form>
  );
}
