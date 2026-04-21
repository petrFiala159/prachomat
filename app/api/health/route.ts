import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type ServiceStatus = {
  name: string;
  status: "ok" | "warning" | "error" | "unconfigured";
  message: string;
  checkedAt: string;
};

export async function GET() {
  const services: ServiceStatus[] = [];
  const now = new Date().toISOString();

  // 1. Database
  try {
    await db.supplier.count();
    services.push({ name: "Databáze", status: "ok", message: "SQLite dostupná", checkedAt: now });
  } catch (err) {
    services.push({ name: "Databáze", status: "error", message: String(err), checkedAt: now });
  }

  const supplier = await db.supplier.findFirst();

  // 2. Resend (e-mail)
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || resendKey === "re_your_api_key_here") {
    services.push({ name: "Resend (e-mail)", status: "unconfigured", message: "API klíč nenastavený", checkedAt: now });
  } else {
    services.push({ name: "Resend (e-mail)", status: "ok", message: "Nakonfigurováno", checkedAt: now });
  }

  // 3. Anthropic AI
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey || anthropicKey.includes("your_")) {
    services.push({ name: "Claude AI", status: "unconfigured", message: "API klíč nenastavený", checkedAt: now });
  } else {
    services.push({ name: "Claude AI", status: "ok", message: "Nakonfigurováno", checkedAt: now });
  }

  // 4. Fio banka
  if (supplier?.fioToken) {
    services.push({ name: "Fio banka", status: "ok", message: `Poslední sync: ${supplier.fioLastSync?.toISOString().split("T")[0] ?? "nikdy"}`, checkedAt: now });
  } else {
    services.push({ name: "Fio banka", status: "unconfigured", message: "Token nenastavený", checkedAt: now });
  }

  // 5. Tempo
  const tempoAccounts = await db.tempoAccount.count();
  if (tempoAccounts > 0) {
    services.push({ name: "Tempo", status: "ok", message: `${tempoAccounts} účtů`, checkedAt: now });
  } else {
    services.push({ name: "Tempo", status: "unconfigured", message: "Žádné účty", checkedAt: now });
  }

  // 6. Auth
  const authEnabled = Boolean(process.env.AUTH_PASSWORD);
  services.push({
    name: "Autentizace",
    status: authEnabled ? "ok" : "warning",
    message: authEnabled ? "Heslo nastaveno" : "Není chráněno heslem",
    checkedAt: now,
  });

  // Overall
  const hasError = services.some((s) => s.status === "error");
  const hasWarning = services.some((s) => s.status === "warning");

  return NextResponse.json({
    status: hasError ? "error" : hasWarning ? "warning" : "ok",
    services,
  });
}
