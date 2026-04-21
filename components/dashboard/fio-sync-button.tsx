"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check } from "lucide-react";

export function FioSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ matched: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/fio/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chyba");
      } else {
        setResult({ matched: data.matched, total: data.total });
        if (data.matched > 0) {
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setResult(null);
        setError(null);
      }, 5000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={loading}
        className="rounded-full gap-1.5"
      >
        {loading ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : result ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {loading ? "Načítám..." : "Načíst platby"}
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.matched > 0
            ? `Označeno ${result.matched} faktur jako zaplacené`
            : `Žádné nové platby (${result.total} transakcí)`}
        </span>
      )}
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
