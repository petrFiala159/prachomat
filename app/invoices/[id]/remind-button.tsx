"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Bell, Loader2, Check } from "lucide-react";

type Props = {
  invoiceId: string;
  clientEmail: string | null;
};

export function RemindButton({ invoiceId, clientEmail }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleRemind() {
    if (!clientEmail) return;
    if (!confirm(`Odeslat upomínku na ${clientEmail}?`)) return;

    setState("loading");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/remind`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Chyba při odesílání");
        setState("error");
        setTimeout(() => setState("idle"), 4000);
      } else {
        setState("done");
        router.refresh();
        setTimeout(() => setState("idle"), 3000);
      }
    } catch {
      setErrorMsg("Nepodařilo se odeslat");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  if (!clientEmail) {
    return (
      <span
        title="Odběratel nemá zadaný email"
        className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2 opacity-40 cursor-not-allowed")}
      >
        <Bell className="h-4 w-4" />
        Upomínka
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRemind}
        disabled={state === "loading" || state === "done"}
        title={`Odeslat upomínku na ${clientEmail}`}
        suppressHydrationWarning
        className={cn(
          buttonVariants({ variant: state === "done" ? "default" : "outline" }),
          "rounded-full gap-2",
          state === "done" && "bg-emerald-600 hover:bg-emerald-600"
        )}
      >
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === "done" && <Check className="h-4 w-4" />}
        {(state === "idle" || state === "error") && <Bell className="h-4 w-4" />}
        {state === "done" ? "Odesláno" : "Upomínka"}
      </button>
      {state === "error" && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
