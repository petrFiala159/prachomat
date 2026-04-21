"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type AresResult = {
  ico: string;
  name: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
};

type Props = {
  /** Počáteční hodnota — může být IČO nebo název */
  initialValue?: string;
  onSelect: (data: AresResult) => void;
  placeholder?: string;
};

export function AresSearch({ initialValue = "", onSelect, placeholder = "Název firmy nebo IČO…" }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<AresResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/ares/search?q=${encodeURIComponent(q.trim())}`);
      const data: AresResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(item: AresResult) {
    setQuery(item.name);
    setOpen(false);
    setResults([]);
    onSelect(item);
  }

  // Zavření dropdownu při kliknutí mimo
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {results.map((item) => (
            <button
              key={item.ico}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">IČO {item.ico}</span>
              </div>
              {(item.street || item.city) && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[item.street, item.city].filter(Boolean).join(", ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
