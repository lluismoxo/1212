import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import {
  listHabits, createHabit, archiveHabit, setHabitLog, weekLogs, currentStreak,
  NotFoundError,
} from "./service.js";

export const habitRoutes = new Hono();
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function nf(e: unknown, c: import("hono").Context) {
  if (e instanceof NotFoundError) return c.json({ error: "not_found" }, 404);
  return c.json({ error: "server_error" }, 500);
}

habitRoutes.get("/", requireAuth, async (c) => c.json(await listHabits(c.get("user").sub)));

habitRoutes.post("/", requireAuth, async (c) => {
  const b = z.object({ name: z.string().min(1).max(80), icon: z.string().max(40).nullable().optional() })
    .safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await createHabit(c.get("user").sub, b.data.name, b.data.icon), 201);
});

habitRoutes.delete("/:id", requireAuth, async (c) => {
  try {
    await archiveHabit(c.get("user").sub, c.req.param("id")!);
    return c.json({ ok: true });
  } catch (e) { return nf(e, c); }
});

habitRoutes.put("/:id/log", requireAuth, async (c) => {
  const b = z.object({ date: DATE, done: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try {
    await setHabitLog(c.get("user").sub, c.req.param("id")!, b.data.date, b.data.done);
    return c.json({ ok: true });
  } catch (e) { return nf(e, c); }
});

habitRoutes.get("/logs", requireAuth, async (c) => {
  const q = z.object({ from: DATE, to: DATE }).safeParse(c.req.query());
  if (!q.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await weekLogs(c.get("user").sub, q.data.from, q.data.to));
});

habitRoutes.get("/streak", requireAuth, async (c) =>
  c.json({ streak: await currentStreak(c.get("user").sub) }));
