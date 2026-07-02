import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { getEnv } from "../config/env.js";

// Verifica el id_token (OIDC) de Google/Apple contra sus JWKS públicos.
// Devuelve sub (id estable del proveedor), email y nombre si vienen.

export type Provider = "google" | "apple";

export interface VerifiedIdentity {
  provider: Provider;
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

const ISSUERS: Record<Provider, string> = {
  google: "https://accounts.google.com",
  apple: "https://appleid.apple.com",
};

const JWKS: Record<Provider, ReturnType<typeof createRemoteJWKSet>> = {
  google: createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")),
  apple: createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys")),
};

function expectedAudience(provider: Provider): string {
  const env = getEnv();
  return provider === "google" ? env.GOOGLE_CLIENT_ID : env.APPLE_CLIENT_ID;
}

export async function verifyIdToken(provider: Provider, idToken: string): Promise<VerifiedIdentity> {
  const audience = expectedAudience(provider);
  if (!audience) throw new Error(`OAuth ${provider} no configurado`);

  const { payload } = await jwtVerify(idToken, JWKS[provider], {
    issuer: ISSUERS[provider],
    audience,
    // id_tokens de Google/Apple usan RS256/ES256 (asimétrico). Fijarlos impide
    // que un token forjado con "none" o HS256 (sobre la clave pública) pase.
    algorithms: ["RS256", "ES256"],
  });

  return extractIdentity(provider, payload);
}

// Extracción pura (testeable sin red).
export function extractIdentity(provider: Provider, payload: JWTPayload): VerifiedIdentity {
  const sub = payload.sub;
  if (!sub) throw new Error("id_token sin sub");
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true";
  const name =
    (typeof payload.name === "string" && payload.name) ||
    (typeof payload.given_name === "string" && payload.given_name) ||
    null;
  return { provider, sub, email, emailVerified, name };
}
