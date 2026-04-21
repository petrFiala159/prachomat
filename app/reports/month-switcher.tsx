"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const MONTHS_SHORT = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

type Props = { currentMonth: number | null };

export function MonthSwitcher({ currentMonth }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setMonth(month: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (month === null) params.delete("month");
    else params.set("month", String(month));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        onClick={() => setMonth(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          currentMonth === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        Celý rok
      </button>
      {MONTHS_SHORT.map((label, i) => {
        const m = i + 1;
        const active = currentMonth === m;
        return (
          <button
            key={m}
            onClick={() => setMonth(m)}
            className={`w-10 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
