// Pomocné funkce pro práci s položkami faktury.

export type ItemInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  order?: number;
};

export type ItemLike = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

export type InvoiceTotals = {
  base: number;
  vatAmount: number;
  totalAmount: number;
  roundingAmount: number;
  totalRounded: number;
  // Součty po sazbách DPH — pro ISDOC a PDF
  byRate: Record<string, { base: number; vatAmount: number }>;
};

/**
 * Spočítá celkové součty z položek. Zaokrouhluje po položkách i celkově
 * (matematicky konzistentní s běžným fakturačním SW).
 */
export function calcTotals(items: ItemLike[], round = false): InvoiceTotals {
  const byRate: Record<string, { base: number; vatAmount: number }> = {};

  for (const it of items) {
    const lineBase = it.quantity * it.unitPrice;
    const rateKey = String(it.vatRate ?? 0);
    if (!byRate[rateKey]) byRate[rateKey] = { base: 0, vatAmount: 0 };
    byRate[rateKey].base += lineBase;
    byRate[rateKey].vatAmount += lineBase * ((it.vatRate ?? 0) / 100);
  }

  let base = 0;
  let vatAmount = 0;
  for (const key of Object.keys(byRate)) {
    byRate[key].base = Math.round(byRate[key].base * 100) / 100;
    byRate[key].vatAmount = Math.round(byRate[key].vatAmount * 100) / 100;
    base += byRate[key].base;
    vatAmount += byRate[key].vatAmount;
  }

  base = Math.round(base * 100) / 100;
  vatAmount = Math.round(vatAmount * 100) / 100;
  const totalAmount = Math.round((base + vatAmount) * 100) / 100;
  const totalRounded = round ? Math.round(totalAmount) : totalAmount;
  const roundingAmount = Math.round((totalRounded - totalAmount) * 100) / 100;

  return { base, vatAmount, totalAmount, roundingAmount, totalRounded, byRate };
}

/**
 * Vytvoří "virtuální" položku z legacy polí (hoursWorked × hourlyRate).
 * Používá se pro zobrazení faktur, které byly vytvořeny před zavedením položek.
 */
export function legacyItemFromInvoice(inv: {
  hoursWorked: number;
  hourlyRate: number;
  vatRate: number;
  note: string | null;
}): ItemLike {
  return {
    description: inv.note?.trim() || "Odpracované hodiny",
    quantity: inv.hoursWorked,
    unit: "h",
    unitPrice: inv.hourlyRate,
    vatRate: inv.vatRate,
  };
}
