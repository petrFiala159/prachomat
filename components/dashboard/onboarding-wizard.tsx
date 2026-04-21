"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AresSearch } from "@/components/form/ares-search";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "welcome" | "supplier" | "bank" | "client" | "done";

type SupplierForm = {
  name: string; street: string; city: string; zip: string;
  ico: string; dic: string; email: string; phone: string;
  bankAccount: string; bankCode: string; vatPayer: boolean;
};

const emptySupplier: SupplierForm = {
  name: "", street: "", city: "", zip: "",
  ico: "", dic: "", email: "", phone: "",
  bankAccount: "", bankCode: "", vatPayer: false,
};

type ClientForm = { name: string; ico: string; dic: string; street: string; city: string; zip: string; hourlyRate: string };
const emptyClient: ClientForm = { name: "", ico: "", dic: "", street: "", city: "", zip: "", hourlyRate: "" };

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [supplier, setSupplier] = useState<SupplierForm>(emptySupplier);
  const [client, setClient] = useState<ClientForm>(emptyClient);
  const [saving, setSaving] = useState(false);

  async function saveSupplier() {
    setSaving(true);
    await fetch("/api/supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...supplier, vatRate: 21 }),
    });
    setSaving(false);
    setStep("bank");
  }

  async function saveBank() {
    setSaving(true);
    await fetch("/api/supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...supplier, vatRate: 21 }),
    });
    setSaving(false);
    setStep("client");
  }

  async function saveClient() {
    if (!client.name) {
      setStep("done");
      return;
    }
    setSaving(true);
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...client, hourlyRate: Number(client.hourlyRate) || 0, email: "" }),
    });
    setSaving(false);
    setStep("done");
  }

  function finish() {
    router.refresh();
  }

  const steps: Array<{ key: Step; label: string }> = [
    { key: "welcome", label: "Úvod" },
    { key: "supplier", label: "Firma" },
    { key: "bank", label: "Banka" },
    { key: "client", label: "Klient" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="bg-gradient-to-br from-primary/5 via-card to-card rounded-2xl border border-primary/20 shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Vítej v Prachomatu</p>
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-6">Nastavme ti to za 2 minuty</h2>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors shrink-0",
              i < stepIndex ? "bg-primary text-primary-foreground" :
              i === stepIndex ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <p className={cn(
              "text-xs font-medium flex-1",
              i <= stepIndex ? "text-foreground" : "text-muted-foreground"
            )}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {step === "welcome" && (
        <div className="space-y-4">
          <p className="text-sm text-foreground/80 leading-relaxed">
            Prachomat je tvůj nástroj pro fakturaci, účtenky a DPH. Teď ti pomůžu nastavit <strong>své údaje</strong>, <strong>bankovní účet</strong> a <strong>prvního klienta</strong>, abys mohl hned začít fakturovat.
          </p>
          <div className="bg-muted/40 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold">Co budeš potřebovat:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• IČO (údaje dotáhneme automaticky z ARES)</li>
              <li>• Číslo tvého bankovního účtu</li>
              <li>• IČO prvního klienta (volitelné)</li>
            </ul>
          </div>
          <Button onClick={() => setStep("supplier")} className="rounded-full gap-1.5">
            Jdeme na to
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === "supplier" && (
        <div className="space-y-4">
          <p className="text-sm font-semibold">Tvé fakturační údaje</p>
          <AresSearch
            onSelect={(data) => setSupplier((s) => ({ ...s, ...data }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Název / jméno</Label>
              <Input value={supplier.name} onChange={(e) => setSupplier({ ...supplier, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IČO</Label>
              <Input value={supplier.ico} onChange={(e) => setSupplier({ ...supplier, ico: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">DIČ <span className="text-muted-foreground">(volitelné)</span></Label>
              <Input value={supplier.dic} onChange={(e) => setSupplier({ ...supplier, dic: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Ulice</Label>
              <Input value={supplier.street} onChange={(e) => setSupplier({ ...supplier, street: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Město</Label>
              <Input value={supplier.city} onChange={(e) => setSupplier({ ...supplier, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PSČ</Label>
              <Input value={supplier.zip} onChange={(e) => setSupplier({ ...supplier, zip: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("welcome")} className="rounded-full">Zpět</Button>
            <Button onClick={saveSupplier} disabled={saving || !supplier.name || !supplier.ico} className="rounded-full">
              {saving ? "Ukládám..." : "Pokračovat"}
            </Button>
          </div>
        </div>
      )}

      {step === "bank" && (
        <div className="space-y-4">
          <p className="text-sm font-semibold">Bankovní účet</p>
          <p className="text-xs text-muted-foreground">Tento účet se objeví na fakturách jako cíl platby.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Číslo účtu</Label>
              <Input value={supplier.bankAccount} onChange={(e) => setSupplier({ ...supplier, bankAccount: e.target.value })} placeholder="123456789" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kód banky</Label>
              <Input value={supplier.bankCode} onChange={(e) => setSupplier({ ...supplier, bankCode: e.target.value })} placeholder="0800" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={supplier.email} onChange={(e) => setSupplier({ ...supplier, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefon</Label>
              <Input value={supplier.phone} onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={supplier.vatPayer}
              onChange={(e) => setSupplier({ ...supplier, vatPayer: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-xs">Jsem plátce DPH</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("supplier")} className="rounded-full">Zpět</Button>
            <Button onClick={saveBank} disabled={saving || !supplier.bankAccount || !supplier.bankCode} className="rounded-full">
              {saving ? "Ukládám..." : "Pokračovat"}
            </Button>
          </div>
        </div>
      )}

      {step === "client" && (
        <div className="space-y-4">
          <p className="text-sm font-semibold">První klient <span className="text-muted-foreground text-xs font-normal">(volitelné)</span></p>
          <p className="text-xs text-muted-foreground">Tento krok můžeš přeskočit a klienta přidat později.</p>
          <AresSearch
            onSelect={(data) => setClient((c) => ({ ...c, ...data }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Název firmy</Label>
              <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IČO</Label>
              <Input value={client.ico} onChange={(e) => setClient({ ...client, ico: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hodinová sazba (Kč/h)</Label>
              <Input type="number" value={client.hourlyRate} onChange={(e) => setClient({ ...client, hourlyRate: e.target.value })} placeholder="1500" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("bank")} className="rounded-full">Zpět</Button>
            <Button variant="outline" onClick={() => setStep("done")} className="rounded-full">Přeskočit</Button>
            <Button onClick={saveClient} disabled={saving} className="rounded-full">
              {saving ? "Ukládám..." : "Přidat a dokončit"}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center py-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Hotovo!</h3>
          <p className="text-sm text-muted-foreground">
            Prachomat je připravený. Pojď vystavit první fakturu.
          </p>
          <Button onClick={finish} className="rounded-full">
            Zpět na přehled
          </Button>
        </div>
      )}
    </div>
  );
}
