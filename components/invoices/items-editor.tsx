"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { GripVertical, Trash2 } from "lucide-react";

export type ItemRow = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

const UNITS = [
  { value: "h", label: "h" },
  { value: "ks", label: "ks" },
  { value: "den", label: "den" },
  { value: "měsíc", label: "měsíc" },
  { value: "kg", label: "kg" },
  { value: "m", label: "m" },
  { value: "l", label: "l" },
];

type Props = {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
  currency: string;
  showVat: boolean;
};

export function ItemsEditor({ items, onChange, currency, showVat }: Props) {
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function update(idx: number, patch: Partial<ItemRow>) {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function remove(idx: number) {
    if (items.length === 1) return;
    onChange(items.filter((_, i) => i !== idx));
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(idx: number) {
    const from = dragIdx.current;
    if (from === null || from === idx) {
      setDragOverIdx(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    dragIdx.current = null;
    setDragOverIdx(null);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-2">
      {/* Hlavička */}
      <div className="hidden md:grid grid-cols-[24px_1fr_80px_80px_120px_80px_110px_32px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <div />
        <div>Popis</div>
        <div className="text-right">Množství</div>
        <div className="text-center">Jednotka</div>
        <div className="text-right">Cena za jedn.</div>
        {showVat ? <div className="text-right">DPH</div> : <div />}
        <div className="text-right">Celkem</div>
        <div />
      </div>

      {items.map((item, idx) => {
        const lineTotal = item.quantity * item.unitPrice;
        const lineWithVat = lineTotal * (1 + item.vatRate / 100);
        return (
          <div
            key={idx}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => setDragOverIdx(null)}
            className={`grid grid-cols-1 md:grid-cols-[24px_1fr_80px_80px_120px_80px_110px_32px] gap-2 items-start ${
              dragOverIdx === idx ? "ring-2 ring-primary/40 rounded-lg" : ""
            }`}
          >
            <div className="hidden md:flex items-center justify-center h-9 cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            <Input
              value={item.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="Popis položky"
              className="h-9 text-sm"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.quantity}
              onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
              className="h-9 text-sm text-right"
            />
            <select
              value={item.unit}
              onChange={(e) => update(idx, { unit: e.target.value })}
              className="flex h-9 rounded-xl border border-input bg-transparent px-2 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.unitPrice}
              onChange={(e) => update(idx, { unitPrice: Number(e.target.value) })}
              className="h-9 text-sm text-right"
            />
            {showVat ? (
              <select
                value={item.vatRate}
                onChange={(e) => update(idx, { vatRate: Number(e.target.value) })}
                className="flex h-9 rounded-xl border border-input bg-transparent px-2 text-sm"
              >
                <option value="21">21 %</option>
                <option value="12">12 %</option>
                <option value="0">0 %</option>
              </select>
            ) : (
              <div />
            )}
            <div className="h-9 flex items-center justify-end text-sm font-semibold tabular-nums">
              {fmt(showVat ? lineWithVat : lineTotal)}
            </div>
            <button
              type="button"
              onClick={() => remove(idx)}
              disabled={items.length === 1}
              className="h-9 w-8 flex items-center justify-center text-destructive/60 hover:text-destructive disabled:opacity-30 transition-colors"
              title="Odebrat položku"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
