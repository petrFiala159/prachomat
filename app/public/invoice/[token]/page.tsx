import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

function formatCZK(n: number, currency = "CZK") {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("cs-CZ");
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invoice = await db.invoice.findUnique({
    where: { publicToken: token },
    include: { client: true, supplier: true },
  });

  if (!invoice) notFound();

  const base = invoice.totalAmount - invoice.vatAmount;

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Faktura</p>
              <h1 className="text-3xl font-bold tracking-tight">{invoice.number}</h1>
            </div>
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Stáhnout PDF
            </a>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Dodavatel</p>
              <p className="font-semibold">{invoice.supplier.name}</p>
              <p className="text-sm text-muted-foreground">{invoice.supplier.street}</p>
              <p className="text-sm text-muted-foreground">{invoice.supplier.zip} {invoice.supplier.city}</p>
              <p className="text-sm text-muted-foreground mt-1">IČ: {invoice.supplier.ico}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Odběratel</p>
              <p className="font-semibold">{invoice.client.name}</p>
              <p className="text-sm text-muted-foreground">{invoice.client.street}</p>
              <p className="text-sm text-muted-foreground">{invoice.client.zip} {invoice.client.city}</p>
              <p className="text-sm text-muted-foreground mt-1">IČ: {invoice.client.ico}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">Datum vystavení</p>
              <p className="font-medium">{fmtDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Splatnost</p>
              <p className="font-medium">{fmtDate(invoice.dueDate)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Položky</p>
            <div className="flex justify-between text-sm">
              <span>{invoice.note ?? "Odpracované hodiny"} ({invoice.hoursWorked} h × {formatCZK(invoice.hourlyRate, invoice.currency)})</span>
              <span className="font-medium tabular-nums">{formatCZK(base, invoice.currency)}</span>
            </div>
            {invoice.vatRate > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span>DPH {invoice.vatRate}%</span>
                <span className="tabular-nums">{formatCZK(invoice.vatAmount, invoice.currency)}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t-2 border-foreground flex justify-between items-center">
            <span className="font-semibold">Celkem k úhradě</span>
            <span className="text-2xl font-bold tabular-nums">{formatCZK(invoice.totalAmount, invoice.currency)}</span>
          </div>

          <div className="pt-4 border-t border-border/50 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Platební údaje</p>
            <p className="text-sm">Č. účtu: <span className="font-mono">{invoice.supplier.bankAccount}/{invoice.supplier.bankCode}</span></p>
            <p className="text-sm">Variabilní symbol: <span className="font-mono">{invoice.number}</span></p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Vygenerováno službou Prachomat
        </p>
      </div>
    </div>
  );
}
