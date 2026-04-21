"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type AresData = {
  ico: string;
  name: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFill: (data: AresData) => void;
};

export function IcoInput({ value, onChange, onFill }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchAres() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/ares?ico=${value.trim()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chyba při načítání z ARES");
      } else {
        onFill(data);
      }
    } catch {
      setError("Nepodařilo se připojit k ARES");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setError("");
            onChange(e.target.value);
          }}
          placeholder="12345678"
          maxLength={8}
          required
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchAres}
          disabled={loading || value.trim().length !== 8}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Doplnit z ARES"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
