import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { upsertEntry, getEntry, listEntries } from "./service.js";

export const journalRoutes = new Hono();
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

journalRoutes.get("/", requireAuth, async (c) => {
  const q = z.object({ limit: z.coerce.number().default(30), before: DATE.optional() })
    .safeParse(c.req.query());
  if (!q.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await listEntries(c.get("user").sub, q.data.limit, q.data.before));
});

journalRoutes.get("/:date", requireAuth, async (c) => {
  if (!DATE.safeParse(c.req.param("date")).success) return c.json({ error: "bad_request" }, 400);
  return c.json(await getEntry(c.get("user").sub, c.req.param("date")!));
});

journalRoutes.put("/:date", requireAuth, async (c) => {
  if (!DATE.safeParse(c.req.param("date")).success) return c.json({ error: "bad_request" }, 400);
  const b = z.object({ body: z.string().max(20000) }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await upsertEntry(c.get("user").sub, c.req.param("date")!, b.data.body));
});
