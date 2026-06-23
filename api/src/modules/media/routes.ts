import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import * as svc from "./service.js";

export const mediaRoutes = new Hono();

// POST /media/presign — pide una URL para subir avatar/foto directo a R2
mediaRoutes.post("/presign", requireAuth, async (c) => {
  const b = z.object({
    folder: z.enum(["avatars", "media"]),
    contentType: z.string(),
    sizeBytes: z.number().int().positive(),
  }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "bad_request" }, 400);
  try {
    const r = await svc.presignUpload(c.get("user").sub, b.data.folder, b.data.contentType, b.data.sizeBytes);
    return c.json(r);
  } catch (e) {
    if (e instanceof svc.ValidationError) return c.json({ error: "validation", message: e.message }, 422);
    if (e instanceof svc.NotConfiguredError) return c.json({ error: "storage_not_configured" }, 503);
    return c.json({ error: "server_error" }, 500);
  }
});
