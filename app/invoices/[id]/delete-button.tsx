"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Opravdu smazat tuto fakturu? Akce je nevratná.")) return;
    setLoading(true);
    await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    router.push("/invoices");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      aria-label="Smazat fakturu"
      title="Smazat fakturu"
      suppressHydrationWarning
      className={cn(
        buttonVariants({ variant: "outline" }),
        "rounded-full w-9 h-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
