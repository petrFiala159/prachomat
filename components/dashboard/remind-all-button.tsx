"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, Check } from "lucide-react";

type Props = {
  invoiceIds: string[];
};

export function RemindAllButton({ invoiceIds }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleRemindAll() {
    if (!confirm(`Odeslat upomínku pro všechny ${invoiceIds.length} faktury po splatnosti?`)) return;
    setState("loading");
    await Promise.all(
      invoiceIds.map((id) => fetch(`/api/invoices/${id}/remind`, { method: "POST" }))
    );
    setState("done");
    router.refresh();
    setTimeout(() => setState("idle"), 3000);
  }

  return (
    <button
      onClick={handleRemindAll}
      disabled={state !== "idle"}
      suppressHydrationWarning
      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
    >
      {state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === "done" && <Check className="h-3.5 w-3.5" />}
      {state === "idle" && <Bell className="h-3.5 w-3.5" />}
      {state === "done" ? "Odesláno" : "Upomínka všem"}
    </button>
  );
}
