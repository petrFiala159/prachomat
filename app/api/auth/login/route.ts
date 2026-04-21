import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.AUTH_PASSWORD) {
    return NextResponse.json({ error: "Autentizace není nakonfigurovaná." }, { status: 500 });
  }

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "Nesprávné heslo" }, { status: 401 });
  }

  const token = createSessionToken();
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
