import { Hono } from "hono";
import { z } from "zod";
import { verifyIdToken } from "../../lib/oidc.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import type { AccessClaims } from "../../lib/jwt.js";
import { getEnv } from "../../config/env.js";
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

// ── Google OAuth por navegador (flujo Authorization Code) ─────────
// Pensado para apps WebView: Google bloquea el login dentro de WebViews,
// así que el botón abre /auth/google/start, el usuario entra en Google, y el
// callback vuelve al diseño con los tokens en el fragmento (#) de la URL.
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
// Volvemos al diseño (servido por la API) con los tokens en el fragmento (#),
// que el navegador NO envía al servidor; el bridge los lee y guarda. Funciona
// igual en navegador externo y dentro del WebView del simulador.
const APP_RETURN = "/design/index.html";

// GET /auth/google/start — redirige a la pantalla de consentimiento de Google.
authRoutes.get("/google/start", (c) => {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return c.json({ error: "google_not_configured" }, 503);
  }
  // state anti-CSRF: lo guardamos en cookie y lo comprobamos en el callback.
  const state = crypto.randomUUID();
  c.header(
    "Set-Cookie",
    `g_state=${state}; Max-Age=600; Path=/auth/google; HttpOnly; SameSite=Lax`,
  );
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return c.redirect(`${GOOGLE_AUTH}?${params.toString()}`);
});

// GET /auth/google/callback — Google redirige aquí con ?code y ?state.
authRoutes.get("/google/callback", async (c) => {
  const env = getEnv();
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookie = c.req.header("cookie") ?? "";
  const savedState = /g_state=([^;]+)/.exec(cookie)?.[1];

  if (!code || !state || !savedState || state !== savedState) {
    return c.redirect(`${APP_RETURN}#error=invalid_state`);
  }
  try {
    // 1) intercambiar el code por tokens (incluye id_token)
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return c.redirect(`${APP_RETURN}#error=token_exchange`);
    const data = (await res.json()) as { id_token?: string };
    if (!data.id_token) return c.redirect(`${APP_RETURN}#error=no_id_token`);

    // 2) verificar el id_token y crear sesión propia
    const identity = await verifyIdToken("google", data.id_token);
    const tokens = await loginWithIdentity(identity, meta(c));

    // 3) volver a la app por deep link con los tokens en el fragmento
    const frag = new URLSearchParams({
      access: tokens.accessToken,
      refresh: tokens.refreshToken,
    });
    return c.redirect(`${APP_RETURN}#${frag.toString()}`);
  } catch {
    return c.redirect(`${APP_RETURN}#error=auth_failed`);
  }
});

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
