import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE_NAME = "prachomat_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dní

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

// Generuje signed token: "random.hmac"
export function createSessionToken(): string {
  const random = randomBytes(32).toString("hex");
  const hmac = createHmac("sha256", getSecret()).update(random).digest("hex");
  return `${random}.${hmac}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const [random, sig] = token.split(".");
  if (!random || !sig) return false;
  const expected = createHmac("sha256", getSecret()).update(random).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<boolean> {
  // Pokud není nastavené heslo, auth je vypnutý
  if (!process.env.AUTH_PASSWORD) return true;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;

// Ověří Bearer token proti supplier.apiToken v DB
export async function verifyBearerToken(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;

  const { db } = await import("@/lib/db");
  const supplier = await db.supplier.findFirst({ where: { apiToken: token } });
  return Boolean(supplier);
}
