"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Send, Loader2, Check } from "lucide-react";

type Props = {
  invoiceId: string;
  clientEmail: string | null;
};

export function SendButton({ invoiceId, clientEmail }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSend() {
    if (!clientEmail) return;
    if (!confirm(`Odeslat fakturu na ${clientEmail}?`)) return;

    setState("loading");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Chyba při odesílání");
        setState("error");
      } else {
        setState("done");
        router.refresh();
        setTimeout(() => setState("idle"), 3000);
      }
    } catch {
      setErrorMsg("Nepodařilo se odeslat");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  if (!clientEmail) {
    return (
      <span
        title="Odběratel nemá zadaný email"
        className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2 opacity-40 cursor-not-allowed")}
      >
        <Send className="h-4 w-4" />
        Odeslat
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSend}
        disabled={state === "loading" || state === "done"}
        title={`Odeslat na ${clientEmail}`}
        suppressHydrationWarning
        className={cn(
          buttonVariants({ variant: state === "done" ? "default" : "outline" }),
          "rounded-full gap-2",
          state === "done" && "bg-emerald-600 hover:bg-emerald-600"
        )}
      >
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === "done" && <Check className="h-4 w-4" />}
        {state === "idle" || state === "error" ? <Send className="h-4 w-4" /> : null}
        {state === "done" ? "Odesláno" : "Odeslat"}
      </button>
      {state === "error" && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
