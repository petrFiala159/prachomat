import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const clients = await db.client.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const client = await db.client.create({
      data: {
        name: data.name,
        street: data.street,
        city: data.city,
        zip: data.zip,
        ico: data.ico,
        dic: data.dic || null,
        email: data.email || null,
        hourlyRate: Number(data.hourlyRate) || 0,
      },
    });
    return NextResponse.json(client);
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
