import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import * as svc from "./service.js";

export const analyticsRoutes = new Hono();
const uid = (c: import("hono").Context) => c.get("user").sub;

// registrar evento (usuario autenticado)
analyticsRoutes.post("/track", requireAuth, async (c) => {
  const b = z.object({ name: z.string().max(60), props: z.record(z.unknown()).optional() })
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  await svc.track(uid(c), b.data.name, b.data.props);
  return c.json({ ok: true });
});

// resumen (solo admin)
analyticsRoutes.get("/summary", requireAuth, requireAdmin, async (c) => {
  const q = z.object({ days: z.coerce.number().default(30) }).safeParse(c.req.query());
  return c.json(await svc.summary(q.success ? q.data.days : 30));
});
