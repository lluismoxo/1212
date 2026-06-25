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
import {
  registerWithPassword, loginWithPassword, requestPasswordReset, resetPassword,
} from "./password.js";

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

// ── Email + contraseña ────────────────────────────────────────
const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(60),
});
authRoutes.post(
  "/register",
  rateLimit({ windowMs: 60_000, max: 5, scope: "register" }),
  async (c) => {
    const b = registerBody.safeParse(await c.req.json().catch(() => null));
    if (!b.success) return c.json({ error: "bad_request" }, 400);
    try {
      return c.json(await registerWithPassword(b.data.email, b.data.password, b.data.name, meta(c)));
    } catch (e) {
      if (e instanceof AuthError) return c.json({ error: e.code }, 409);
      return c.json({ error: "auth_failed" }, 400);
    }
  },
);

const passwordLoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
authRoutes.post(
  "/login-password",
  rateLimit({ windowMs: 60_000, max: 10, scope: "login-pw" }),
  async (c) => {
    const b = passwordLoginBody.safeParse(await c.req.json().catch(() => null));
    if (!b.success) return c.json({ error: "bad_request" }, 400);
    try {
      return c.json(await loginWithPassword(b.data.email, b.data.password, meta(c)));
    } catch (e) {
      if (e instanceof AuthError) return c.json({ error: e.code }, 401);
      return c.json({ error: "auth_failed" }, 401);
    }
  },
);

authRoutes.post(
  "/forgot-password",
  rateLimit({ windowMs: 60_000, max: 5, scope: "forgot" }),
  async (c) => {
    const b = z.object({ email: z.string().email() }).safeParse(await c.req.json().catch(() => null));
    if (!b.success) return c.json({ error: "bad_request" }, 400);
    const token = await requestPasswordReset(b.data.email);
    // TODO: enviar el token por email cuando haya proveedor de correo.
    // Respuesta uniforme (no revela si el email existe).
    return c.json({ ok: true, ...(getDevToken(token)) });
  },
);

authRoutes.post("/reset-password", async (c) => {
  const b = z.object({ token: z.string().min(10), password: z.string().min(8).max(200) })
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try {
    await resetPassword(b.data.token, b.data.password);
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return c.json({ error: e.code }, 400);
    return c.json({ error: "auth_failed" }, 400);
  }
});

// En desarrollo, devuelve el token de reset en la respuesta (no hay email aún).
function getDevToken(token: string | null) {
  return process.env.NODE_ENV !== "production" && token ? { devResetToken: token } : {};
}

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
