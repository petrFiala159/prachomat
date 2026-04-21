"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { DueDateSelector } from "@/components/form/due-date-selector";
import { ItemsEditor, type ItemRow } from "@/components/invoices/items-editor";
import { TempoImportButton } from "@/components/invoices/tempo-import-button";

type Client = { id: string; name: string; hourlyRate: number };
type Supplier = { id: string; vatPayer: boolean; vatRate: number };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function dueDateStr(days = 14) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function makeInitialItem(vatRate: number): ItemRow {
  return { description: "Odpracované hodiny", quantity: 0, unit: "h", unitPrice: 0, vatRate };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierLoaded, setSupplierLoaded] = useState(false);
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(searchParams.get("issueDate") ?? todayStr());
  const [dueDate, setDueDate] = useState(searchParams.get("dueDate") ?? dueDateStr());
  const [note, setNote] = useState(searchParams.get("note") ?? "");
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState("regular");
  const [currency, setCurrency] = useState("CZK");
  const [reverseCharge, setReverseCharge] = useState(false);
  const [round, setRound] = useState(false);
  const [language, setLanguage] = useState("cs");
  const [tags, setTags] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [aiClientName] = useState(searchParams.get("clientName") ?? "");

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/supplier").then((r) => r.json()),
    ]).then(([clientsData, supplierData]) => {
      setClients(clientsData);
      setSupplier(supplierData);
      setSupplierLoaded(true);

      const supplierVat = supplierData?.vatPayer ? (supplierData.vatRate ?? 21) : 0;

      // Předvyplnit položku z query params (pro AI bar)
      const qHours = searchParams.get("hours");
      const qRate = searchParams.get("rate");
      const initialItem: ItemRow = {
        description: searchParams.get("note") || "Odpracované hodiny",
        quantity: qHours ? Number(qHours) : 0,
        unit: "h",
        unitPrice: qRate ? Number(qRate) : 0,
        vatRate: supplierVat,
      };
      setItems([initialItem]);

      // Fuzzy match klient z AI
      if (aiClientName) {
        const lower = aiClientName.toLowerCase();
        const match = clientsData.find((c: Client) =>
          c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
        );
        if (match) {
          setClientId(match.id);
          if (match.hourlyRate && !qRate) {
            setItems([{ ...initialItem, unitPrice: match.hourlyRate }]);
          }
        }
      }
    });
  }, [aiClientName, searchParams]);

  function handleClientChange(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client?.hourlyRate && items.length > 0) {
      setItems((prev) => {
        const next = [...prev];
        // Jen první položku která zřejmě je "hodiny × sazba"
        if (next[0] && next[0].unit === "h" && next[0].unitPrice === 0) {
          next[0] = { ...next[0], unitPrice: client.hourlyRate };
        }
        return next;
      });
    }
  }

  function addItem() {
    const vatRate = supplier?.vatPayer ? (supplier.vatRate ?? 21) : 0;
    setItems((prev) => [...prev, { description: "", quantity: 1, unit: "ks", unitPrice: 0, vatRate }]);
  }

  function handleTempoImport(hours: number, opts: { accountLabel: string; projectKey?: string; rate?: number }) {
    const vatRate = supplier?.vatPayer ? (supplier.vatRate ?? 21) : 0;
    const client = clients.find((c) => c.id === clientId);
    // Priorita sazby: z Tempo účtu → z klienta → existující → 0
    const rate = opts.rate ?? client?.hourlyRate ?? items[0]?.unitPrice ?? 0;
    const description = opts.projectKey
      ? `Odpracované hodiny — ${opts.projectKey}`
      : `Odpracované hodiny (${opts.accountLabel})`;
    setItems((prev) => {
      const firstHours = prev.findIndex((i) => i.unit === "h");
      if (firstHours >= 0 && prev[firstHours].quantity === 0) {
        const next = [...prev];
        next[firstHours] = { ...next[firstHours], description, quantity: hours, unitPrice: rate, vatRate };
        return next;
      }
      return [...prev, { description, quantity: hours, unit: "h", unitPrice: rate, vatRate }];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplier) return alert("Nejdřív nastav své údaje v Nastavení.");
    if (items.length === 0 || items.every((i) => !i.description.trim() || i.quantity === 0)) {
      return alert("Přidej alespoň jednu položku.");
    }
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        supplierId: supplier.id,
        issueDate,
        dueDate,
        note,
        invoiceType,
        currency,
        reverseCharge,
        round,
        language,
        tags,
        items: items.filter((i) => i.description.trim() && i.quantity !== 0),
      }),
    });
    const inv = await res.json();
    if (inv.error) {
      alert(inv.error);
      setLoading(false);
      return;
    }
    router.push(`/invoices/${inv.id}`);
  }

  // Součty z položek
  const base = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const vatSum = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.vatRate / 100), 0);
  const total = base + vatSum;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na faktury
        </Link>
        <p className="text-sm font-medium text-muted-foreground mb-1">Faktury</p>
        <h1 className="text-3xl font-bold tracking-tight">Nová faktura</h1>
      </div>

      {aiClientName && !clientId && clients.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          AI detekovala klienta <strong>&quot;{aiClientName}&quot;</strong> — nebyl nalezen v databázi. Vyber ho ručně nebo{" "}
          <a href="/clients/new" className="font-semibold underline">přidej nového</a>.
        </div>
      )}

      {supplierLoaded && !supplier && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Nejdřív vyplň své údaje v{" "}
          <a href="/settings" className="font-semibold underline">Nastavení</a>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Typ, měna, jazyk</p>
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { value: "regular", label: "Běžná faktura" },
              { value: "deposit", label: "Zálohová faktura" },
              { value: "proforma", label: "Proforma" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setInvoiceType(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  invoiceType === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex-1" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-10 rounded-xl border border-input bg-transparent px-3 text-sm"
              title="Jazyk PDF"
            >
              <option value="cs">Česky</option>
              <option value="en">English</option>
            </select>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-10 rounded-xl border border-input bg-transparent px-3 text-sm"
              title="Měna"
            >
              <option value="CZK">CZK</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <label className="flex items-center justify-between gap-4 cursor-pointer pt-2 border-t border-border/50">
            <div>
              <p className="text-sm font-medium">Reverse charge (EU)</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Faktura bez DPH pro klienta z EU — daň odvede zákazník (§ 92a ZDPH).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reverseCharge}
              onClick={() => setReverseCharge((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${reverseCharge ? "bg-primary" : "bg-input"}`}
            >
              <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${reverseCharge ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </label>

          <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-border/50">
            <input
              type="checkbox"
              checked={round}
              onChange={(e) => setRound(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Zaokrouhlit na celé Kč</span>
          </label>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium">Tagy <span className="text-muted-foreground font-normal">(oddělené čárkou)</span></Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="např. projekt-A, klient-malfini, q1"
              className="text-xs"
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Odběratel</p>
          <div className="space-y-2">
            <select
              className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              required
            >
              <option value="">— Vybrat odběratele —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nemáš žádné odběratele.{" "}
                <a href="/clients/new" className="text-primary underline">Přidej prvního</a>.
              </p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Položky</p>
            <div className="flex items-center gap-3">
              <TempoImportButton onImport={handleTempoImport} currentClientId={clientId} />
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Přidat položku
              </button>
            </div>
          </div>
          <ItemsEditor
            items={items}
            onChange={setItems}
            currency={currency}
            showVat={Boolean(supplier?.vatPayer)}
          />

          {items.length > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
              {supplier?.vatPayer && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">Základ daně</span>
                    <span className="text-sm text-blue-600 tabular-nums">
                      {new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(base)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">DPH</span>
                    <span className="text-sm text-blue-600 tabular-nums">
                      {new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(vatSum)}
                    </span>
                  </div>
                  <div className="border-t border-blue-200 pt-1.5" />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Celkem k úhradě</span>
                <span className="text-xl font-bold text-blue-700 tabular-nums">
                  {new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: round ? 0 : 2 }).format(
                    round ? Math.round(total) : total
                  )}
                </span>
              </div>
              {round && total !== Math.round(total) && (
                <div className="flex items-center justify-between text-[11px] text-blue-500 mt-1">
                  <span>Zaokrouhlení</span>
                  <span>{(Math.round(total) - total) >= 0 ? "+" : ""}{(Math.round(total) - total).toFixed(2)} Kč</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Poznámka <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Obecná poznámka k faktuře..." rows={2} className="rounded-xl" />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Termíny</p>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Datum vystavení</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Splatnost</Label>
            <DueDateSelector issueDate={issueDate} dueDate={dueDate} onChange={setDueDate} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !supplier} className="rounded-full">
            {loading ? "Vytvářím..." : "Vytvořit fakturu"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full">
            Zrušit
          </Button>
        </div>
      </form>
    </div>
  );
}
