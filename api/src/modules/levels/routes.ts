import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { getOwnLevel, monthCompliance } from "./service.js";

export const levelRoutes = new Hono();

// GET /levels/me — nivel actual (recalculado server-side desde hábitos)
levelRoutes.get("/me", requireAuth, async (c) => {
  return c.json(await getOwnLevel(c.get("user").sub));
});

// GET /levels/compliance?month=YYYY-MM-01 — % de un mes (informativo)
levelRoutes.get("/compliance", requireAuth, async (c) => {
  const q = z.object({ month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(c.req.query());
  if (!q.success) return c.json({ error: "bad_request" }, 400);
  return c.json({ compliance: await monthCompliance(c.get("user").sub, q.data.month) });
});
