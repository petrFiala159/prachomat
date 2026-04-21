import { db } from "@/lib/db";
import { czechIBAN, spaydString } from "@/lib/pdf/spayd";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import { renderToBuffer, Font } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import React from "react";
import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { interpolate, DEFAULT_REMINDER_SUBJECT, DEFAULT_REMINDER_BODY } from "@/lib/email-templates";

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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { supplier: true, client: true, items: { orderBy: { order: "asc" } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }

    const clientEmail = invoice.client.email;
    if (!clientEmail) {
      return NextResponse.json({ error: "Odběratel nemá zadaný email" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_your_api_key_here") {
      return NextResponse.json({ error: "RESEND_API_KEY není nakonfigurovaný" }, { status: 500 });
    }

    // Vygeneruj PDF
    registerFonts();
    const iban = czechIBAN(invoice.supplier.bankCode, invoice.supplier.bankAccount);
    const spayd = spaydString({
      iban,
      amount: invoice.totalAmount,
      variableSymbol: invoice.number,
      message: `Faktura ${invoice.number}`,
    });
    const qrDataUrl = await QRCode.toDataURL(spayd, {
      width: 200, margin: 1,
      color: { dark: "#1D1D1F", light: "#FFFFFF" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, { invoice, iban, qrDataUrl }) as any
    );

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM ?? "Prachomat <onboarding@resend.dev>";

    const fmt = (n: number) =>
      new Intl.NumberFormat("cs-CZ", { style: "currency", currency: invoice.currency ?? "CZK", maximumFractionDigits: 0 }).format(n);
    const fmtDate = (d: Date) =>
      new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

    const daysOverdue = Math.max(
      Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      0
    );

    const templateVars = {
      number: invoice.number,
      amount: fmt(invoice.totalAmount),
      dueDate: fmtDate(invoice.dueDate),
      supplier: invoice.supplier.name,
      clientName: invoice.client.name,
      daysOverdue,
      bankAccount: `${invoice.supplier.bankAccount}/${invoice.supplier.bankCode}`,
    };

    const subjectTpl = invoice.supplier.emailReminderSubject || DEFAULT_REMINDER_SUBJECT;
    const bodyTpl = invoice.supplier.emailReminderBody || DEFAULT_REMINDER_BODY;
    const subject = interpolate(subjectTpl, templateVars);
    const bodyText = interpolate(bodyTpl, templateVars);
    const bodyHtml = bodyText
      .split("\n\n")
      .map((p) => `<p style="margin: 0 0 12px 0;">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");

    await resend.emails.send({
      from,
      to: clientEmail,
      subject,
      html: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1D1D1F; line-height: 1.6;">${bodyHtml}</div>`,
      attachments: [
        {
          filename: `faktura-${invoice.number}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/invoices/[id]/remind]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
