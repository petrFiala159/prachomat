"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileX } from "lucide-react";

export function CreditNoteButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Vytvořit dobropis (opravný daňový doklad) k této faktuře?\n\nVytvoří se nová faktura se zápornými částkami položek.")) return;
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}/credit-note`, { method: "POST" });
    const data = await res.json();
    if (data.id) {
      router.push(`/invoices/${data.id}`);
    } else {
      alert(data.error ?? "Chyba při vytváření dobropisu");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      aria-label="Vytvořit dobropis"
      title="Vytvořit dobropis"
      className="rounded-full w-9 h-9 p-0"
    >
      <FileX className="h-4 w-4" />
    </Button>
  );
}
