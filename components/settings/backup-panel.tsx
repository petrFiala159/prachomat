"use client";

import { useRef, useState } from "react";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const confirmed = confirm(
      "POZOR: Obnova zálohy PŘEPÍŠE veškerá stávající data (faktury, klienty, účtenky, nastavení).\n\nDoporučujeme si nejdřív udělat export současného stavu.\n\nPokračovat?"
    );
    if (!confirmed) return;

    setRestoring(true);
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Obnova selhala");
      } else {
        setResult(
          `Obnoveno: ${data.restored.clients} klientů, ${data.restored.invoices} faktur, ${data.restored.invoiceItems} položek, ${data.restored.templates} šablon, ${data.restored.receipts} účtenek.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Záloha a obnova dat</p>
      <p className="text-xs text-muted-foreground">
        Záloha je JSON soubor se všemi klienty, fakturami, šablonami a účtenkami (včetně scanů v base64). Ukládej pravidelně jako pojistku.
      </p>

      <div className="flex flex-wrap gap-2">
        <a
          href="/api/backup"
          download
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-input bg-transparent text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Stáhnout zálohu
        </a>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleRestore}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={restoring}
          className="rounded-full gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          {restoring ? "Obnovuji..." : "Obnovit ze zálohy"}
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Obnova přepíše veškerá stávající data. Před obnovou si udělej export aktuálního stavu.</span>
      </div>

      {result && (
        <p className="text-xs text-emerald-600">{result}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
