import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getEnv } from "./config/env.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { authRoutes } from "./modules/auth/routes.js";
import { profileRoutes } from "./modules/profiles/routes.js";
import { locationRoutes } from "./modules/location/routes.js";
import { habitRoutes } from "./modules/habits/routes.js";
import { levelRoutes } from "./modules/levels/routes.js";
import { taskRoutes } from "./modules/tasks/routes.js";
import { journalRoutes } from "./modules/journal/routes.js";
import { communityRoutes } from "./modules/communities/routes.js";
import { moderationRoutes } from "./modules/moderation/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { mediaRoutes } from "./modules/media/routes.js";

// Cabeceras de seguridad para el contenido estático del diseño. CSP a medida:
// permite inline (lo exige el runtime dc) y las CDNs concretas que usa el mapa,
// pero bloquea objetos/base/frames y fuerza nosniff/anti-clickjacking.
function staticSecurityHeaders() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com https://api.fontshare.com",
    "img-src 'self' data: blob: https:",
    // API propia (mismo origin), tiles OSM, JWKS Google (login), fuentes.
    "connect-src 'self' https://tiles.openfreemap.org https://*.openfreemap.org https://api.fontshare.com https://cdn.fontshare.com",
    "font-src 'self' data: https://cdn.fontshare.com https://api.fontshare.com",
    "worker-src 'self' blob:", // MapLibre crea sus workers desde blob:
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  return async (c: import("hono").Context, next: import("hono").Next) => {
    await next();
    c.header("Content-Security-Policy", csp);
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
    c.header("X-Frame-Options", "DENY");
  };
}

const env = getEnv();
const app = new Hono();

// Cabeceras de seguridad para los estáticos (/design, /legal). El middleware
// global secureHeaders() aplica una CSP estricta que rompería los scripts/estilos
// inline del runtime del diseño; aquí ponemos una CSP hecha a medida que SÍ
// permite lo inline que el diseño necesita, pero cierra el resto de vectores.
app.use("/design/*", staticSecurityHeaders());
app.use("/legal/*", staticSecurityHeaders());

// El diseño (prototipo Claude Design) se sirve estático en /design.
app.use("/design/*", serveStatic({ root: "./public" }));
// Documentos legales (markdown) servidos para mostrarlos en Ajustes.
app.use("/legal/*", serveStatic({ root: "./public" }));

// Cabeceras de seguridad (CSP, X-Frame, nosniff, HSTS en prod, etc.)
app.use("*", secureHeaders());

// Límite de tamaño de body (anti-abuso / DoS por payload grande)
app.use("*", bodyLimit({ maxSize: 256 * 1024 })); // 256 KB

app.use(
  "*",
  cors({
    origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  }),
);

// Manejador global de errores: no filtra stack traces al cliente.
app.onError((err, c) => {
  console.error("[error]", err.name, err.message);
  return c.json({ error: "server_error" }, 500);
});

// Rate limit global (anti-scraping/abuso general). Login/refresh tienen el suyo más estricto.
app.use("*", rateLimit({ windowMs: 60_000, max: 120, scope: "global" }));

app.get("/health", (c) => c.json({ ok: true, service: "1212-api" }));

app.route("/auth", authRoutes);
app.route("/profiles", profileRoutes);
app.route("/location", locationRoutes);
app.route("/habits", habitRoutes);
app.route("/levels", levelRoutes);
app.route("/tasks", taskRoutes);
app.route("/journal", journalRoutes);
app.route("/communities", communityRoutes);
app.route("/moderation", moderationRoutes);
app.route("/admin", adminRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/media", mediaRoutes);

serve({ fetch: app.fetch, port: env.PORT });
console.log(`1212-api escuchando en :${env.PORT}`);

export default app;
