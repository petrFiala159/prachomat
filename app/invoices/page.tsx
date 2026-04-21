import { db } from "@/lib/db";
import { buttonVariants } from "@/lib/button-variants";
import Link from "next/link";
import { FileText, Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { Suspense } from "react";


export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; client?: string; year?: string }>;

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, client: clientId, year } = await searchParams;

  // Automaticky označ faktury po splatnosti
  await db.invoice.updateMany({
    where: { status: "SENT", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });

  const currentYear = new Date().getFullYear();

  // Sestavíme where filtr
  const where: Parameters<typeof db.invoice.findMany>[0]["where"] = {};
  if (year) {
    const y = Number(year);
    where.issueDate = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const [invoices, clients, allYears] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: { client: true },
    }),
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.invoice.findMany({ select: { issueDate: true } }),
  ]);

  const years = [...new Set(allYears.map((i) => new Date(i.issueDate).getFullYear()))].sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  const totalFiltered = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Správa</p>
          <h1 className="text-3xl font-bold tracking-tight">Faktury</h1>
        </div>
        <Link href="/invoices/new" className={cn(buttonVariants(), "rounded-full gap-1.5")}>
          <Plus className="h-4 w-4" />
          Nová faktura
        </Link>
      </div>

      {/* Filtry */}
      <Suspense>
        <InvoiceFilters clients={clients} currentYear={currentYear} years={years} />
      </Suspense>

      {/* Počet výsledků + export */}
      {invoices.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{invoices.length} {invoices.length === 1 ? "faktura" : invoices.length < 5 ? "faktury" : "faktur"}</span>
          <div className="flex items-center gap-4">
            <span className="font-medium text-foreground">
              {new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(totalFiltered)}
            </span>
            <a
              href={`/api/invoices/export?${new URLSearchParams({ ...(status && { status }), ...(clientId && { client: clientId }), ...(year && { year }) }).toString()}`}
              title="Exportovat do CSV"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="h-4 w-4" />
              CSV
            </a>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-foreground font-semibold mb-1">Žádné faktury</p>
          <p className="text-muted-foreground text-sm mb-5">
            {status || clientId ? "Žádné faktury neodpovídají filtru." : "Vytvoř svoji první fakturu"}
          </p>
          {!status && !clientId && (
            <Link href="/invoices/new" className={cn(buttonVariants(), "rounded-full")}>
              Vytvořit fakturu
            </Link>
          )}
        </div>
      ) : (
        <InvoiceList invoices={invoices} />
      )}
    </div>
  );
}
