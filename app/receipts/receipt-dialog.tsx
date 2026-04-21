"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Check, Save, Download, FileText, Plus, Trash2 } from "lucide-react";
import { RECEIPT_CATEGORIES } from "@/lib/receipt-categories";

type FullReceipt = {
  id: string;
  date: string;
  scan: string;
  mimeType: string;
  vendor: string;
  vendorIco: string | null;
  vendorDic: string | null;
  totalAmount: number;
  vatBase: number;
  vatAmount: number;
  vatRate: number;
  items: string;
  note: string | null;
  category: string;
  tags: string;
  status: string;
  draftEntries: string | null;
};

type Entry = {
  vendor: string;
  vendorIco: string;
  vendorDic: string;
  date: string;
  totalAmount: number;
  vatBase: number;
  vatAmount: number;
  vatRate: number;
  note: string;
  category: string;
};

function emptyEntry(): Entry {
  return {
    vendor: "", vendorIco: "", vendorDic: "", date: new Date().toISOString().split("T")[0],
    totalAmount: 0, vatBase: 0, vatAmount: 0, vatRate: 21, note: "", category: "other",
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
}

export function ReceiptDialog({ receiptId, onClose }: { receiptId: string; onClose: () => void }) {
  const [receipt, setReceipt] = useState<FullReceipt | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/receipts/${receiptId}`)
      .then((r) => r.json())
      .then(async (data: FullReceipt) => {
        setReceipt(data);

        // Scan načti z dedikovaného endpointu (filesystem nebo legacy base64)
        try {
          const scanRes = await fetch(`/api/receipts/${receiptId}/scan`);
          if (scanRes.ok) {
            const blob = await scanRes.blob();
            setBlobUrl(URL.createObjectURL(blob));
          }
        } catch { /* ignore */ }

        // Inicializuj entries
        let initial: Entry[] = [];
        if (data.draftEntries) {
          try {
            const parsed = JSON.parse(data.draftEntries);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initial = parsed.map((e) => ({
                vendor: e.vendor ?? "",
                vendorIco: e.vendorIco ?? "",
                vendorDic: e.vendorDic ?? "",
                date: e.date ? new Date(e.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                totalAmount: Number(e.totalAmount ?? 0),
                vatBase: Number(e.vatBase ?? 0),
                vatAmount: Number(e.vatAmount ?? 0),
                vatRate: Number(e.vatRate ?? 21),
                note: e.note ?? "",
                category: e.category ?? data.category ?? "other",
              }));
            }
          } catch { /* ignore */ }
        }
        if (initial.length === 0) {
          // Použij hlavní pole jako jeden záznam
          initial = [{
            vendor: data.vendor ?? "",
            vendorIco: data.vendorIco ?? "",
            vendorDic: data.vendorDic ?? "",
            date: data.date ? new Date(data.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            totalAmount: data.totalAmount ?? 0,
            vatBase: data.vatBase ?? 0,
            vatAmount: data.vatAmount ?? 0,
            vatRate: data.vatRate ?? 21,
            note: data.note ?? "",
            category: data.category ?? "other",
          }];
        }
        setEntries(initial);
      });

    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [receiptId]);

  function updateEntry(idx: number, key: keyof Entry, value: string | number) {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  // Auto-kalkulace při editaci `totalAmount` nebo `vatBase`
  function setTotal(idx: number, value: number) {
    setEntries((prev) => {
      const next = [...prev];
      const e = next[idx];
      const rate = e.vatRate || 21;
      const base = rate > 0 ? value / (1 + rate / 100) : value;
      const vat = value - base;
      next[idx] = {
        ...e,
        totalAmount: value,
        vatBase: Math.round(base * 100) / 100,
        vatAmount: Math.round(vat * 100) / 100,
      };
      return next;
    });
  }

  function setBase(idx: number, value: number) {
    setEntries((prev) => {
      const next = [...prev];
      const e = next[idx];
      const rate = e.vatRate || 21;
      const vat = value * (rate / 100);
      const total = value + vat;
      next[idx] = {
        ...e,
        vatBase: value,
        vatAmount: Math.round(vat * 100) / 100,
        totalAmount: Math.round(total * 100) / 100,
      };
      return next;
    });
  }

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  async function save(approve: boolean) {
    setSaving(true);
    await fetch(`/api/receipts/${receiptId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries, approve }),
    });
    setSaving(false);
    onClose();
  }

  if (!receipt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-card rounded-2xl p-8">Načítám…</div>
      </div>
    );
  }

  const totalSum = entries.reduce((s, e) => s + e.totalAmount, 0);
  const vatSum = entries.reduce((s, e) => s + e.vatAmount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border/50 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Účtenka</p>
            <h2 className="text-lg font-semibold">
              {entries.length === 1
                ? (entries[0].vendor || <span className="text-muted-foreground italic">Nová účtenka</span>)
                : `${entries.length} účtenek na jednom scanu`}
            </h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Scan — sticky */}
            <div className="md:sticky md:top-0 md:self-start">
              <div className="bg-muted/30 rounded-xl p-3 flex flex-col min-h-80">
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  {blobUrl && receipt.mimeType === "application/pdf" ? (
                    <iframe src={blobUrl} title="PDF náhled" className="w-full h-[65vh] rounded-lg bg-white" />
                  ) : blobUrl && receipt.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={blobUrl} alt="Scan účtenky" className="max-w-full max-h-[65vh] rounded-lg object-contain" />
                  ) : (
                    <div className="text-center text-muted-foreground text-sm">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      Náhled není k dispozici
                    </div>
                  )}
                </div>
                {blobUrl && (
                  <a
                    href={blobUrl}
                    download={`uctenka-${receipt.id}.${receipt.mimeType === "application/pdf" ? "pdf" : receipt.mimeType.split("/")[1]}`}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Stáhnout originál
                  </a>
                )}
              </div>
            </div>

            {/* Stack sub-formulářů */}
            <div className="space-y-4">
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="bg-muted/20 border border-border/50 rounded-xl p-4 space-y-3"
                >
                  {entries.length > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Účtenka #{idx + 1}
                      </p>
                      <button
                        onClick={() => removeEntry(idx)}
                        className="text-destructive/70 hover:text-destructive text-xs flex items-center gap-1"
                        title="Odebrat"
                      >
                        <Trash2 className="h-3 w-3" />
                        Odebrat
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs font-medium">Prodejce</Label>
                      <Input value={entry.vendor} onChange={(e) => updateEntry(idx, "vendor", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">IČO</Label>
                      <Input value={entry.vendorIco} onChange={(e) => updateEntry(idx, "vendorIco", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">DIČ</Label>
                      <Input value={entry.vendorDic} onChange={(e) => updateEntry(idx, "vendorDic", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Datum</Label>
                      <Input type="date" value={entry.date} onChange={(e) => updateEntry(idx, "date", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Sazba DPH</Label>
                      <select
                        value={entry.vatRate}
                        onChange={(e) => updateEntry(idx, "vatRate", Number(e.target.value))}
                        className="flex h-8 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
                      >
                        <option value="21">21 %</option>
                        <option value="12">12 %</option>
                        <option value="0">0 %</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Základ</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.vatBase}
                        onChange={(e) => setBase(idx, Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">DPH</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.vatAmount}
                        onChange={(e) => updateEntry(idx, "vatAmount", Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs font-medium">Celkem</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.totalAmount}
                        onChange={(e) => setTotal(idx, Number(e.target.value))}
                        className="h-9 text-base font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs font-medium">Kategorie</Label>
                      <select
                        value={entry.category}
                        onChange={(e) => updateEntry(idx, "category", e.target.value)}
                        className="flex h-8 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
                      >
                        {Object.entries(RECEIPT_CATEGORIES).map(([key, { label, emoji }]) => (
                          <option key={key} value={key}>{emoji} {label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs font-medium">Poznámka</Label>
                      <Input
                        value={entry.note}
                        onChange={(e) => updateEntry(idx, "note", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addEntry}
                className="w-full border-2 border-dashed border-border/60 rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Přidat další účtenku ze stejného scanu
              </button>

              {entries.length > 1 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Součet DPH</span>
                    <span className="font-medium tabular-nums">{fmt(vatSum)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Součet celkem</span>
                    <span className="text-lg font-bold text-primary tabular-nums">{fmt(totalSum)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/50 bg-muted/20 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {receipt.status === "approved"
              ? "✓ Schváleno"
              : receipt.status === "sent"
              ? "✓ Odesláno účetní"
              : "Čeká na schválení"}
            {entries.length > 1 && (
              <span className="ml-2 text-primary">· při uložení se rozdělí na {entries.length} záznamů</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving} className="rounded-full gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Uložit
            </Button>
            <Button onClick={() => save(true)} disabled={saving} className="rounded-full gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {receipt.status === "approved" ? "Uložit" : `Schválit${entries.length > 1 ? ` ${entries.length}×` : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
