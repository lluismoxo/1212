import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import * as svc from "./service.js";

export const communityRoutes = new Hono();

function handle(e: unknown, c: import("hono").Context) {
  if (e instanceof svc.NotFoundError) return c.json({ error: "not_found" }, 404);
  if (e instanceof svc.ForbiddenError) return c.json({ error: "forbidden" }, 403);
  if (e instanceof svc.ValidationError) return c.json({ error: "validation", message: e.message }, 422);
  return c.json({ error: "server_error" }, 500);
}
const uid = (c: import("hono").Context) => c.get("user").sub;

communityRoutes.get("/", requireAuth, async (c) => c.json(await svc.listCommunities(uid(c))));

communityRoutes.post("/", requireAuth, async (c) => {
  const b = z.object({
    slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
    name: z.string().min(2).max(80),
    description: z.string().max(500).optional(),
    goal: z.string().max(300).optional(),
    colors: z.array(z.string()).max(4).optional(),
    isPrivate: z.boolean().optional(),
  }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try { return c.json(await svc.createCommunity(uid(c), b.data), 201); }
  catch (e) { return handle(e, c); }
});

communityRoutes.get("/:id", requireAuth, async (c) => {
  try { return c.json(await svc.getCommunity(c.req.param("id")!, uid(c))); }
  catch (e) { return handle(e, c); }
});

communityRoutes.post("/:id/join", requireAuth, async (c) => {
  try { await svc.join(c.req.param("id")!, uid(c)); return c.json({ ok: true }); }
  catch (e) { return handle(e, c); }
});

communityRoutes.post("/:id/leave", requireAuth, async (c) => {
  await svc.leave(c.req.param("id")!, uid(c));
  return c.json({ ok: true });
});

communityRoutes.get("/:id/members", requireAuth, async (c) => {
  try { return c.json(await svc.members(c.req.param("id")!, uid(c))); }
  catch (e) { return handle(e, c); }
});

communityRoutes.get("/:id/messages", requireAuth, async (c) => {
  const q = z.object({ limit: z.coerce.number().default(50), before: z.string().optional() })
    .safeParse(c.req.query());
  if (!q.success) return c.json({ error: "bad_request" }, 400);
  try { return c.json(await svc.listMessages(c.req.param("id")!, uid(c), q.data.limit, q.data.before)); }
  catch (e) { return handle(e, c); }
});

communityRoutes.post("/:id/messages", requireAuth, async (c) => {
  const b = z.object({
    kind: z.enum(["text", "photo", "file"]).default("text"),
    body: z.string().max(4000).optional(),
    mediaUrl: z.string().url().optional(),
  }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try { return c.json(await svc.postMessage(c.req.param("id")!, uid(c), b.data), 201); }
  catch (e) { return handle(e, c); }
});

communityRoutes.delete("/:id/messages/:mid", requireAuth, async (c) => {
  try { await svc.deleteMessage(c.req.param("id")!, uid(c), c.req.param("mid")!); return c.json({ ok: true }); }
  catch (e) { return handle(e, c); }
});

communityRoutes.patch("/:id/messages/:mid/hidden", requireAuth, async (c) => {
  const b = z.object({ hidden: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try { await svc.setMessageHidden(c.req.param("id")!, uid(c), c.req.param("mid")!, b.data.hidden); return c.json({ ok: true }); }
  catch (e) { return handle(e, c); }
});
