"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Copy, Loader2 } from "lucide-react";

export function DuplicateButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: "POST" });
    const inv = await res.json();
    router.push(`/invoices/${inv.id}`);
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      aria-label="Duplikovat fakturu"
      title="Duplikovat fakturu"
      suppressHydrationWarning
      className={cn(buttonVariants({ variant: "outline" }), "rounded-full w-9 h-9 p-0")}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
