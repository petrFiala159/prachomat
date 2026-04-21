import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  const update: Record<string, unknown> = {};
  if (data.label !== undefined) update.label = data.label;
  if (data.apiToken !== undefined && data.apiToken) update.apiToken = data.apiToken;
  if (data.baseUrl !== undefined) update.baseUrl = data.baseUrl;
  if (data.defaultClientId !== undefined) update.defaultClientId = data.defaultClientId || null;
  if (data.projectKey !== undefined) update.projectKey = data.projectKey || null;
  if (data.defaultRate !== undefined) update.defaultRate = data.defaultRate != null && data.defaultRate !== "" ? Number(data.defaultRate) : null;

  const account = await db.tempoAccount.update({ where: { id }, data: update });
  return NextResponse.json(account);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.tempoAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
