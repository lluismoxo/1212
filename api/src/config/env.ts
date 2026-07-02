import { z } from "zod";

// Validación de entorno al arranque. Falla rápido si falta algo.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET demasiado corto"),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900), // 15 min
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:8787/auth/google/callback"),
  APPLE_CLIENT_ID: z.string().default(""),
  APPLE_TEAM_ID: z.string().default(""),
  APPLE_KEY_ID: z.string().default(""),
  APPLE_PRIVATE_KEY: z.string().default(""),

  PORT: z.coerce.number().int().positive().default(8787),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ALLOWED_ORIGINS: z.string().default("exp://,http://localhost:8081"),
  // Confiar en X-Forwarded-For solo si hay un proxy/LB de confianza delante.
  // Con false (default) el rate limit usa la IP real del socket → no se puede
  // eludir falsificando la cabecera. Poner "true" SOLO tras un proxy que la fije.
  // Parse explícito: z.coerce.boolean() convierte "false" en true (footgun).
  TRUST_PROXY: z
    .enum(["true", "false", "1", "0", ""])
    .default("false")
    .transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof schema>;

// Comprobaciones extra que solo aplican en producción. Fallar al arrancar es
// preferible a servir con una configuración insegura (secreto de dev, CORS con
// localhost, o base de datos sin TLS).
export function productionGuards(env: Env): string[] {
  if (env.NODE_ENV !== "production") return [];
  const errs: string[] = [];
  if (env.JWT_SECRET.length < 32) errs.push("JWT_SECRET debe tener ≥32 caracteres en producción");
  // Solo valores de ejemplo/dev conocidos (no substrings genéricos: un secreto
  // aleatorio válido podría contener "1234" o "test" y sería un falso positivo).
  if (/changeme|cambiar-por|ci-secret|ejemplo|example|larguísimo|larguisimo/i.test(env.JWT_SECRET)) {
    errs.push("JWT_SECRET parece un valor de ejemplo/dev; usa un secreto aleatorio");
  }
  if (/localhost|127\.0\.0\.1|exp:\/\//.test(env.ALLOWED_ORIGINS)) {
    errs.push("ALLOWED_ORIGINS no debe incluir orígenes de desarrollo en producción");
  }
  if (!/sslmode=require|\.neon\.tech/.test(env.DATABASE_URL)) {
    errs.push("DATABASE_URL debe exigir TLS (sslmode=require) en producción");
  }
  return errs;
}

let cached: Env | null = null;
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Entorno inválido:", parsed.error.flatten().fieldErrors);
    throw new Error("Configuración de entorno inválida");
  }
  const guards = productionGuards(parsed.data);
  if (guards.length) {
    console.error("Configuración de producción insegura:\n - " + guards.join("\n - "));
    throw new Error("Configuración de producción insegura");
  }
  cached = parsed.data;
  return cached;
}
