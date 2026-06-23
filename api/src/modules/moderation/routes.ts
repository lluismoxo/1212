import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import * as svc from "./service.js";

export const moderationRoutes = new Hono();
const uid = (c: import("hono").Context) => c.get("user").sub;

// crear reporte — cualquier usuario autenticado
moderationRoutes.post("/reports", requireAuth, async (c) => {
  const b = z.object({
    targetType: z.enum(["profile", "message", "community"]),
    targetId: z.string().uuid(),
    reason: z.string().min(3).max(500),
  }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await svc.createReport(uid(c), b.data.targetType, b.data.targetId, b.data.reason), 201);
});

// listar/resolver — solo admin
moderationRoutes.get("/reports", requireAuth, requireAdmin, async (c) => {
  const status = c.req.query("status");
  return c.json(await svc.listReports(status));
});

moderationRoutes.patch("/reports/:id", requireAuth, requireAdmin, async (c) => {
  const b = z.object({ status: z.enum(["resolved", "dismissed", "reviewing"]) })
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try { await svc.resolveReport(uid(c), c.req.param("id")!, b.data.status); return c.json({ ok: true }); }
  catch (e) {
    if (e instanceof svc.NotFoundError) return c.json({ error: "not_found" }, 404);
    return c.json({ error: "server_error" }, 500);
  }
});
