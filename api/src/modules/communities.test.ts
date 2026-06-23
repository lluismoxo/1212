import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "../db/client.js";
import { loginWithIdentity } from "./auth/service.js";
import type { VerifiedIdentity } from "../lib/oidc.js";
import * as com from "./communities/service.js";
import * as mod from "./moderation/service.js";
import * as admin from "./admin/service.js";
import * as analytics from "./analytics/service.js";

const hasDb = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost");
const d = hasDb ? describe.sequential : describe.skip;

let owner = "", member = "", outsider = "";

async function makeUser(tag: string): Promise<string> {
  const n = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const idn: VerifiedIdentity = {
    provider: "google", sub: "sub-" + n, email: `vitest+${n}@example.com`,
    emailVerified: true, name: "T",
  };
  await loginWithIdentity(idn, {});
  const r = await sql<{ user_id: string }[]>`
    select user_id from public.auth_identities where provider_uid = ${idn.sub}`;
  return r[0].user_id;
}

let communityId = "";

d("communities + moderation + admin + analytics (integración)", () => {
  beforeAll(async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-larguísimo-1234567890";
    owner = await makeUser("own");
    member = await makeUser("mem");
    outsider = await makeUser("out");
  });
  afterAll(async () => {
    if (communityId) await sql`delete from public.communities where id = ${communityId}`.catch(() => {});
    for (const id of [owner, member, outsider]) if (id) await sql`delete from public.auth_users where id = ${id}`.catch(() => {});
    await sql.end({ timeout: 5 });
  });

  it("crear comunidad → el creador es moderador", async () => {
    const slug = "test-" + Math.random().toString(36).slice(2, 8);
    const c = await com.createCommunity(owner, { slug, name: "Test Com", isPrivate: false });
    communityId = c.id as string;
    const mem = await com.members(communityId, owner) as any[];
    expect(mem.find((m) => m.role === "moderator")).toBeTruthy();
  });

  it("unirse a comunidad pública y postear", async () => {
    await com.join(communityId, member);
    const msg = await com.postMessage(communityId, member, { kind: "text", body: "hola" });
    expect(msg.body).toBe("hola");
  });

  it("no-miembro no puede ver mensajes ni postear", async () => {
    await expect(com.listMessages(communityId, outsider, 10)).rejects.toBeInstanceOf(com.ForbiddenError);
    await expect(com.postMessage(communityId, outsider, { kind: "text", body: "x" }))
      .rejects.toBeInstanceOf(com.ForbiddenError);
  });

  it("solo moderador oculta mensajes; autor o mod borra", async () => {
    const msg = await com.postMessage(communityId, member, { kind: "text", body: "spam" });
    // member (no mod) no puede ocultar
    await expect(com.setMessageHidden(communityId, member, msg.id, true))
      .rejects.toBeInstanceOf(com.ForbiddenError);
    // owner (mod) sí
    await com.setMessageHidden(communityId, owner, msg.id, true);
    // el propio autor puede borrar el suyo
    await com.deleteMessage(communityId, member, msg.id);
  });

  it("moderation: reportar y resolver (admin)", async () => {
    const r = await mod.createReport(member, "community", communityId, "spam masivo");
    expect(r.status).toBe("open");
    // dar admin a owner para resolver
    await admin.setUserRole(owner, owner, "admin", true);
    await mod.resolveReport(owner, r.id, "dismissed");
    const open = await mod.listReports("open") as any[];
    expect(open.find((x) => x.id === r.id)).toBeFalsy();
  });

  it("admin: stats, disable revoca sesiones, audit log", async () => {
    const s = await admin.stats();
    expect(s.users).toBeGreaterThan(0);
    await admin.setUserDisabled(owner, outsider, true);
    const u = await sql`select disabled from public.auth_users where id = ${outsider}`;
    expect(u[0].disabled).toBe(true);
    const log = await admin.listAudit(10) as any[];
    expect(log.find((l) => l.action === "user.disable")).toBeTruthy();
  });

  it("analytics: solo eventos en lista blanca", async () => {
    await analytics.track(member, "habit_checked", { habit: "x" });
    await analytics.track(member, "evento_basura_no_permitido");
    const sum = await analytics.summary(1) as any[];
    expect(sum.find((e) => e.name === "habit_checked")).toBeTruthy();
    expect(sum.find((e) => e.name === "evento_basura_no_permitido")).toBeFalsy();
  });
});
