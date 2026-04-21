import { db } from "@/lib/db";
import { czechIBAN, spaydString } from "@/lib/pdf/spayd";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import { renderToBuffer, Font } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import React from "react";
import fs from "fs";
import path from "path";

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const regularBuf = fs.readFileSync(path.join(process.cwd(), "public/fonts/Inter-Regular.ttf"));
  const boldBuf = fs.readFileSync(path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"));
  const regularB64 = "data:font/truetype;base64," + regularBuf.toString("base64");
  const boldB64 = "data:font/truetype;base64," + boldBuf.toString("base64");
  Font.register({
    family: "Inter",
    fonts: [
      { src: regularB64, fontWeight: 400 },
      { src: boldB64, fontWeight: 700 },
    ],
  });
  fontsReady = true;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    registerFonts();
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { supplier: true, client: true, items: { orderBy: { order: "asc" } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }

    const iban = czechIBAN(invoice.supplier.bankCode, invoice.supplier.bankAccount);

    const spayd = spaydString({
      iban,
      amount: invoice.totalAmount,
      variableSymbol: invoice.number,
      message: `Faktura ${invoice.number}`,
    });

    const qrDataUrl = await QRCode.toDataURL(spayd, {
      width: 200,
      margin: 1,
      color: { dark: "#1D1D1F", light: "#FFFFFF" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(InvoicePDF, { invoice, iban, qrDataUrl }) as any
    );

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="faktura-${invoice.number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/invoices/[id]/pdf]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
