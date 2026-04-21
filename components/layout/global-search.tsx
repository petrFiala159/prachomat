"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, Receipt as ReceiptIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResult = {
  invoices: Array<{ id: string; number: string; clientName: string; totalAmount: number; currency: string; status: string; issueDate: string }>;
  clients: Array<{ id: string; name: string; ico: string; city: string }>;
  receipts: Array<{ id: string; vendor: string; date: string; totalAmount: number; status: string }>;
};

function fmt(n: number, currency = "CZK") {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ invoices: [], clients: [], receipts: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ invoices: [], clients: [], receipts: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ invoices: [], clients: [], receipts: [] });
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  const totalResults = results.invoices.length + results.clients.length + results.receipts.length;

  return (
    <>
      {/* Tlačítko v sidebaru */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground hover:bg-muted/70 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Hledat...</span>
        <kbd className="hidden md:inline px-1.5 py-0.5 rounded border border-border/60 text-[10px] font-mono">⌘K</kbd>
      </button>

      {/* Dialog */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border/50 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hledat faktury, klienty, účtenky..."
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-xs text-muted-foreground text-center">Hledám…</div>
              )}
              {!loading && query.length >= 2 && totalResults === 0 && (
                <div className="px-4 py-6 text-xs text-muted-foreground text-center">
                  Nic nebylo nalezeno.
                </div>
              )}
              {!loading && query.length < 2 && (
                <div className="px-4 py-6 text-xs text-muted-foreground text-center">
                  Zadej alespoň 2 znaky. Hledá se v číslech faktur, jménech klientů, IČO, částkách, prodejcích účtenek.
                </div>
              )}

              {results.invoices.length > 0 && (
                <Section title="Faktury">
                  {results.invoices.map((inv) => (
                    <ResultRow
                      key={inv.id}
                      icon={FileText}
                      iconClass="text-blue-600 bg-blue-50"
                      title={inv.number}
                      subtitle={`${inv.clientName} · ${new Date(inv.issueDate).toLocaleDateString("cs-CZ")}`}
                      right={fmt(inv.totalAmount, inv.currency)}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    />
                  ))}
                </Section>
              )}

              {results.clients.length > 0 && (
                <Section title="Klienti">
                  {results.clients.map((c) => (
                    <ResultRow
                      key={c.id}
                      icon={Users}
                      iconClass="text-violet-600 bg-violet-50"
                      title={c.name}
                      subtitle={`IČ ${c.ico} · ${c.city}`}
                      onClick={() => navigate(`/clients/${c.id}`)}
                    />
                  ))}
                </Section>
              )}

              {results.receipts.length > 0 && (
                <Section title="Účtenky">
                  {results.receipts.map((r) => (
                    <ResultRow
                      key={r.id}
                      icon={ReceiptIcon}
                      iconClass="text-orange-600 bg-orange-50"
                      title={r.vendor || "Bez názvu"}
                      subtitle={new Date(r.date).toLocaleDateString("cs-CZ")}
                      right={fmt(r.totalAmount)}
                      onClick={() => navigate(`/receipts`)}
                    />
                  ))}
                </Section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function ResultRow({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  right,
  onClick,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle: string;
  right?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
    >
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", iconClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      {right && <p className="text-sm font-semibold tabular-nums shrink-0">{right}</p>}
    </button>
  );
}
