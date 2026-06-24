import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { upsertLocation, deleteLocation, nearby, ValidationError } from "./service.js";

export const locationRoutes = new Hono();

const putBody = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().positive().nullable().optional(),
});

// PUT /location/me — guarda mi ubicación
locationRoutes.put("/me", requireAuth, async (c) => {
  const parsed = putBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad_request" }, 400);
  try {
    await upsertLocation(c.get("user").sub, parsed.data.lat, parsed.data.lng, parsed.data.accuracyM);
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: "validation", message: e.message }, 422);
    return c.json({ error: "server_error" }, 500);
  }
});

// DELETE /location/me — quitar mi ubicación del mapa
locationRoutes.delete("/me", requireAuth, async (c) => {
  await deleteLocation(c.get("user").sub);
  return c.json({ ok: true });
});

const nearbyQ = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().default(50),
  limit: z.coerce.number().default(100),
});

// GET /location/nearby?lat=&lng=&radiusKm=&limit= — perfiles cercanos
locationRoutes.get("/nearby", requireAuth, async (c) => {
  const parsed = nearbyQ.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "bad_request" }, 400);
  try {
    const { lat, lng, radiusKm, limit } = parsed.data;
    return c.json(await nearby(lat, lng, radiusKm, limit));
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: "validation", message: e.message }, 422);
    return c.json({ error: "server_error" }, 500);
  }
});
