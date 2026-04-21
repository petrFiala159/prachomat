import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "prachomat_session";

// Edge-runtime safe HMAC přes Web Crypto API
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
}

async function verifyToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [random, sig] = token.split(".");
  if (!random || !sig) return false;
  const expected = await hmacSha256Hex(secret, random);
  return constantTimeEqual(sig, expected);
}

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/status",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/public/")) return true;
  if (pathname.startsWith("/ical/")) return true;
  if (pathname === "/api/cron") return true; // cron s vlastním secret v query
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/fonts/")) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const password = process.env.AUTH_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  // API: přijímá Bearer token (kontroluje se v API routě přes volání DB)
  // Tady jen pustí dál pokud má Authorization header — vlastní ověření je v route.
  // To znamená že token se ověřuje na úrovni route handleru, ne v edge proxy.
  if (pathname.startsWith("/api/") && req.headers.get("authorization")?.startsWith("Bearer ")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  const ok = await verifyToken(token, secret);

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
