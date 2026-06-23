import type { Context, Next } from "hono";

// Rate limiter en memoria (sliding window simple). Suficiente para 1 instancia
// y MVP. En Fase 8/escala → mover a Redis/Upstash (clave compartida).
// Protege login/refresh de fuerza bruta y abuso.

interface Bucket {
  count: number;
  resetAt: number;
}
const store = new Map<string, Bucket>();

function clientKey(c: Context, scope: string): string {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

export function rateLimit(opts: { windowMs: number; max: number; scope: string }) {
  return async (c: Context, next: Next) => {
    const key = clientKey(c, opts.scope);
    const now = Date.now();
    const b = store.get(key);
    if (!b || b.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    if (b.count >= opts.max) {
      const retry = Math.ceil((b.resetAt - now) / 1000);
      c.header("Retry-After", String(retry));
      return c.json({ error: "rate_limited", retryAfter: retry }, 429);
    }
    b.count++;
    return next();
  };
}

// limpieza periódica para no crecer sin límite
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of store) if (b.resetAt < now) store.delete(k);
}, 60_000).unref?.();
