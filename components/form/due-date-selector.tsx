"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type Preset = "14" | "30" | "custom";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function detectPreset(issueDate: string, dueDate: string): Preset {
  if (!issueDate || !dueDate) return "14";
  const diff = Math.round(
    (new Date(dueDate).getTime() - new Date(issueDate).getTime()) / 86400000
  );
  if (diff === 14) return "14";
  if (diff === 30) return "30";
  return "custom";
}

type Props = {
  issueDate: string;
  dueDate: string;
  onChange: (dueDate: string) => void;
};

const PRESETS: { value: Preset; label: string }[] = [
  { value: "14", label: "14 dní" },
  { value: "30", label: "30 dní" },
  { value: "custom", label: "Vlastní" },
];

export function DueDateSelector({ issueDate, dueDate, onChange }: Props) {
  const [preset, setPreset] = useState<Preset>(() =>
    detectPreset(issueDate, dueDate)
  );

  // Pokud se změní datum vystavení a je aktivní preset, přepočítáme splatnost
  useEffect(() => {
    if (preset !== "custom" && issueDate) {
      onChange(addDays(issueDate, Number(preset)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueDate, preset]);

  // Při inicializaci detekujeme preset podle existujícího data
  useEffect(() => {
    setPreset(detectPreset(issueDate, dueDate));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // jen při mountu

  function handlePreset(p: Preset) {
    setPreset(p);
    if (p !== "custom" && issueDate) {
      onChange(addDays(issueDate, Number(p)));
    }
  }

  return (
    <div className="space-y-2">
      {/* Segmented control */}
      <div className="inline-flex rounded-xl border border-input bg-muted/40 p-0.5 gap-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handlePreset(p.value)}
            className={`px-3 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
              preset === p.value
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Datum */}
      {preset === "custom" ? (
        <Input
          type="date"
          value={dueDate}
          min={issueDate}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {dueDate
            ? new Date(dueDate).toLocaleDateString("cs-CZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </p>
      )}
    </div>
  );
}
