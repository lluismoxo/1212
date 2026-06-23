import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "1212-api" }));

// Rutas por módulo se montan en Fase 3+ (auth, users, profiles, location,
// media, communities, moderation, admin, analytics).

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`1212-api escuchando en :${port}`);

export default app;
