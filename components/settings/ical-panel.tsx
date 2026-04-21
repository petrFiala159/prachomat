"use client";

import { useEffect, useState } from "react";
import { Calendar, Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ICalPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/ical-token").then((r) => r.json()).then((d) => setToken(d.token));
  }, []);

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/ical/${token}` : null;

  async function regenerate() {
    if (token && !confirm("Existující kalendář přestane fungovat. Vygenerovat nový?")) return;
    setLoading(true);
    const res = await fetch("/api/ical-token", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.token) setToken(data.token);
  }

  async function revoke() {
    if (!confirm("Zneplatnit iCal feed?")) return;
    setLoading(true);
    await fetch("/api/ical-token", { method: "DELETE" });
    setLoading(false);
    setToken(null);
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kalendář splatností (iCal)</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Přidej si URL do Google / Apple / Outlook kalendáře a uvidíš splatnosti všech nezaplacených faktur přímo v kalendáři. Po uhrazení zmizí automaticky.
      </p>

      {url ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted/60 rounded-xl px-3 py-2 text-[11px] font-mono break-all">
              {url}
            </code>
            <button
              onClick={copy}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              title="Zkopírovat"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={regenerate} disabled={loading} className="rounded-full gap-1.5">
              <RefreshCw className="h-3 w-3" />
              Nový odkaz
            </Button>
            <Button variant="outline" size="sm" onClick={revoke} disabled={loading} className="rounded-full gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
              Zneplatnit
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={regenerate} disabled={loading} className="rounded-full gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {loading ? "Generuji..." : "Vytvořit iCal feed"}
        </Button>
      )}
    </div>
  );
}
