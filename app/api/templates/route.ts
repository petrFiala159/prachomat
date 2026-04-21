import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const templates = await db.invoiceTemplate.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const data = await req.json();
  const recurring = Boolean(data.recurring);
  const intervalDays = Number(data.intervalDays ?? 30);
  const nextRunAt = recurring ? new Date(Date.now() + intervalDays * 86400000) : null;

  const template = await db.invoiceTemplate.create({
    data: {
      name: data.name,
      hoursWorked: Number(data.hoursWorked),
      hourlyRate: Number(data.hourlyRate),
      note: data.note ?? null,
      dueDays: Number(data.dueDays ?? 14),
      recurring,
      intervalDays,
      nextRunAt,
      clientId: data.clientId,
    },
  });
  return NextResponse.json(template);
}
