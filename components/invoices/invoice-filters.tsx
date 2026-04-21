"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const STATUSES = [
  { value: "", label: "Vše" },
  { value: "DRAFT", label: "Koncept" },
  { value: "SENT", label: "Odesláno" },
  { value: "PAID", label: "Zaplaceno" },
  { value: "OVERDUE", label: "Po splatnosti" },
];

type Client = { id: string; name: string };

type Props = {
  clients: Client[];
  currentYear: number;
  years: number[];
};

export function InvoiceFilters({ clients, currentYear, years }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const clientId = searchParams.get("client") ?? "";
  const year = searchParams.get("year") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Status filter */}
      <div className="inline-flex rounded-xl border border-input bg-muted/40 p-0.5 gap-0.5">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setParam("status", s.value)}
            className={`px-3 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
              status === s.value
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Rok */}
      {years.length > 1 && (
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setParam("year", e.target.value)}
            className="h-9 appearance-none rounded-xl border border-input bg-card pl-3 pr-8 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">Všechny roky</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Odběratel */}
      {clients.length > 0 && (
        <div className="relative">
          <select
            value={clientId}
            onChange={(e) => setParam("client", e.target.value)}
            className="h-9 appearance-none rounded-xl border border-input bg-card pl-3 pr-8 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">Všichni odběratelé</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}
