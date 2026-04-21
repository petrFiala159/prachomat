"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function AresCheckButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/clients/ares-check", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    setResult(
      data.withChanges > 0
        ? `${data.withChanges} z ${data.checked} klientů má změny v ARES`
        : `Zkontrolováno ${data.checked} klientů — žádné změny`
    );
    router.refresh();
    setTimeout(() => setResult(null), 6000);
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={loading}
        className="rounded-full gap-1.5"
        title="Zkontrolovat změny v ARES"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Kontroluji..." : "Zkontrolovat ARES"}
      </Button>
    </div>
  );
}
