import type { Context, Next } from "hono";
import { verifyAccessToken, type AccessClaims } from "../lib/jwt.js";

// Adjunta el usuario autenticado al contexto. 401 si falta/!válido.
export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "no_token" }, 401);
  try {
    const claims = await verifyAccessToken(token);
    c.set("user", claims);
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
  return next();
}

// Exige uno de los roles dados. Admin pasa siempre.
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AccessClaims | undefined;
    if (!user) return c.json({ error: "no_token" }, 401);
    if (user.role === "admin" || roles.includes(user.role)) return next();
    return c.json({ error: "forbidden" }, 403);
  };
}

export const requireAdmin = requireRole("admin");
