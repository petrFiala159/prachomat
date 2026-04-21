"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { DueDateSelector } from "@/components/form/due-date-selector";
import { ItemsEditor, type ItemRow } from "@/components/invoices/items-editor";
import { legacyItemFromInvoice } from "@/lib/invoice-items";

type Client = { id: string; name: string; hourlyRate: number };

export default function EditInvoicePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isVatPayer, setIsVatPayer] = useState(false);
  const [supplierVatRate, setSupplierVatRate] = useState(0);
  const [currency, setCurrency] = useState("CZK");
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/supplier").then((r) => r.json()),
    ]).then(([invoice, clientList, supplier]) => {
      setClients(clientList);
      setInvoiceNumber(invoice.number);
      setIsVatPayer(Boolean(supplier?.vatPayer));
      setSupplierVatRate(supplier?.vatPayer ? (supplier.vatRate ?? 21) : 0);
      setCurrency(invoice.currency ?? "CZK");
      setClientId(invoice.clientId);
      setIssueDate(invoice.issueDate.split("T")[0]);
      setDueDate(invoice.dueDate.split("T")[0]);
      setNote(invoice.note ?? "");

      // Použij uložené items nebo vytvoř jednu z legacy polí
      if (Array.isArray(invoice.items) && invoice.items.length > 0) {
        setItems(invoice.items.map((it: ItemRow) => ({
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          vatRate: it.vatRate,
        })));
      } else {
        setItems([legacyItemFromInvoice(invoice)]);
      }
      setLoading(false);
    });
  }, [id]);

  function handleClientChange(newId: string) {
    setClientId(newId);
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit: "ks", unitPrice: 0, vatRate: supplierVatRate }]);
  }

  const base = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const vatSum = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.vatRate / 100), 0);
  const total = base + vatSum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        issueDate,
        dueDate,
        note,
        currency,
        items: items.filter((i) => i.description.trim() && i.quantity !== 0),
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Chyba při ukládání");
      setSaving(false);
      return;
    }
    router.push(`/invoices/${id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border/50 h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/invoices/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na fakturu
        </Link>
        <p className="text-sm font-medium text-muted-foreground mb-1">Editace</p>
        <h1 className="text-3xl font-bold tracking-tight">Faktura {invoiceNumber}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Odběratel</p>
          <select
            className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm"
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            required
          >
            <option value="">— Vybrat odběratele —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Položky</p>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Přidat položku
            </button>
          </div>
          <ItemsEditor items={items} onChange={setItems} currency={currency} showVat={isVatPayer} />

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
            {isVatPayer && (
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
                {new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(total)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Poznámka <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="rounded-xl" />
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
          <Button type="submit" disabled={saving} className="rounded-full">
            {saving ? "Ukládám..." : "Uložit změny"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full">
            Zrušit
          </Button>
        </div>
      </form>
    </div>
  );
}
