import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { listTasks, createTask, toggleTask, deleteTask, NotFoundError } from "./service.js";

export const taskRoutes = new Hono();

function nf(e: unknown, c: import("hono").Context) {
  if (e instanceof NotFoundError) return c.json({ error: "not_found" }, 404);
  return c.json({ error: "server_error" }, 500);
}

// solo tareas de hoy (la fecha la fija el servidor)
taskRoutes.get("/", requireAuth, async (c) => c.json(await listTasks(c.get("user").sub)));

taskRoutes.post("/", requireAuth, async (c) => {
  const b = z.object({ text: z.string().min(1).max(500) })
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await createTask(c.get("user").sub, b.data.text), 201);
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
