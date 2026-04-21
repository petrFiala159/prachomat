// Jednoduchý error logger pro produkční provoz.
// Při nastavení SENTRY_DSN v .env se chyby posílají do Sentry.
// Jinak se jen logují do konzole (dev friendly).
//
// Použití:
//   import { logError } from "@/lib/error-logger";
//   logError("kontext", error);

export function logError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${context}]`, msg);
  if (stack) console.error(stack);

  // Sentry — pokud je nakonfigurovaný
  if (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).__SENTRY_HUB__) {
    try {
      // @ts-expect-error dynamic import
      const Sentry = require("@sentry/nextjs");
      Sentry.captureException(error instanceof Error ? error : new Error(msg), {
        tags: { context },
      });
    } catch { /* ignore */ }
  }
}

// Pro API routes — obalí handler a loguje chyby
export function withErrorLogging<T>(
  context: string,
  handler: () => Promise<T>
): Promise<T> {
  return handler().catch((err) => {
    logError(context, err);
    throw err;
  });
}
