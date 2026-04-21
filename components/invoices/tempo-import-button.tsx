"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

type TempoAccount = {
  id: string;
  label: string;
  defaultClientId: string | null;
  projectKey: string | null;
  defaultRate: number | null;
};

type Props = {
  onImport: (hours: number, opts: { accountLabel: string; projectKey?: string; rate?: number }) => void;
  currentClientId?: string;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(): string {
  const d = new Date();
  d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Summary = {
  totalHours: number;
  billableHours?: number;
  count: number;
  projects: Record<string, { hours: number; count: number }>;
};

export function TempoImportButton({ onImport, currentClientId }: Props) {
  const [accounts, setAccounts] = useState<TempoAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const [month, setMonth] = useState(prevMonth());
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/tempo/accounts").then((r) => r.json()).then((data: TempoAccount[]) => {
      setAccounts(data);
      // Auto-výběr: pokud existuje účet s defaultClientId odpovídající vybranému klientovi, vybere se
      if (currentClientId) {
        const match = data.find((a) => a.defaultClientId === currentClientId);
        if (match) {
          setAccountId(match.id);
          return;
        }
      }
      if (data.length === 1) setAccountId(data[0].id);
    });
  }, [currentClientId]);

  async function fetchHours() {
    if (!accountId) {
      setError("Vyber Tempo účet");
      return;
    }
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch(`/api/tempo/hours?accountId=${accountId}&month=${month}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chyba");
      } else {
        setSummary(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setLoading(false);
    }
  }

  const currentAccount = accounts.find((a) => a.id === accountId);

  function applyAll() {
    if (summary && currentAccount) {
      onImport(summary.totalHours, {
        accountLabel: currentAccount.label,
        projectKey: currentAccount.projectKey ?? undefined,
        rate: currentAccount.defaultRate ?? undefined,
      });
      setOpen(false);
      setSummary(null);
    }
  }

  function applyProject(key: string) {
    if (summary && currentAccount) {
      onImport(summary.projects[key].hours, {
        accountLabel: currentAccount.label,
        projectKey: key,
        rate: currentAccount.defaultRate ?? undefined,
      });
      setOpen(false);
      setSummary(null);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full gap-1.5"
      >
        <Clock className="h-3.5 w-3.5" />
        Import z Tempa
      </Button>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Import z Tempa</p>
          <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-muted-foreground hover:text-foreground">Zavřít</button>
        </div>
        <p className="text-xs text-muted-foreground">
          Žádné Tempo účty. Přidej si je v{" "}
          <a href="/settings" className="text-primary underline">Nastavení → Tempo</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Import hodin z Tempa</p>
        <button
          type="button"
          onClick={() => { setOpen(false); setSummary(null); }}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Zavřít
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select
          value={accountId}
          onChange={(e) => { setAccountId(e.target.value); setSummary(null); }}
          className="flex h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
        >
          <option value="">— Vyber Tempo účet —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}{a.projectKey ? ` (${a.projectKey})` : ""}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          max={currentMonth()}
          className="flex h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
        />
      </div>
      <Button type="button" size="sm" onClick={fetchHours} disabled={loading || !accountId} className="rounded-full">
        {loading ? "Načítám..." : "Načíst hodiny"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {summary && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border/50">
            <div>
              <p className="text-xs font-semibold">Celkem za {month}</p>
              <p className="text-[11px] text-muted-foreground">
                {summary.count} worklogs{currentAccount?.projectKey ? ` · projekt ${currentAccount.projectKey}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums">{summary.totalHours} h</span>
              <Button type="button" size="sm" onClick={applyAll} className="rounded-full h-7 text-[11px]">
                Použít
              </Button>
            </div>
          </div>
          {Object.keys(summary.projects).length > 1 && !currentAccount?.projectKey && (
            <>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Nebo po projektech:</p>
              {Object.entries(summary.projects).map(([key, { hours, count }]) => (
                <div key={key} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border/50">
                  <div>
                    <p className="text-xs font-medium">{key}</p>
                    <p className="text-[11px] text-muted-foreground">{count} záznamů</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums">{hours} h</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyProject(key)} className="rounded-full h-7 text-[11px]">
                      Použít
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
