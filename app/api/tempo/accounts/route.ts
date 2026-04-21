import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const accounts = await db.tempoAccount.findMany({
    orderBy: { createdAt: "asc" },
    include: { defaultClient: { select: { id: true, name: true } } },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const data = await req.json();

  if (!data.label || !data.apiToken) {
    return NextResponse.json({ error: "Chybí label nebo apiToken" }, { status: 400 });
  }

  const account = await db.tempoAccount.create({
    data: {
      label: data.label,
      apiToken: data.apiToken,
      baseUrl: data.baseUrl || "https://api.tempo.io/4",
      defaultClientId: data.defaultClientId || null,
      projectKey: data.projectKey || null,
      defaultRate: data.defaultRate != null ? Number(data.defaultRate) : null,
    },
  });

  return NextResponse.json(account);
}
