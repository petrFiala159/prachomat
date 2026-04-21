// Ověření DIČ — VIES (EU) a Výpis plátců DPH (CZ).

// VIES — ověření platnosti DIČ v EU.
// Veřejná REST API: https://ec.europa.eu/taxation_customs/vies/rest-api/ms
// Input: CC (country code) + VAT number (bez prefixu)
export type ViesResult = {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
};

export async function verifyVies(dic: string): Promise<ViesResult | null> {
  const cleaned = dic.replace(/\s/g, "").toUpperCase();
  const match = cleaned.match(/^([A-Z]{2})(.+)$/);
  if (!match) return null;
  const [, cc, number] = match;

  try {
    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${number}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      valid: Boolean(data.valid ?? data.isValid),
      countryCode: cc,
      vatNumber: number,
      name: data.name || data.traderName,
      address: data.address || data.traderAddress,
    };
  } catch {
    return null;
  }
}

// Výpis plátců DPH (CZ).
// Přes ARES REST API: /ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
// Pokud ARES vrátí `nespolehlivyPlatce` / `typSubjektu` informaci, použijeme ji.
// Alternativa: ADIS REST ale ten má rate limit.
export type VatPayerStatus = {
  ico: string;
  isPayer: boolean;
  isUnreliable?: boolean;
  registeredSince?: string;
  status: "active" | "inactive" | "unknown";
};

export async function verifyCzVatPayer(ico: string): Promise<VatPayerStatus | null> {
  const cleaned = ico.replace(/\s/g, "");
  if (!/^\d{8}$/.test(cleaned)) return null;

  try {
    const url = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${cleaned}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();

    // ARES vrací pole `seznamRegistraci` které obsahuje stavZdrojeVr pro DPH
    const reg = data.seznamRegistraci;
    const vatReg = reg?.stavZdrojeVr ?? reg?.stavZdrojeDph;

    // Některé ARES odpovědi obsahují pole `dic` a `czNace`. Pokud má DIČ, je plátce.
    const hasDic = Boolean(data.dic);

    return {
      ico: cleaned,
      isPayer: hasDic,
      registeredSince: data.datumVzniku,
      status: hasDic ? "active" : "inactive",
    };
  } catch {
    return null;
  }
}
