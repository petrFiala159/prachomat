"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AresSearch } from "@/components/form/ares-search";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ClientHistory } from "@/components/clients/client-history";
import { ClientVerify } from "@/components/clients/client-verify";

type Form = {
  name: string; ico: string; dic: string; street: string;
  city: string; zip: string; email: string; hourlyRate: string;
};

const empty: Form = {
  name: "", ico: "", dic: "", street: "",
  city: "", zip: "", email: "", hourlyRate: "",
};

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({ ...empty, ...data, hourlyRate: String(data.hourlyRate ?? "") });
        setLoading(false);
      });
  }, [id]);

  function set(field: keyof Form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hourlyRate: Number(form.hourlyRate) }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    if (!confirm("Opravdu smazat tohoto odběratele? Faktury zůstanou zachovány.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    router.push("/clients");
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse mb-4" />
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na odběratele
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Odběratel</p>
            <h1 className="text-3xl font-bold tracking-tight">{form.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" form="client-form" disabled={saving} className="rounded-full">
              {saved ? "✓ Uloženo" : saving ? "Ukládám..." : "Uložit změny"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="rounded-full text-destructive hover:text-destructive gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Smazat
            </Button>
          </div>
        </div>
      </div>

      <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 items-start">

          {/* ── LEVÝ SLOUPEC ── */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Základní údaje</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Vyhledat v ARES</Label>
                <AresSearch
                  initialValue={form.name}
                  onSelect={(data) =>
                    setForm((f) => ({
                      ...f,
                      ico: data.ico,
                      name: data.name,
                      dic: data.dic,
                      street: data.street,
                      city: data.city,
                      zip: data.zip,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">IČO</Label>
                <Input value={form.ico} onChange={(e) => set("ico", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Název firmy / jméno</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">DIČ <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                <Input value={form.dic} onChange={(e) => set("dic", e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── PRAVÝ SLOUPEC ── */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Adresa</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ulice a číslo</Label>
                <Input value={form.street} onChange={(e) => set("street", e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1">
                  <Label className="text-sm font-medium">PSČ</Label>
                  <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-medium">Město</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fakturace</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hodinová sazba (Kč/hod)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.hourlyRate}
                  onChange={(e) => set("hourlyRate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">E-mail <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </form>

      <ClientVerify clientId={id} />

      <div className="pt-6 border-t border-border/40 space-y-4">
        <h2 className="text-lg font-semibold">Historie a statistiky</h2>
        <ClientHistory clientId={id} />
      </div>
    </div>
  );
}
