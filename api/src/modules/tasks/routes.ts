import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { listTasks, createTask, toggleTask, deleteTask, NotFoundError } from "./service.js";

export const taskRoutes = new Hono();
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function nf(e: unknown, c: import("hono").Context) {
  if (e instanceof NotFoundError) return c.json({ error: "not_found" }, 404);
  return c.json({ error: "server_error" }, 500);
}

taskRoutes.get("/", requireAuth, async (c) => {
  const q = z.object({ dueDate: DATE.optional() }).safeParse(c.req.query());
  return c.json(await listTasks(c.get("user").sub, q.success ? q.data.dueDate : undefined));
});

taskRoutes.post("/", requireAuth, async (c) => {
  const b = z.object({ text: z.string().min(1).max(500), dueDate: DATE.nullable().optional() })
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await createTask(c.get("user").sub, b.data.text, b.data.dueDate), 201);
});

taskRoutes.patch("/:id", requireAuth, async (c) => {
  const b = z.object({ done: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try { return c.json(await toggleTask(c.get("user").sub, c.req.param("id")!, b.data.done)); }
  catch (e) { return nf(e, c); }
});

taskRoutes.delete("/:id", requireAuth, async (c) => {
  try { await deleteTask(c.get("user").sub, c.req.param("id")!); return c.json({ ok: true }); }
  catch (e) { return nf(e, c); }
});
