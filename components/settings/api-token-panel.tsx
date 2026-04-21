"use client";

import { useEffect, useState } from "react";
import { Key, Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApiTokenPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/api-token")
      .then((r) => r.json())
      .then((d) => setToken(d.token));
  }, []);

  async function regenerate() {
    if (token && !confirm("Existující token přestane platit. Opravdu vygenerovat nový?")) return;
    setLoading(true);
    const res = await fetch("/api/auth/api-token", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.token) setToken(data.token);
  }

  async function revoke() {
    if (!confirm("Zneplatnit API token?")) return;
    setLoading(true);
    await fetch("/api/auth/api-token", { method: "DELETE" });
    setLoading(false);
    setToken(null);
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">API token</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Token pro volání Prachomat API z mobilní aplikace nebo externí integrace. Použij v HTTP hlavičce:{" "}
        <code className="bg-muted px-1 rounded text-[11px]">Authorization: Bearer &lt;token&gt;</code>
      </p>

      {token ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted/60 rounded-xl px-3 py-2 text-[11px] font-mono break-all">
              {token}
            </code>
            <button
              onClick={copyToken}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              title="Zkopírovat"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={regenerate}
              disabled={loading}
              className="rounded-full gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Vygenerovat nový
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={revoke}
              disabled={loading}
              className="rounded-full gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Zneplatnit
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={regenerate}
          disabled={loading}
          className="rounded-full gap-1.5"
        >
          <Key className="h-3.5 w-3.5" />
          {loading ? "Generuji..." : "Vygenerovat API token"}
        </Button>
      )}
    </div>
  );
}
