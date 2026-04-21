"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AresSearch } from "@/components/form/ares-search";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const empty = { name: "", ico: "", dic: "", street: "", city: "", zip: "", email: "", hourlyRate: "" };

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hourlyRate: Number(form.hourlyRate) }),
    });
    if (!res.ok) {
      setLoading(false);
      alert("Nepodařilo se uložit odběratele. Zkus to znovu.");
      return;
    }
    router.push("/clients");
    router.refresh();
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na odběratele
        </Link>
        <p className="text-sm font-medium text-muted-foreground mb-1">Odběratelé</p>
        <h1 className="text-3xl font-bold tracking-tight">Nový odběratel</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* IČO s ARES */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Základní údaje</p>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Název firmy nebo IČO</Label>
            <AresSearch
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

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="rounded-full">
            {loading ? "Ukládám..." : "Uložit odběratele"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full">
            Zrušit
          </Button>
        </div>
      </form>
    </div>
  );
}
