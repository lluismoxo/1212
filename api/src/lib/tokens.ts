import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

// Refresh tokens: opacos, aleatorios. En DB solo se guarda el SHA-256.
// Rotación en cada uso; el hash permite revocar sin almacenar el token.

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// comparación en tiempo constante (evita timing attacks)
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
