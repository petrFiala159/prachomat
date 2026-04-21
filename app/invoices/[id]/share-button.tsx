"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";

export function ShareButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}/share`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.token) {
      setShareUrl(`${window.location.origin}/public/invoice/${data.token}`);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!shareUrl) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={loading}
        aria-label="Sdílet"
        title="Vytvořit sdílitelný odkaz"
        className="rounded-full w-9 h-9 p-0"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={shareUrl}
        readOnly
        onFocus={(e) => e.currentTarget.select()}
        className="h-9 w-80 rounded-xl border border-input bg-muted/40 px-3 text-xs font-mono"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="rounded-full w-9 h-9 p-0"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
