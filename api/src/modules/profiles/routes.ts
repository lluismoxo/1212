import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import {
  getOwnProfile,
  getPublicProfile,
  searchProfiles,
  updateProfile,
  setSocialLinks,
  completeOnboarding,
  userStats,
  NotFoundError,
  ValidationError,
} from "./service.js";

export const profileRoutes = new Hono();

function handle(e: unknown, c: import("hono").Context) {
  if (e instanceof NotFoundError) return c.json({ error: "not_found" }, 404);
  if (e instanceof ValidationError) return c.json({ error: "validation", message: e.message }, 422);
  return c.json({ error: "server_error" }, 500);
}

// GET /profiles/search?q= — búsqueda parcial de perfiles públicos
profileRoutes.get("/search", requireAuth, async (c) => {
  const q = z.object({ q: z.string().min(2).max(50), limit: z.coerce.number().default(20) })
    .safeParse(c.req.query());
  if (!q.success) return c.json({ error: "bad_request" }, 400);
  return c.json(await searchProfiles(q.data.q, q.data.limit));
});

// GET /profiles/me — perfil propio
profileRoutes.get("/me", requireAuth, async (c) => {
  try {
    return c.json(await getOwnProfile(c.get("user").sub));
  } catch (e) {
    return handle(e, c);
  }
});

// GET /profiles/me/stats — estadísticas reales (días activos, hábitos, racha, diario)
profileRoutes.get("/me/stats", requireAuth, async (c) => {
  try {
    return c.json(await userStats(c.get("user").sub));
  } catch (e) {
    return handle(e, c);
  }
});

const patchBody = z.object({
  username: z.string().optional(),
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
  locationSharing: z.enum(["exact", "city", "off"]).optional(),
});

// PATCH /profiles/me — actualizar perfil propio
profileRoutes.patch("/me", requireAuth, async (c) => {
  const parsed = patchBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad_request" }, 400);
  try {
    return c.json(await updateProfile(c.get("user").sub, parsed.data));
  } catch (e) {
    return handle(e, c);
  }
});

const linksBody = z.object({
  links: z
    .array(
      z.object({
        kind: z.enum(["instagram", "x", "youtube", "linkedin", "web", "tiktok", "phone", "whatsapp"]),
        // phone/whatsapp guardan número o enlace; el resto, texto libre (usuario o URL).
        url: z.string().min(1).max(300),
      }),
    )
    .max(8),
});

// PUT /profiles/me/links — reemplazar enlaces sociales
profileRoutes.put("/me/links", requireAuth, async (c) => {
  const parsed = linksBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad_request" }, 400);
  try {
    return c.json(await setSocialLinks(c.get("user").sub, parsed.data.links));
  } catch (e) {
    return handle(e, c);
  }
});

// POST /profiles/me/onboarding-done
profileRoutes.post("/me/onboarding-done", requireAuth, async (c) => {
  await completeOnboarding(c.get("user").sub);
  return c.json({ ok: true });
});

// GET /profiles/:username — perfil público (no requiere auth)
profileRoutes.get("/:username", async (c) => {
  try {
    return c.json(await getPublicProfile(c.req.param("username")));
  } catch (e) {
    return handle(e, c);
  }
});
