"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AresSearch } from "@/components/form/ares-search";
import { Upload, X } from "lucide-react";
import { LogoCropDialog } from "@/components/form/logo-crop-dialog";
import { BackupPanel } from "@/components/settings/backup-panel";
import { ApiTokenPanel } from "@/components/settings/api-token-panel";
import { ICalPanel } from "@/components/settings/ical-panel";
import { TempoPanel } from "@/components/settings/tempo-panel";

type Supplier = {
  name: string; street: string; city: string; zip: string;
  ico: string; dic: string; bankAccount: string; bankCode: string;
  email: string; phone: string; vatPayer: boolean; vatRate: string;
  logo: string; fioToken: string;
  invoicePrefix: string; invoiceDigits: string; invoiceUseYear: boolean;
  accountantEmail: string; accountantName: string;
  scanFolder: string;
  pdfAccentColor: string; pdfFooterText: string; pdfTerms: string;
  emailInvoiceSubject: string; emailInvoiceBody: string;
  emailReminderSubject: string; emailReminderBody: string;
};

const empty: Supplier = {
  name: "", street: "", city: "", zip: "",
  ico: "", dic: "", bankAccount: "", bankCode: "",
  email: "", phone: "", vatPayer: false, vatRate: "21", logo: "", fioToken: "",
  invoicePrefix: "", invoiceDigits: "3", invoiceUseYear: true,
  accountantEmail: "", accountantName: "",
  scanFolder: "",
  pdfAccentColor: "#111827", pdfFooterText: "", pdfTerms: "",
  emailInvoiceSubject: "", emailInvoiceBody: "",
  emailReminderSubject: "", emailReminderBody: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState<Supplier>(empty);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  useEffect(() => {
    fetch("/api/supplier").then((r) => r.json()).then((data) => {
      if (data) setForm({
        ...empty,
        ...data,
        vatPayer: Boolean(data.vatPayer),
        vatRate: String(data.vatRate ?? 21),
        invoiceDigits: String(data.invoiceDigits ?? 3),
        invoiceUseYear: data.invoiceUseYear !== false,
        invoicePrefix: data.invoicePrefix ?? "",
      });
    });
  }, []);

  function set(field: keyof Supplier, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        vatRate: Number(form.vatRate),
        invoiceDigits: Number(form.invoiceDigits),
      }),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Profil</p>
          <h1 className="text-3xl font-bold tracking-tight">Nastavení</h1>
        </div>
        <Button type="submit" form="settings-form" disabled={loading} className="rounded-full">
          {saved ? "✓ Uloženo" : loading ? "Ukládám..." : "Uložit nastavení"}
        </Button>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 items-start">

          {/* ── LEVÝ SLOUPEC ── */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Moje fakturační údaje</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Vyhledat v ARES</Label>
                <AresSearch
                  initialValue={form.name}
                  onSelect={(data) =>
                    setForm((f) => ({ ...f, ico: data.ico, name: data.name, dic: data.dic, street: data.street, city: data.city, zip: data.zip }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">IČO</Label>
                <Input value={form.ico} onChange={(e) => set("ico", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Název / jméno</Label>
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
          </div>

          {/* ── PRAVÝ SLOUPEC ── */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bankovní spojení</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Číslo účtu</Label>
                  <Input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="123456789" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kód banky</Label>
                  <Input value={form.bankCode} onChange={(e) => set("bankCode", e.target.value)} placeholder="0800" required />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">DPH</p>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Jsem plátce DPH</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Faktury budou obsahovat DPH</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.vatPayer}
                  onClick={() => setForm((f) => ({ ...f, vatPayer: !f.vatPayer }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${form.vatPayer ? "bg-primary" : "bg-input"}`}
                >
                  <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${form.vatPayer ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </label>
              {form.vatPayer && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sazba DPH (%)</Label>
                  <select
                    value={form.vatRate}
                    onChange={(e) => setForm((f) => ({ ...f, vatRate: e.target.value }))}
                    className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <option value="21">21 % — základní sazba</option>
                    <option value="12">12 % — snížená sazba</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kontakt</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">E-mail <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Telefon <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Logo firmy</p>
              <p className="text-xs text-muted-foreground">Logo se zobrazí na faktuře místo výchozího "P". Doporučený formát PNG nebo SVG.</p>
              {form.logo ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.logo} alt="Logo" className="h-16 w-auto max-w-32 object-contain rounded-xl border border-border bg-muted/30 p-1" />
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, logo: "" })); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Odebrat logo
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Změnit
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/30 transition-colors text-sm text-muted-foreground"
                >
                  <Upload className="h-4 w-4" />
                  Nahrát logo
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Číslování faktur</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prefix</Label>
                  <Input
                    value={form.invoicePrefix}
                    onChange={(e) => set("invoicePrefix", e.target.value)}
                    placeholder="např. FV"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Počet číslic</Label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={form.invoiceDigits}
                    onChange={(e) => set("invoiceDigits", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rok v číslu</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.invoiceUseYear}
                    onClick={() => setForm((f) => ({ ...f, invoiceUseYear: !f.invoiceUseYear }))}
                    className={`relative inline-flex h-9 w-full items-center justify-center rounded-xl border border-input text-sm ${form.invoiceUseYear ? "bg-primary/5 border-primary text-primary" : "text-muted-foreground"}`}
                  >
                    {form.invoiceUseYear ? "Zapnuto" : "Vypnuto"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Příklad: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                  {form.invoicePrefix}{form.invoiceUseYear ? new Date().getFullYear() : ""}{String(1).padStart(Number(form.invoiceDigits || 3), "0")}
                </code>
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vzhled PDF faktury</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Barva akcentu</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.pdfAccentColor}
                    onChange={(e) => set("pdfAccentColor", e.target.value)}
                    className="h-9 w-16 rounded-xl border border-input cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.pdfAccentColor}
                    onChange={(e) => set("pdfAccentColor", e.target.value)}
                    placeholder="#111827"
                    className="font-mono text-xs flex-1"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Barva pruhu nahoře a nadpisu &quot;FAKTURA&quot;. Doporučujeme tmavé tóny (černá, námořní modř, tmavě zelená).
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Obchodní podmínky <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                <textarea
                  value={form.pdfTerms}
                  onChange={(e) => set("pdfTerms", e.target.value)}
                  placeholder="V případě prodlení s úhradou je účtován úrok 0,05 % z dlužné částky za každý den..."
                  rows={3}
                  className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Patička <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                <Input
                  value={form.pdfFooterText}
                  onChange={(e) => set("pdfFooterText", e.target.value)}
                  placeholder="Zapsaná v ŽR u MěÚ Brno pod č.j. ..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Šablony e-mailů</p>
              <p className="text-[11px] text-muted-foreground">
                Dostupné proměnné: <code className="bg-muted px-1 rounded">{`{{number}}`}</code>,{" "}
                <code className="bg-muted px-1 rounded">{`{{amount}}`}</code>,{" "}
                <code className="bg-muted px-1 rounded">{`{{dueDate}}`}</code>,{" "}
                <code className="bg-muted px-1 rounded">{`{{supplier}}`}</code>,{" "}
                <code className="bg-muted px-1 rounded">{`{{clientName}}`}</code>,{" "}
                <code className="bg-muted px-1 rounded">{`{{bankAccount}}`}</code>,{" "}
                <code className="bg-muted px-1 rounded">{`{{daysOverdue}}`}</code> (jen pro upomínku)
              </p>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Odeslání faktury</Label>
                <Input
                  value={form.emailInvoiceSubject}
                  onChange={(e) => set("emailInvoiceSubject", e.target.value)}
                  placeholder="Faktura č. {{number}} – {{supplier}}"
                  className="text-xs"
                />
                <textarea
                  value={form.emailInvoiceBody}
                  onChange={(e) => set("emailInvoiceBody", e.target.value)}
                  placeholder="Ponechte prázdné pro výchozí text. Odřádkování = nový odstavec."
                  rows={5}
                  className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Upomínka</Label>
                <Input
                  value={form.emailReminderSubject}
                  onChange={(e) => set("emailReminderSubject", e.target.value)}
                  placeholder="Upomínka – faktura č. {{number}} po splatnosti"
                  className="text-xs"
                />
                <textarea
                  value={form.emailReminderBody}
                  onChange={(e) => set("emailReminderBody", e.target.value)}
                  placeholder="Ponechte prázdné pro výchozí text."
                  rows={5}
                  className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Scanner složka</p>
              <p className="text-xs text-muted-foreground">
                Nastav absolutní cestu ke složce, kam ukládá scany Brother iPrint&amp;Scan (nebo jakýkoli scanner). Na stránce Účtenky pak můžeš kliknout &quot;Importovat ze složky&quot; a nové soubory se automaticky načtou. Zpracované scany se přesunou do podsložky <code className="bg-muted px-1 rounded text-[10px]">.prachomat-imported</code>.
              </p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cesta ke složce</Label>
                <Input
                  value={form.scanFolder}
                  onChange={(e) => set("scanFolder", e.target.value)}
                  placeholder="~/Documents/prachomat-scans"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Podporované formáty: JPG, PNG, PDF, GIF, WEBP, HEIC. Tilda <code>~</code> se automaticky nahradí za domovskou složku.
                </p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Účetní</p>
              <p className="text-xs text-muted-foreground">Na tento e-mail odesílá Prachomat měsíční balíček účtenek z obrazovky &quot;Účtenky&quot;.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Jméno účetní <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                  <Input value={form.accountantName} onChange={(e) => set("accountantName", e.target.value)} placeholder="paní Nováková" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">E-mail účetní</Label>
                  <Input type="email" value={form.accountantEmail} onChange={(e) => set("accountantEmail", e.target.value)} placeholder="ucetni@firma.cz" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Automatické párování plateb (Fio banka)</p>
              <p className="text-xs text-muted-foreground">
                Token vygeneruj v Internetbankingu Fio → Nastavení → API → Povolit službu. Nastav pouze práva ke čtení.
              </p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fio API token <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                <Input
                  type="password"
                  value={form.fioToken}
                  onChange={(e) => set("fioToken", e.target.value)}
                  placeholder="64 znaků z Fio IB"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>

      </form>

      <TempoPanel />
      <BackupPanel />
      <ApiTokenPanel />
      <ICalPanel />

      {cropSrc && (
        <LogoCropDialog
          src={cropSrc}
          onConfirm={(cropped) => {
            setForm((f) => ({ ...f, logo: cropped }));
            setCropSrc(null);
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
