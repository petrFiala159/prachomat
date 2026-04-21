"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, ShieldQuestion, RefreshCw } from "lucide-react";

type VerifyResult = {
  vies: { valid: boolean; name?: string; address?: string } | null;
  vatPayer: { isPayer: boolean; status: string } | null;
};

type ClientInfo = {
  dic: string | null;
  viesValid: boolean | null;
  viesCheckedAt: string | null;
  vatPayerStatus: string | null;
  vatPayerCheckedAt: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("cs-CZ");
}

export function ClientVerify({ clientId }: { clientId: string }) {
  const [info, setInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  function load() {
    fetch(`/api/clients/${clientId}`)
      .then((r) => r.json())
      .then(setInfo);
  }

  useEffect(load, [clientId]);

  async function verify() {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}/verify`, { method: "POST" });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    load();
  }

  if (!info) return null;

  const isEu = info.dic && /^[A-Z]{2}/i.test(info.dic);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ověření DIČ</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Kontrola VIES (EU) a stavu plátce DPH (CZ)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={verify}
          disabled={loading}
          className="rounded-full gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Ověřuji..." : "Ověřit"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* VIES */}
        {isEu && (
          <div className="bg-muted/30 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2">
              {info.viesValid === true ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : info.viesValid === false ? (
                <ShieldAlert className="h-4 w-4 text-red-500" />
              ) : (
                <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-xs font-semibold">VIES (EU)</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {info.viesValid === true
                ? `Platné · ověřeno ${fmtDate(info.viesCheckedAt)}`
                : info.viesValid === false
                ? `Neplatné! Zkontroluj DIČ`
                : "Neověřeno"}
            </p>
            {result?.vies?.name && (
              <p className="text-[11px] text-muted-foreground">{result.vies.name}</p>
            )}
          </div>
        )}

        {/* Plátce DPH CZ */}
        <div className="bg-muted/30 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2">
            {info.vatPayerStatus === "active" ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            ) : info.vatPayerStatus === "inactive" ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : (
              <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
            )}
            <p className="text-xs font-semibold">Plátce DPH (CZ)</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {info.vatPayerStatus === "active"
              ? `Aktivní plátce · ověřeno ${fmtDate(info.vatPayerCheckedAt)}`
              : info.vatPayerStatus === "inactive"
              ? "Neplátce DPH"
              : "Neověřeno"}
          </p>
        </div>
      </div>
    </div>
  );
}
