"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useState } from "react";

type MonthData = {
  label: string;
  shortLabel: string;
  invoiced: number;
  paid: number;
};

type Props = {
  months: MonthData[];
};

function formatCZK(value: number) {
  if (value === 0) return "0 Kč";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(".", ",")} M Kč`;
  if (value >= 1000) return `${Math.round(value / 1000)} tis. Kč`;
  return `${value} Kč`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold tabular-nums">{formatCZK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ months }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  function toggleSeries(name: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const hasData = months.some((m) => m.invoiced > 0 || m.paid > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        Zatím žádná data pro zobrazení grafu
      </div>
    );
  }

  return (
    <div>
      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4">
        {[
          { name: "Fakturováno", color: "#0071E3" },
          { name: "Zaplaceno", color: "#34C759" },
        ].map(({ name, color }) => (
          <button
            key={name}
            onClick={() => toggleSeries(name)}
            className={`flex items-center gap-2 text-sm transition-opacity ${hidden.has(name) ? "opacity-35" : ""}`}
          >
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground font-medium">{name}</span>
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCZK}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          {!hidden.has("Fakturováno") && (
            <Bar
              dataKey="invoiced"
              name="Fakturováno"
              fill="#0071E3"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
              maxBarSize={40}
            />
          )}
          {!hidden.has("Zaplaceno") && (
            <Line
              dataKey="paid"
              name="Zaplaceno"
              stroke="#34C759"
              strokeWidth={2.5}
              dot={{ fill: "#34C759", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              type="monotone"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
