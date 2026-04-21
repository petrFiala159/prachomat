"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Zap, X, RefreshCw, Pencil } from "lucide-react";

type Client = { id: string; name: string; hourlyRate: number };
type Template = {
  id: string;
  name: string;
  hoursWorked: number;
  hourlyRate: number;
  note: string | null;
  dueDays: number;
  recurring: boolean;
  intervalDays: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  active: boolean;
  clientId: string;
  client: { name: string };
};

type Form = {
  name: string;
  clientId: string;
  hoursWorked: string;
  hourlyRate: string;
  note: string;
  dueDays: string;
  recurring: boolean;
  intervalDays: string;
};

const emptyForm: Form = {
  name: "", clientId: "", hoursWorked: "", hourlyRate: "", note: "", dueDays: "14",
  recurring: false, intervalDays: "30",
};

function formatCZK(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  function load() {
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }

  useEffect(() => {
    load();
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  function handleClientChange(id: string) {
    setForm((f) => ({ ...f, clientId: id }));
    const client = clients.find((c) => c.id === id);
    if (client?.hourlyRate) setForm((f) => ({ ...f, hourlyRate: String(client.hourlyRate) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
    const method = editingId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    load();
  }

  function handleEdit(t: Template) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      clientId: t.clientId,
      hoursWorked: String(t.hoursWorked),
      hourlyRate: String(t.hourlyRate),
      note: t.note ?? "",
      dueDays: String(t.dueDays),
      recurring: t.recurring,
      intervalDays: String(t.intervalDays),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Smazat šablonu?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    load();
  }

  async function handleCreateInvoice(id: string) {
    setCreating(id);
    const res = await fetch(`/api/templates/${id}/create-invoice`, { method: "POST" });
    const data = await res.json();
    if (data.id) {
      router.push(`/invoices/${data.id}`);
    } else {
      alert(data.error ?? "Chyba při vytváření faktury");
      setCreating(null);
    }
  }

  async function handleBulkCreate() {
    if (!confirm(`Vystavit faktury ze všech ${templates.length} šablon najednou?`)) return;
    const res = await fetch("/api/templates/bulk-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    alert(`Vytvořeno ${data.created} faktur`);
    router.push("/invoices");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Automatizace</p>
          <h1 className="text-3xl font-bold tracking-tight">Šablony faktur</h1>
        </div>
        <div className="flex items-center gap-2">
          {templates.length > 0 && !showForm && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBulkCreate}
              className="rounded-full gap-1.5"
              title="Vystavit faktury ze všech šablon"
            >
              <Zap className="h-4 w-4" />
              Vystavit vše ({templates.length})
            </Button>
          )}
          <Button onClick={() => showForm ? handleCancelEdit() : setShowForm(true)} className="rounded-full gap-1.5">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Zrušit" : "Nová šablona"}
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {editingId ? "Upravit šablonu" : "Nová šablona"}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Název šablony</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="např. Měsíční práce pro Alza"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Odběratel</Label>
              <select
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                value={form.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                required
              >
                <option value="">— Vybrat —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Hodiny</Label>
              <Input type="number" min="0" step="0.5" value={form.hoursWorked} onChange={(e) => setForm((f) => ({ ...f, hoursWorked: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sazba (Kč/hod)</Label>
              <Input type="number" min="0" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Splatnost (dní)</Label>
              <Input type="number" min="1" value={form.dueDays} onChange={(e) => setForm((f) => ({ ...f, dueDays: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Poznámka <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
            <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Popis práce..." />
          </div>

          {/* Opakování */}
          <div className="border-t border-border/50 pt-4 space-y-3">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium">Opakovaná fakturace</p>
                <p className="text-xs text-muted-foreground mt-0.5">Automaticky vytvořit fakturu v zadaném intervalu</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.recurring}
                onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${form.recurring ? "bg-primary" : "bg-input"}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${form.recurring ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </label>
            {form.recurring && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Interval</Label>
                <select
                  value={form.intervalDays}
                  onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="7">Každý týden</option>
                  <option value="14">Každé 2 týdny</option>
                  <option value="30">Každý měsíc</option>
                  <option value="90">Každé 3 měsíce</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving} className="rounded-full">
              {saving ? "Ukládám..." : editingId ? "Uložit změny" : "Uložit šablonu"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-full">
                Zrušit
              </Button>
            )}
          </div>
        </form>
      )}

      {templates.length === 0 && !showForm ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-16 text-center">
          <Zap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Zatím žádné šablony.</p>
          <button onClick={() => setShowForm(true)} className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
            Vytvoř první →
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4 group">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    {t.recurring && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 shrink-0">
                        <RefreshCw className="h-2.5 w-2.5" />
                        {t.intervalDays === 7 ? "týdně" : t.intervalDays === 14 ? "2 týdny" : t.intervalDays === 30 ? "měsíčně" : `${t.intervalDays}d`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.client.name} · {t.hoursWorked}h × {formatCZK(t.hourlyRate)} = {formatCZK(t.hoursWorked * t.hourlyRate)} · splatnost {t.dueDays} dní
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleCreateInvoice(t.id)}
                  disabled={creating === t.id}
                  className="rounded-full gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {creating === t.id ? "Vytvářím..." : "Vytvořit fakturu"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(t)}
                  className="rounded-full w-8 h-8 p-0"
                  title="Upravit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(t.id)}
                  className="rounded-full text-destructive hover:text-destructive w-8 h-8 p-0"
                  title="Smazat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
