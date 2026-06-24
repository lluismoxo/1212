import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import * as svc from "./service.js";

export const adminRoutes = new Hono();
// todo el módulo exige admin
adminRoutes.use("*", requireAuth, requireAdmin);
const uid = (c: import("hono").Context) => c.get("user").sub;

adminRoutes.get("/stats", async (c) => c.json(await svc.stats()));

adminRoutes.get("/users", async (c) => {
  const q = z.object({ limit: z.coerce.number().default(50), q: z.string().optional() }).safeParse(c.req.query());
  if (!q.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await svc.listUsers(q.data.limit, q.data.q));
});

adminRoutes.patch("/users/:id/disabled", async (c) => {
  const b = z.object({ disabled: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try { await svc.setUserDisabled(uid(c), c.req.param("id")!, b.data.disabled); return c.json({ ok: true }); }
  catch (e) { return e instanceof svc.NotFoundError ? c.json({ error: "not_found" }, 404) : c.json({ error: "server_error" }, 500); }
});

adminRoutes.patch("/users/:id/role", async (c) => {
  const b = z.object({ role: z.enum(["user", "moderator", "admin"]), grant: z.boolean() })
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  await svc.setUserRole(uid(c), c.req.param("id")!, b.data.role, b.data.grant);
  return c.json({ ok: true });
});

adminRoutes.get("/audit", async (c) => {
  const q = z.object({ limit: z.coerce.number().default(100) }).safeParse(c.req.query());
  return c.json(await svc.listAudit(q.success ? q.data.limit : 100));
});
