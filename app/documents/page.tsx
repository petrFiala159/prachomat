"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Trash2, Download, X, ExternalLink, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = {
  id: string;
  title: string;
  category: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  note: string | null;
  tags: string;
  validFrom: string | null;
  validUntil: string | null;
  client: { id: string; name: string } | null;
  createdAt: string;
};

type Client = { id: string; name: string };

const CATEGORIES: Record<string, { label: string; color: string }> = {
  contract:    { label: "Smlouva",     color: "bg-blue-50 text-blue-600" },
  agreement:   { label: "Dohoda",      color: "bg-violet-50 text-violet-600" },
  sla:         { label: "SLA",         color: "bg-emerald-50 text-emerald-600" },
  certificate: { label: "Certifikát",  color: "bg-amber-50 text-amber-600" },
  nda:         { label: "NDA",         color: "bg-red-50 text-red-600" },
  order:       { label: "Objednávka",  color: "bg-cyan-50 text-cyan-600" },
  other:       { label: "Ostatní",     color: "bg-zinc-100 text-zinc-500" },
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("cs-CZ");
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("contract");
  const [clientId, setClientId] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(() => {
    fetch("/api/documents").then((r) => r.json()).then(setDocuments);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, [load]);

  function resetForm() {
    setTitle(""); setCategory("contract"); setClientId("");
    setNote(""); setTags(""); setValidFrom(""); setValidUntil("");
    setFile(null);
    setShowForm(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;
    setSaving(true);

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        clientId: clientId || null,
        note,
        tags,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        filename: file.name,
        mimeType: file.type || "application/pdf",
        fileContent: base64,
      }),
    });

    setSaving(false);
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Smazat dokument?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    load();
  }

  const filteredDocs = filter === "all" ? documents : documents.filter((d) => d.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Archiv</p>
          <h1 className="text-3xl font-bold tracking-tight">Dokumenty</h1>
          <p className="text-xs text-muted-foreground mt-1">Smlouvy, SLA, NDA, certifikáty a další.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-full gap-1.5">
          {showForm ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {showForm ? "Zrušit" : "Nahrát dokument"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Název dokumentu</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="např. Rámcová smlouva MALFINI" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategorie</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm">
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Klient (volitelné)</Label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm">
                <option value="">— Žádný —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Platnost od</Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Platnost do</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Tagy</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Poznámka</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Soubor (PDF / DOCX / obrázek)</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm"
                required
              />
              {file && (
                <p className="text-[11px] text-muted-foreground">
                  {file.name} · {fmtSize(file.size)}
                </p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={saving || !file || !title} className="rounded-full">
            {saving ? "Nahrávám..." : "Uložit dokument"}
          </Button>
        </form>
      )}

      {/* Filtry */}
      {documents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
              filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            Vše ({documents.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, { label }]) => {
            const count = documents.filter((d) => d.category === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
                  filter === key ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Seznam */}
      {filteredDocs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">
            {documents.length === 0 ? "Zatím žádné dokumenty." : "Žádné dokumenty v této kategorii."}
          </p>
          {documents.length === 0 && (
            <button onClick={() => setShowForm(true)} className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
              Nahrát první →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
          {filteredDocs.map((doc) => {
            const cat = CATEGORIES[doc.category] ?? CATEGORIES.other;
            const expired = doc.validUntil && new Date(doc.validUntil) < new Date();
            return (
              <div key={doc.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors group">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{doc.title}</p>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", cat.color)}>
                        {cat.label}
                      </span>
                      {expired && (
                        <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-[10px] font-semibold">
                          vypršela
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {doc.client && `${doc.client.name} · `}
                      {doc.filename} · {fmtSize(doc.fileSize)}
                      {doc.validUntil && ` · do ${fmtDate(doc.validUntil)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/documents/${doc.id}/file`}
                    target="_blank"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    title="Otevřít"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`/api/documents/${doc.id}/file`}
                    download={doc.filename}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    title="Stáhnout"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Smazat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
