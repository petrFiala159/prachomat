"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Receipt as ReceiptIcon, Send, Check, Clock, AlertCircle, Trash2, Eye, ChevronLeft, ChevronRight, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReceiptDialog } from "./receipt-dialog";
import { RECEIPT_CATEGORIES } from "@/lib/receipt-categories";

type Receipt = {
  id: string;
  date: string;
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
  status: "pending" | "approved" | "sent";
  approvedAt: string | null;
  sentAt: string | null;
  draftEntries: string | null;
};

const MONTHS_CS = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];

function fmt(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("cs-CZ");
}

function monthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReceiptsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(monthStr(now));
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importingFolder, setImportingFolder] = useState(false);
  const [folderResult, setFolderResult] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [vatSummary, setVatSummary] = useState({ vatOutput: 0, vatInput: 0, vatToPay: 0, invoiceCount: 0 });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setSelected(new Set());
    fetch(`/api/receipts?month=${selectedMonth}`)
      .then((r) => r.json())
      .then(setReceipts);

    // VAT summary — load invoices for month
    const [y, m] = selectedMonth.split("-").map(Number);
    fetch(`/api/reports/vat-summary?year=${y}&month=${m}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setVatSummary(d); });
  }, [selectedMonth]);

  useEffect(() => { load(); }, [load]);

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(monthStr(d));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";
    await processFiles(files);
  }

  async function processFiles(files: File[]) {
    setUploading(true);
    for (const file of files) {
      await uploadAndTranscribe(file);
    }
    setUploading(false);
    load();
  }

  async function handleImportFolder() {
    setImportingFolder(true);
    setFolderResult(null);
    try {
      const res = await fetch("/api/receipts/import-folder", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.imported === 0) {
          setFolderResult(data.message ?? "Žádné nové scany");
        } else {
          setFolderResult(`Naimportováno ${data.imported} souborů${data.failed > 0 ? ` (${data.failed} selhalo)` : ""}`);
        }
        load();
      } else {
        setFolderResult(`Chyba: ${data.error}`);
      }
    } catch (err) {
      setFolderResult(`Chyba: ${err instanceof Error ? err.message : "neznámá"}`);
    } finally {
      setImportingFolder(false);
      setTimeout(() => setFolderResult(null), 6000);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }

  async function uploadAndTranscribe(file: File) {
    // Read as base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Try AI transcription
    type ExtractedReceipt = {
      vendor?: string;
      vendorIco?: string | null;
      vendorDic?: string | null;
      date?: string;
      totalAmount?: number;
      vatBase?: number;
      vatAmount?: number;
      vatRate?: number;
      items?: unknown;
      note?: string | null;
    };
    let extracted: ExtractedReceipt[] = [];
    let aiError: string | null = null;
    let aiRaw: string | null = null;
    try {
      const res = await fetch("/api/receipts/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.receipts) && data.receipts.length > 0) {
        extracted = data.receipts;
        aiRaw = data.raw ?? null;
      } else {
        aiError = data.error ?? "AI selhala";
      }
    } catch (err) {
      aiError = err instanceof Error ? err.message : "Chyba";
    }

    // Pokud AI nic nevrátila, vytvoř jednu prázdnou účtenku
    if (extracted.length === 0) extracted = [{}];

    // Vytvoř jeden záznam se seznamem draftEntries (může obsahovat 1 nebo N)
    const createRes = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scan: base64,
        mimeType: file.type,
        date: extracted[0]?.date ?? new Date().toISOString().split("T")[0],
        draftEntries: extracted.map((r) => ({
          vendor: r.vendor ?? "",
          vendorIco: r.vendorIco ?? null,
          vendorDic: r.vendorDic ?? null,
          date: r.date ?? new Date().toISOString().split("T")[0],
          totalAmount: r.totalAmount ?? 0,
          vatBase: r.vatBase ?? 0,
          vatAmount: r.vatAmount ?? 0,
          vatRate: r.vatRate ?? 21,
          items: r.items ?? [],
          note: aiError ? `AI: ${aiError}` : (r.note ?? null),
        })),
        aiRaw,
        status: "pending",
      }),
    });
    const { id } = await createRes.json();
    if (!dialogId) setDialogId(id);
  }

  async function handleDelete(id: string) {
    if (!confirm("Smazat účtenku?")) return;
    await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    load();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === receipts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(receipts.map((r) => r.id)));
    }
  }

  async function bulkAction(action: "delete" | "approve") {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (action === "delete" && !confirm(`Smazat ${ids.length} ${ids.length === 1 ? "účtenku" : ids.length < 5 ? "účtenky" : "účtenek"}?`)) return;

    await fetch("/api/receipts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    setSelected(new Set());
    load();
  }

  async function handleSendToAccountant() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/receipts/send-to-accountant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(`Odesláno ${data.count} účtenek (DPH k platbě: ${fmt(data.vatToPay)})`);
        load();
      } else {
        setSendResult(`Chyba: ${data.error}`);
      }
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 6000);
    }
  }

  const [y, m] = selectedMonth.split("-").map(Number);
  const monthLabel = `${MONTHS_CS[m - 1]} ${y}`;
  const pending = receipts.filter((r) => r.status === "pending").length;
  const approved = receipts.filter((r) => r.status === "approved").length;
  const sent = receipts.filter((r) => r.status === "sent").length;
  const totalAmount = receipts.reduce((s, r) => s + r.totalAmount, 0);
  const totalVat = receipts.filter((r) => r.status !== "pending").reduce((s, r) => s + r.vatAmount, 0);

  return (
    <div
      className={cn("space-y-6 relative", dragOver && "ring-2 ring-primary ring-offset-4 ring-offset-background rounded-2xl")}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 z-30 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto text-primary mb-2" />
            <p className="text-lg font-semibold text-primary">Pusť soubory sem pro import</p>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">DPH podklady</p>
          <h1 className="text-3xl font-bold tracking-tight">Účtenky</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tip: soubory sem můžeš přímo <strong>přetáhnout</strong> ze scanner aplikace nebo Finderu.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={handleImportFolder}
            disabled={importingFolder}
            className="rounded-full gap-1.5"
            title="Importovat z nastavené scanner složky"
          >
            <FolderInput className="h-4 w-4" />
            {importingFolder ? "Importuji..." : "Importovat ze složky"}
          </Button>
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-full gap-1.5"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Zpracovávám..." : "Nahrát účtenky"}
          </Button>
        </div>
      </div>

      {folderResult && (
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm",
          folderResult.startsWith("Chyba")
            ? "bg-destructive/10 text-destructive border border-destructive/20"
            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
        )}>
          {folderResult}
        </div>
      )}

      {/* Výběr měsíce */}
      <div className="flex items-center justify-between bg-card rounded-2xl border border-border/50 shadow-sm px-5 py-3">
        <button
          onClick={() => changeMonth(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-lg font-semibold">{monthLabel}</p>
        <button
          onClick={() => changeMonth(1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* DPH souhrn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">DPH na výstupu</p>
          <p className="text-xl font-bold tabular-nums">{fmt(vatSummary.vatOutput)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{vatSummary.invoiceCount} faktur</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">DPH na vstupu</p>
          <p className="text-xl font-bold tabular-nums">{fmt(totalVat)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{approved + sent} schválených účtenek</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2">DPH k platbě</p>
          <p className="text-xl font-bold text-primary tabular-nums">{fmt(Math.max(vatSummary.vatOutput - totalVat, 0))}</p>
          <p className="text-[11px] text-primary/70 mt-1">výstup − vstup</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Účtenky</p>
          <p className="text-xl font-bold tabular-nums">{fmt(totalAmount)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{receipts.length} položek</p>
        </div>
      </div>

      {/* Součty po kategoriích — jen pokud jsou schválené účtenky */}
      {receipts.filter((r) => r.status !== "pending").length > 0 && (() => {
        const byCategory = new Map<string, { count: number; total: number }>();
        for (const r of receipts) {
          if (r.status === "pending") continue;
          const key = r.category || "other";
          const ex = byCategory.get(key) ?? { count: 0, total: 0 };
          ex.count += 1;
          ex.total += r.totalAmount;
          byCategory.set(key, ex);
        }
        const sorted = [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total);
        if (sorted.length === 0) return null;
        return (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Podle kategorií</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {sorted.map(([key, { count, total }]) => {
                const cat = RECEIPT_CATEGORIES[key] ?? { label: key, emoji: "📄" };
                return (
                  <div key={key} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cat.emoji} {cat.label}</p>
                    <p className="text-sm font-bold tabular-nums mt-1">{fmt(total)}</p>
                    <p className="text-[10px] text-muted-foreground">{count} ks</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Čeká na review */}
      {pending > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 flex-1">
            <strong>{pending}</strong> {pending === 1 ? "účtenka čeká" : "účtenky čekají"} na tvé schválení.
          </p>
        </div>
      )}

      {/* Odeslat účetní */}
      {(approved > 0 || sent > 0) && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold">Odeslat účetní</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pošle všechny schválené účtenky + CSV souhrn za {monthLabel.toLowerCase()} na e-mail účetní.
              </p>
            </div>
            <Button
              onClick={handleSendToAccountant}
              disabled={sending || approved === 0}
              className="rounded-full gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Odesílám..." : sent > 0 ? "Odeslat znovu" : "Odeslat"}
            </Button>
          </div>
          {sendResult && (
            <p className={cn("text-xs mt-3", sendResult.startsWith("Chyba") ? "text-destructive" : "text-emerald-600")}>
              {sendResult}
            </p>
          )}
        </div>
      )}

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 flex-wrap">
          <span className="text-sm font-medium text-primary">
            Vybráno {selected.size} {selected.size === 1 ? "účtenka" : selected.size < 5 ? "účtenky" : "účtenek"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => bulkAction("approve")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted/60 transition-colors"
            >
              Schválit
            </button>
            <button
              onClick={() => bulkAction("delete")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              Smazat
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Zrušit výběr
            </button>
          </div>
        </div>
      )}

      {/* Seznam účtenek */}
      {receipts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-16 text-center">
          <ReceiptIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Žádné účtenky za {monthLabel.toLowerCase()}.</p>
          <button onClick={() => fileRef.current?.click()} className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
            Nahrát první →
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-muted/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === receipts.length && receipts.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-border cursor-pointer"
              />
              <span className="text-xs font-medium text-muted-foreground">
                {selected.size > 0 ? `${selected.size} z ${receipts.length}` : `${receipts.length} účtenek`}
              </span>
            </label>
          </div>
          <div className="divide-y divide-border/50">
            {receipts.map((r) => {
              const statusInfo = {
                pending: { icon: Clock, color: "text-amber-500 bg-amber-50", label: "Čeká na review" },
                approved: { icon: Check, color: "text-emerald-600 bg-emerald-50", label: "Schváleno" },
                sent: { icon: Send, color: "text-blue-600 bg-blue-50", label: "Odesláno" },
              }[r.status];
              const Icon = statusInfo.icon;
              const isSelected = selected.has(r.id);
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/20"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(r.id)}
                    className="w-4 h-4 rounded border-border cursor-pointer shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => setDialogId(r.id)}
                    className="flex items-center gap-4 min-w-0 flex-1 text-left"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", statusInfo.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r.vendor || <span className="text-muted-foreground italic">Bez názvu</span>}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                          {statusInfo.label}
                        </span>
                        {(() => {
                          try {
                            const d = r.draftEntries ? JSON.parse(r.draftEntries) : null;
                            if (Array.isArray(d) && d.length > 1) {
                              return (
                                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                  {d.length}× účtenky
                                </span>
                              );
                            }
                          } catch { /* ignore */ }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(r.date)} · DPH {fmt(r.vatAmount)} ({r.vatRate}%)
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{fmt(r.totalAmount)}</p>
                    <button
                      onClick={() => setDialogId(r.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                      title="Zobrazit a upravit"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Smazat účtenku"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dialogId && (
        <ReceiptDialog
          receiptId={dialogId}
          onClose={() => { setDialogId(null); load(); }}
        />
      )}
    </div>
  );
}
