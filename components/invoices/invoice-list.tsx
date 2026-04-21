"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FileText, ChevronRight, Trash2, Check, Loader2, MoreHorizontal, Pencil, Copy, Send, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:   { label: "Koncept",       className: "bg-zinc-100 text-zinc-500" },
  SENT:    { label: "Odesláno",      className: "bg-blue-50 text-blue-600" },
  PAID:    { label: "Zaplaceno",     className: "bg-emerald-50 text-emerald-600" },
  OVERDUE: { label: "Po splatnosti", className: "bg-red-50 text-red-600" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);

type Invoice = {
  id: string;
  number: string;
  status: string;
  issueDate: Date;
  totalAmount: number;
  hoursWorked: number;
  client: { name: string; email: string | null };
};

const BULK_STATUSES = [
  { value: "SENT",    label: "Označit jako Odesláno" },
  { value: "PAID",    label: "Označit jako Zaplaceno" },
  { value: "OVERDUE", label: "Označit jako Po splatnosti" },
  { value: "DRAFT",   label: "Vrátit do Konceptu" },
];

function RowActions({ inv, onDone }: { inv: Invoice; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markPaid() {
    setBusy(true);
    await fetch("/api/invoices/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [inv.id], action: "status", status: "PAID" }),
    });
    setBusy(false);
    onDone();
  }

  async function sendInvoice() {
    if (!confirm(`Odeslat fakturu na ${inv.client.email}?`)) return;
    setBusy(true);
    await fetch(`/api/invoices/${inv.id}/send`, { method: "POST" });
    setBusy(false);
    onDone();
  }

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/invoices/${inv.id}/duplicate`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.id) router.push(`/invoices/${data.id}`);
    else onDone();
  }

  async function deleteInvoice() {
    if (!confirm("Opravdu smazat tuto fakturu? Akce je nevratná.")) return;
    setBusy(true);
    await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
    setBusy(false);
    onDone();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        aria-label="Akce"
        title="Akce"
        onClick={(e) => e.stopPropagation()}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" onClick={(e) => e.stopPropagation()}>
        {inv.status !== "PAID" && (
          <DropdownMenuItem onClick={markPaid}>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Označit jako zaplaceno
          </DropdownMenuItem>
        )}
        {inv.client.email && inv.status !== "SENT" && (
          <DropdownMenuItem onClick={sendInvoice}>
            <Send className="h-4 w-4" />
            Odeslat emailem
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={duplicate}>
          <Copy className="h-4 w-4" />
          Duplikovat
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}/edit`)}>
          <Pencil className="h-4 w-4" />
          Upravit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={deleteInvoice}>
          <Trash2 className="h-4 w-4" />
          Smazat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = selected.size === invoices.length && invoices.length > 0;
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(invoices.map((i) => i.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkAction(action: string, status?: string) {
    const ids = [...selected];
    const label = action === "delete" ? `Opravdu smazat ${ids.length} faktur?` : null;
    if (label && !confirm(label)) return;

    await fetch("/api/invoices/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, status }),
    });

    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  return (
    <div>
      {/* Hromadné akce */}
      {someSelected && (
        <div className="mb-3 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selected.size} {selected.size === 1 ? "faktura" : selected.size < 5 ? "faktury" : "faktur"}
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {BULK_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => bulkAction("status", s.value)}
                disabled={pending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => bulkAction("send")}
              disabled={pending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Odeslat e-mailem
            </button>
            <button
              onClick={() => bulkAction("delete")}
              disabled={pending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Smazat
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
        {/* Hlavička se "select all" */}
        <div className="flex items-center gap-4 px-5 py-3 bg-muted/30">
          <button
            onClick={toggleAll}
            className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
              allSelected
                ? "bg-primary border-primary text-white"
                : someSelected
                ? "bg-primary/30 border-primary"
                : "border-border hover:border-primary/50"
            )}
            aria-label="Vybrat vše"
          >
            {allSelected && <Check className="h-3 w-3" />}
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {someSelected ? `Vybráno ${selected.size} z ${invoices.length}` : `${invoices.length} faktur`}
          </span>
        </div>

        {invoices.map((inv) => {
          const { label, className } = statusConfig[inv.status] ?? statusConfig.DRAFT;
          const isSelected = selected.has(inv.id);
          return (
            <div
              key={inv.id}
              className={cn(
                "group flex items-center gap-4 px-5 py-4 transition-colors",
                isSelected ? "bg-primary/5" : "hover:bg-muted/40"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggle(inv.id)}
                className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-primary border-primary text-white" : "border-border hover:border-primary/50"
                )}
                aria-label={`Vybrat fakturu ${inv.number}`}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </button>

              {/* Odkaz na detail */}
              <Link
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between flex-1 min-w-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.client.name} · {inv.hoursWorked} h
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.issueDate).toLocaleDateString("cs-CZ")}
                  </p>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}>
                    {label}
                  </span>
                  <p className="text-sm font-semibold tabular-nums w-24 text-right">
                    {fmt(inv.totalAmount)}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
                </div>
              </Link>

              {/* Rychlé akce */}
              <RowActions inv={inv} onDone={() => startTransition(() => router.refresh())} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
