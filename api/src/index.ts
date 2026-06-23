import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { serve } from "@hono/node-server";
import { getEnv } from "./config/env.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { authRoutes } from "./modules/auth/routes.js";
import { profileRoutes } from "./modules/profiles/routes.js";
import { locationRoutes } from "./modules/location/routes.js";
import { habitRoutes } from "./modules/habits/routes.js";
import { taskRoutes } from "./modules/tasks/routes.js";
import { journalRoutes } from "./modules/journal/routes.js";
import { communityRoutes } from "./modules/communities/routes.js";
import { moderationRoutes } from "./modules/moderation/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { mediaRoutes } from "./modules/media/routes.js";

const env = getEnv();
const app = new Hono();

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
