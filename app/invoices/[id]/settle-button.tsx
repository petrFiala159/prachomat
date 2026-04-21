"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileCheck } from "lucide-react";

export function SettleButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hours, setHours] = useState("");

  async function handleSettle() {
    if (!hours) return;
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hoursWorked: hours }),
    });
    const data = await res.json();
    if (data.id) {
      router.push(`/invoices/${data.id}`);
    } else {
      alert(data.error ?? "Chyba");
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowForm(true)}
        className="rounded-full gap-1.5"
      >
        <FileCheck className="h-3.5 w-3.5" />
        Vyúčtovat
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        step="0.5"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        placeholder="Celkem hodin"
        className="h-8 w-28 rounded-xl border border-input px-3 text-sm"
      />
      <Button size="sm" onClick={handleSettle} disabled={loading || !hours} className="rounded-full">
        {loading ? "..." : "Vytvořit vyúčtování"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="rounded-full">
        Zrušit
      </Button>
    </div>
  );
}
