import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "../config/env.js";

export interface AccessClaims {
  sub: string;   // profile/user id
  role: string;  // rol principal (user/moderator/admin)
}

function secret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  const ttl = getEnv().JWT_ACCESS_TTL;
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("1212-api")
    .setAudience("1212-app")
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret(), {
    issuer: "1212-api",
    audience: "1212-app",
    // Fijar el algoritmo evita ataques de confusión de algoritmo / downgrade a
    // "none" (solo aceptamos exactamente el que firmamos). CWE-347.
    algorithms: ["HS256"],
  });
  if (!payload.sub || typeof payload.role !== "string") {
    throw new Error("Claims inválidos");
  }
  return { sub: payload.sub, role: payload.role };
}
