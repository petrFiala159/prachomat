"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = { years: number[]; currentYear: number };

export function YearSwitcher({ years, currentYear }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setYear(year: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-xl border border-input bg-muted/40 p-0.5 gap-0.5">
      {years.map((y) => (
        <button
          key={y}
          onClick={() => setYear(y)}
          className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
            y === currentYear
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
