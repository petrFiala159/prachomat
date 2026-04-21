"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Stats = {
  count: number;
  paidCount: number;
  overdueCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalHours: number;
  avgRate: number;
  bestMonth: { label: string; amount: number; count: number } | null;
};

type InvoiceRow = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  invoiceType: string;
  currency: string;
};

type MonthRow = { label: string; amount: number; count: number };

type Data = { stats: Stats; invoices: InvoiceRow[]; monthlyBreakdown: MonthRow[] };

const statusColors: Record<string, string> = {
  DRAFT:   "bg-zinc-100 text-zinc-500",
  SENT:    "bg-blue-50 text-blue-600",
  PAID:    "bg-emerald-50 text-emerald-600",
  OVERDUE: "bg-red-50 text-red-600",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Koncept", SENT: "Odesláno", PAID: "Zaplaceno", OVERDUE: "Po splatnosti",
};

function fmt(n: number, currency = "CZK") {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("cs-CZ");
}

export function ClientHistory({ clientId }: { clientId: string }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/history`)
      .then((r) => r.json())
      .then(setData);
  }, [clientId]);

  if (!data) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (data.stats.count === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-8 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Tento klient zatím nemá žádné faktury.</p>
      </div>
    );
  }

  const { stats, invoices, monthlyBreakdown } = data;
  const maxMonth = Math.max(...monthlyBreakdown.map((m) => m.amount), 1);

  return (
    <div className="space-y-6">
      {/* Karty se statistikami */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Faktur", value: String(stats.count), sub: `${stats.paidCount} zaplaceno${stats.overdueCount > 0 ? `, ${stats.overdueCount} po splatnosti` : ""}` },
          { label: "Fakturováno", value: fmt(stats.totalInvoiced), sub: stats.totalInvoiced > 0 ? `${Math.round(stats.totalPaid / stats.totalInvoiced * 100)} % zaplaceno` : "" },
          { label: "Odpracováno", value: stats.totalHours > 0 ? `${stats.totalHours} h` : "—", sub: stats.avgRate > 0 ? `ø ${fmt(Math.round(stats.avgRate))}/hod` : "" },
          { label: "Nejlepší měsíc", value: stats.bestMonth ? fmt(stats.bestMonth.amount) : "—", sub: stats.bestMonth?.label ?? "" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Měsíční graf (horizontální bary) */}
      {monthlyBreakdown.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4">Posledních {monthlyBreakdown.length} {monthlyBreakdown.length === 1 ? "měsíc" : "měsíců"}</h3>
          <div className="space-y-2">
            {monthlyBreakdown.map((m) => (
              <div key={m.label} className="flex items-center gap-3 text-xs">
                <div className="w-20 shrink-0 text-muted-foreground">{m.label}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full"
                    style={{ width: `${(m.amount / maxMonth) * 100}%` }}
                  />
                </div>
                <div className="w-28 shrink-0 text-right font-semibold tabular-nums">{fmt(m.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seznam faktur */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Všechny faktury ({invoices.length})</h3>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50 max-h-[500px] overflow-y-auto">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{inv.number}</p>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", statusColors[inv.status])}>
                      {statusLabel[inv.status] ?? inv.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDate(inv.issueDate)} · splatnost {fmtDate(inv.dueDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <p className="text-sm font-semibold tabular-nums">{fmt(inv.totalAmount, inv.currency)}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
