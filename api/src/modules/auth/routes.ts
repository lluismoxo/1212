import { Hono } from "hono";
import { z } from "zod";
import { verifyIdToken } from "../../lib/oidc.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import type { AccessClaims } from "../../lib/jwt.js";
import {
  loginWithIdentity,
  refresh,
  logout,
  logoutAll,
  deleteAccount,
  AuthError,
} from "./service.js";

export const authRoutes = new Hono();

function meta(c: import("hono").Context) {
  return {
    userAgent: c.req.header("user-agent") ?? null,
    ip:
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      null,
  };
}

const loginBody = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(10),
});

// POST /auth/login — intercambia id_token OIDC por tokens propios
authRoutes.post(
  "/login",
  rateLimit({ windowMs: 60_000, max: 10, scope: "login" }),
  async (c) => {
    const parsed = loginBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "bad_request" }, 400);
    try {
      const identity = await verifyIdToken(parsed.data.provider, parsed.data.idToken);
      const tokens = await loginWithIdentity(identity, meta(c));
      return c.json(tokens);
    } catch (e) {
      if (e instanceof AuthError) return c.json({ error: e.code }, 403);
      // error de verificación → genérico (no filtrar detalle)
      return c.json({ error: "auth_failed" }, 401);
    }
  },
);

const refreshBody = z.object({ refreshToken: z.string().min(10) });

// POST /auth/refresh — rota el refresh y emite nuevo par
authRoutes.post(
  "/refresh",
  rateLimit({ windowMs: 60_000, max: 30, scope: "refresh" }),
  async (c) => {
    const parsed = refreshBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "bad_request" }, 400);
    try {
      const tokens = await refresh(parsed.data.refreshToken, meta(c));
      return c.json(tokens);
    } catch (e) {
      if (e instanceof AuthError) return c.json({ error: e.code }, 401);
      return c.json({ error: "auth_failed" }, 401);
    }
  },
);

// POST /auth/logout — revoca la sesión del refresh dado
authRoutes.post("/logout", async (c) => {
  const parsed = refreshBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad_request" }, 400);
  await logout(parsed.data.refreshToken);
  return c.json({ ok: true });
});

// POST /auth/logout-all — revoca todas las sesiones (requiere access token)
authRoutes.post("/logout-all", requireAuth, async (c) => {
  const user = c.get("user") as AccessClaims;
  await logoutAll(user.sub);
  return c.json({ ok: true });
});

// DELETE /auth/account — elimina la cuenta del usuario autenticado
authRoutes.delete("/account", requireAuth, async (c) => {
  const user = c.get("user") as AccessClaims;
  await deleteAccount(user.sub);
  return c.json({ ok: true });
});

// GET /auth/me — claims del usuario actual
authRoutes.get("/me", requireAuth, (c) => {
  const user = c.get("user") as AccessClaims;
  return c.json({ id: user.sub, role: user.role });
});
