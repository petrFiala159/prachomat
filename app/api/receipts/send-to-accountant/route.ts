import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { readScan } from "@/lib/receipt-storage";

function fmt(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("cs-CZ");
}

const MONTHS_CS = ["leden","únor","březen","duben","květen","červen","červenec","srpen","září","říjen","listopad","prosinec"];

export async function POST(req: NextRequest) {
  const { month } = await req.json(); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Neplatný formát měsíce" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  const supplier = await db.supplier.findFirst();
  if (!supplier) {
    return NextResponse.json({ error: "Chybí dodavatel" }, { status: 400 });
  }

  if (!supplier.accountantEmail) {
    return NextResponse.json({ error: "V Nastavení není nastavený e-mail účetní." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_your_api_key_here") {
    return NextResponse.json({ error: "RESEND_API_KEY není nakonfigurovaný" }, { status: 500 });
  }

  // Načti schválené účtenky
  const receipts = await db.receipt.findMany({
    where: {
      date: { gte: monthStart, lt: monthEnd },
      status: { in: ["approved", "sent"] },
    },
    orderBy: { date: "asc" },
  });

  if (receipts.length === 0) {
    return NextResponse.json({ error: "Žádné schválené účtenky za tento měsíc" }, { status: 400 });
  }

  // Načti faktury vystavené v měsíci pro DPH kalkulaci
  const invoices = await db.invoice.findMany({
    where: { issueDate: { gte: monthStart, lt: monthEnd } },
    include: { client: true },
    orderBy: { issueDate: "asc" },
  });

  const vatOutput = invoices.reduce((s, i) => s + i.vatAmount, 0);
  const vatInput = receipts.reduce((s, r) => s + r.vatAmount, 0);
  const vatToPay = Math.max(vatOutput - vatInput, 0);
  const totalReceipts = receipts.reduce((s, r) => s + r.totalAmount, 0);

  // Připrav přílohy — každá účtenka jako JPG + CSV souhrn
  const attachments: Array<{ filename: string; content: Buffer | string; contentType?: string }> = [];

  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    let buffer: Buffer;
    if (r.scanPath) {
      try {
        buffer = await readScan(r.scanPath);
      } catch {
        continue;
      }
    } else if (r.scan) {
      const base64Data = r.scan.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else {
      continue;
    }
    const ext = r.mimeType.includes("png") ? "png" : r.mimeType.includes("pdf") ? "pdf" : "jpg";
    const dateStr = new Date(r.date).toISOString().split("T")[0];
    const vendorSlug = r.vendor.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20) || "uctenka";
    attachments.push({
      filename: `${String(i + 1).padStart(3, "0")}_${dateStr}_${vendorSlug}.${ext}`,
      content: buffer,
      contentType: r.mimeType,
    });
  }

  // CSV souhrn
  const csvLines: string[] = ["\uFEFFPoř;Datum;Prodejce;IČ;DIČ;Základ;DPH;Sazba;Celkem;Poznámka"];
  receipts.forEach((r, i) => {
    csvLines.push([
      i + 1,
      fmtDate(r.date),
      `"${r.vendor.replace(/"/g, '""')}"`,
      r.vendorIco ?? "",
      r.vendorDic ?? "",
      r.vatBase.toFixed(2).replace(".", ","),
      r.vatAmount.toFixed(2).replace(".", ","),
      r.vatRate,
      r.totalAmount.toFixed(2).replace(".", ","),
      `"${(r.note ?? "").replace(/"/g, '""')}"`,
    ].join(";"));
  });
  attachments.push({
    filename: `uctenky-${month}.csv`,
    content: csvLines.join("\n"),
    contentType: "text/csv; charset=utf-8",
  });

  // Odešli e-mail
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "Prachomat <onboarding@resend.dev>";
  const accName = supplier.accountantName ?? "";
  const monthLabel = `${MONTHS_CS[m - 1]} ${y}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1D1D1F;">
      <p>Dobrý den${accName ? ` ${accName}` : ""},</p>
      <p>zasílám podklady za <strong>${monthLabel}</strong>.</p>

      <h3 style="margin-top: 24px;">Souhrn</h3>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6E6E73;">Počet účtenek</td>
          <td style="padding: 6px 0; font-weight: 600;">${receipts.length}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6E6E73;">Účtenky celkem</td>
          <td style="padding: 6px 0; font-weight: 600;">${fmt(totalReceipts)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6E6E73;">Počet vystavených faktur</td>
          <td style="padding: 6px 0; font-weight: 600;">${invoices.length}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6E6E73;">DPH na výstupu</td>
          <td style="padding: 6px 0; font-weight: 600;">${fmt(vatOutput)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6E6E73;">DPH na vstupu</td>
          <td style="padding: 6px 0; font-weight: 600;">${fmt(vatInput)}</td>
        </tr>
        <tr style="border-top: 1px solid #E5E5EA;">
          <td style="padding: 10px 0; color: #1D1D1F; font-weight: 600;">DPH k platbě</td>
          <td style="padding: 10px 0; font-weight: 700; font-size: 16px;">${fmt(vatToPay)}</td>
        </tr>
      </table>

      <p style="color: #6E6E73; font-size: 13px; margin-top: 24px;">
        V příloze najdeš jednotlivé scany účtenek a CSV soubor s jejich strukturovanými daty.
      </p>

      <p style="color: #6E6E73; font-size: 13px;">S pozdravem,<br/><strong>${supplier.name}</strong></p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: supplier.accountantEmail,
    subject: `Podklady ${monthLabel} — ${supplier.name}`,
    html,
    attachments,
  });

  // Označit jako odeslané
  await db.receipt.updateMany({
    where: { id: { in: receipts.map((r) => r.id) } },
    data: { status: "sent", sentAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    count: receipts.length,
    vatOutput,
    vatInput,
    vatToPay,
  });
}
