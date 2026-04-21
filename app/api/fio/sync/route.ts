import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type FioTransaction = {
  column0?: { value: string };  // datum
  column1?: { value: number };  // částka
  column5?: { value: string };  // VS
  column14?: { value: string }; // měna
  column16?: { value: string }; // typ operace
  column22?: { value: number }; // ID pohybu
};

type FioResponse = {
  accountStatement: {
    info: {
      accountId: string;
      bankId: string;
      currency: string;
    };
    transactionList: {
      transaction: FioTransaction[];
    };
  };
};

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function POST() {
  const supplier = await db.supplier.findFirst();
  if (!supplier) {
    return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  }
  if (!supplier.fioToken) {
    return NextResponse.json({ error: "Chybí Fio API token. Nastav ho v Nastavení." }, { status: 400 });
  }

  // Načíst platby za posledních 30 dní (nebo od poslední synchronizace)
  const dateTo = new Date();
  const dateFrom = supplier.fioLastSync
    ? new Date(supplier.fioLastSync)
    : new Date(Date.now() - 30 * 86400000);

  const url = `https://fioapi.fio.cz/v1/rest/periods/${supplier.fioToken}/${fmtDate(dateFrom)}/${fmtDate(dateTo)}/transactions.json`;

  let fioData: FioResponse;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 409) {
        return NextResponse.json({ error: "Fio API je rate-limited. Počkej 30 vteřin a zkus znovu." }, { status: 429 });
      }
      if (res.status === 500) {
        return NextResponse.json({ error: "Neplatný Fio API token." }, { status: 401 });
      }
      const text = await res.text();
      return NextResponse.json({ error: `Fio API chyba (${res.status}): ${text.slice(0, 200)}` }, { status: 502 });
    }
    fioData = await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Chyba při volání Fio API: ${msg}` }, { status: 500 });
  }

  const transactions = fioData.accountStatement?.transactionList?.transaction ?? [];

  // Načíst nezaplacené faktury
  const unpaidInvoices = await db.invoice.findMany({
    where: { status: { in: ["SENT", "OVERDUE", "DRAFT"] } },
  });

  const matched: { invoice: string; amount: number; vs: string }[] = [];

  for (const tx of transactions) {
    const amount = tx.column1?.value;
    const vs = tx.column5?.value;
    const type = tx.column16?.value ?? "";

    // Pouze příchozí platby (kladná částka)
    if (!amount || amount <= 0) continue;
    if (!vs) continue;

    // Najdi fakturu podle VS (= číslo faktury) a částky
    const invoice = unpaidInvoices.find(
      (inv) => inv.number === vs && Math.abs(inv.totalAmount - amount) < 1
    );

    if (invoice) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID" },
      });
      matched.push({ invoice: invoice.number, amount, vs });
      // Odebrat z lokálního seznamu aby se nepárovalo dvakrát
      const idx = unpaidInvoices.indexOf(invoice);
      if (idx >= 0) unpaidInvoices.splice(idx, 1);
    }
  }

  // Ulož čas poslední synchronizace
  await db.supplier.update({
    where: { id: supplier.id },
    data: { fioLastSync: dateTo },
  });

  return NextResponse.json({
    matched: matched.length,
    total: transactions.length,
    invoices: matched,
  });
}
