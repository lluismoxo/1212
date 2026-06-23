import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { getEnv } from "./config/env.js";
import { authRoutes } from "./modules/auth/routes.js";
import { profileRoutes } from "./modules/profiles/routes.js";
import { locationRoutes } from "./modules/location/routes.js";
import { habitRoutes } from "./modules/habits/routes.js";
import { taskRoutes } from "./modules/tasks/routes.js";
import { journalRoutes } from "./modules/journal/routes.js";

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
app.route("/profiles", profileRoutes);
app.route("/location", locationRoutes);
app.route("/habits", habitRoutes);
app.route("/tasks", taskRoutes);
app.route("/journal", journalRoutes);
// Pendientes (siguiente lote Fase 4): media, communities, moderation, admin, analytics.

serve({ fetch: app.fetch, port: env.PORT });
console.log(`1212-api escuchando en :${env.PORT}`);

export default app;
