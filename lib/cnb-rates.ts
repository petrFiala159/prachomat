// ČNB denní kurzy — https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/
// Endpoint vrací text v pipe-delimited formátu.

const CNB_URL = "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt";

// Jednoduchá in-memory cache — ČNB publikuje kurzy 1× denně kolem 14:30
const cache = new Map<string, { rates: Record<string, number>; fetchedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hodina

function formatCnbDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

function parseCnbResponse(text: string): Record<string, number> {
  const rates: Record<string, number> = { CZK: 1 };
  const lines = text.split("\n");
  // První dva řádky: header + sloupce. Hledáme řádky s pipe.
  for (const line of lines) {
    if (!line.includes("|")) continue;
    const parts = line.split("|");
    if (parts.length < 5) continue;
    const code = parts[3]?.trim();
    const amount = Number(parts[2]?.trim());
    const rate = Number(parts[4]?.replace(",", ".").trim());
    if (code && !isNaN(amount) && !isNaN(rate) && amount > 0) {
      // Kurz je "amount code = rate CZK" → 1 code = rate/amount CZK
      rates[code] = rate / amount;
    }
  }
  return rates;
}

/**
 * Získá CZK kurz pro danou měnu k zadanému datu.
 * Pro CZK vrací 1. Pro nepodporovanou měnu vrací null.
 */
export async function getCnbRate(currency: string, date?: Date): Promise<number | null> {
  if (currency === "CZK") return 1;

  const target = date ?? new Date();
  const cacheKey = formatCnbDate(target);

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.rates[currency] ?? null;
  }

  try {
    const url = `${CNB_URL}?date=${cacheKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const rates = parseCnbResponse(text);
    cache.set(cacheKey, { rates, fetchedAt: Date.now() });
    return rates[currency] ?? null;
  } catch {
    return null;
  }
}
