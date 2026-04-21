"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TempoAccount = {
  id: string;
  label: string;
  baseUrl: string;
  apiToken: string;
  defaultClientId: string | null;
  defaultClient: { id: string; name: string } | null;
  projectKey: string | null;
  defaultRate: number | null;
};

type Client = { id: string; name: string; hourlyRate: number };

type FormState = {
  label: string;
  baseUrl: string;
  apiToken: string;
  defaultClientId: string;
  projectKey: string;
  defaultRate: string;
};

const emptyForm: FormState = {
  label: "",
  baseUrl: "https://api.tempo.io/4",
  apiToken: "",
  defaultClientId: "",
  projectKey: "",
  defaultRate: "",
};

export function TempoPanel() {
  const [accounts, setAccounts] = useState<TempoAccount[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/tempo/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, [load]);

  function startAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(acc: TempoAccount) {
    setForm({
      label: acc.label,
      baseUrl: acc.baseUrl,
      apiToken: "", // nezobrazujeme existující, změna jen při zadání nového
      defaultClientId: acc.defaultClientId ?? "",
      projectKey: acc.projectKey ?? "",
      defaultRate: acc.defaultRate != null ? String(acc.defaultRate) : "",
    });
    setEditingId(acc.id);
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editingId ? `/api/tempo/accounts/${editingId}` : "/api/tempo/accounts";
    const method = editingId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    cancel();
    load();
  }

  async function remove(id: string) {
    if (!confirm("Smazat Tempo účet?")) return;
    await fetch(`/api/tempo/accounts/${id}`, { method: "DELETE" });
    load();
  }

  async function testConnection(id: string) {
    setTesting(id);
    setTestResult(null);
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/tempo/hours?accountId=${id}&month=${month}`);
      const data = await res.json();
      if (res.ok) {
        setTestResult(`${id}:✓ ${data.totalHours ?? 0} h za ${month} (${data.count ?? 0} worklogs)`);
      } else {
        setTestResult(`${id}:✗ ${data.error}`);
      }
    } catch (err) {
      setTestResult(`${id}:✗ ${err instanceof Error ? err.message : "Chyba"}`);
    } finally {
      setTesting(null);
      setTimeout(() => setTestResult(null), 8000);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tempo účty — import hodin z Jiry</p>
        </div>
        {!showForm && (
          <Button type="button" size="sm" onClick={startAdd} className="rounded-full gap-1.5">
            <Plus className="h-3 w-3" />
            Přidat účet
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Přidej jeden nebo více Tempo účtů — každý může být pro jinou Jiru (jinou firmu). Na faktuře si pak vybereš, který použít.
      </p>

      {/* Seznam účtů */}
      {accounts.length > 0 && !showForm && (
        <div className="space-y-2">
          {accounts.map((acc) => {
            const testRes = testResult?.startsWith(acc.id + ":") ? testResult.slice(acc.id.length + 1) : null;
            return (
              <div key={acc.id} className="bg-muted/30 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{acc.label}</p>
                    {acc.projectKey && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono">
                        {acc.projectKey}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {acc.baseUrl}
                    {acc.defaultClient && ` · výchozí klient: ${acc.defaultClient.name}`}
                    {acc.defaultRate && ` · ${acc.defaultRate} Kč/hod`}
                  </p>
                  {testRes && (
                    <p className="text-[11px] text-muted-foreground mt-1">{testRes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => testConnection(acc.id)} disabled={testing === acc.id} className="rounded-full h-7 text-[11px] px-3">
                    {testing === acc.id ? "..." : "Test"}
                  </Button>
                  <button type="button" onClick={() => startEdit(acc)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => remove(acc.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {accounts.length === 0 && !showForm && (
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Zatím žádné Tempo účty. Přidej první přes tlačítko nahoře.</p>
        </div>
      )}

      {/* Formulář */}
      {showForm && (
        <form onSubmit={save} className="bg-muted/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {editingId ? "Upravit účet" : "Nový Tempo účet"}
            </p>
            <button type="button" onClick={cancel} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Popisek</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="např. MALFINI Jira / Alza Tempo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tempo API URL</Label>
            <Input
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.tempo.io/4"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Personal API token {editingId && <span className="text-muted-foreground font-normal">(nech prázdné pro zachování)</span>}
            </Label>
            <Input
              type="password"
              value={form.apiToken}
              onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
              placeholder="Token z Tempo → Settings → API Integration"
              autoComplete="off"
              className="font-mono text-xs"
              required={!editingId}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Výchozí klient</Label>
              <select
                value={form.defaultClientId}
                onChange={(e) => setForm({ ...form, defaultClientId: e.target.value })}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 text-xs"
              >
                <option value="">— Žádný —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Výchozí sazba (Kč/h)</Label>
              <Input
                type="number"
                value={form.defaultRate}
                onChange={(e) => setForm({ ...form, defaultRate: e.target.value })}
                placeholder="volitelné"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-xs">Jira Project Key <span className="text-muted-foreground font-normal">(volitelný filtr)</span></Label>
              <Input
                value={form.projectKey}
                onChange={(e) => setForm({ ...form, projectKey: e.target.value })}
                placeholder="např. MAL, ALZA"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Pokud zadáš, stáhnou se jen hodiny z tohoto projektu. Jinak všechny.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving} className="rounded-full gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {saving ? "Ukládám..." : editingId ? "Uložit změny" : "Přidat účet"}
            </Button>
            <Button type="button" variant="outline" onClick={cancel} className="rounded-full">
              Zrušit
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
