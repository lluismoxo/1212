import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { getEnv } from "./config/env.js";
import { authRoutes } from "./modules/auth/routes.js";

const env = getEnv();
const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
    allowMethods: ["GET", "POST", "DELETE", "PATCH"],
    allowHeaders: ["Authorization", "Content-Type"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "1212-api" }));

app.route("/auth", authRoutes);
// Próximos módulos (Fase 4): users, profiles, location, media, communities, etc.

serve({ fetch: app.fetch, port: env.PORT });
console.log(`1212-api escuchando en :${env.PORT}`);

export default app;
