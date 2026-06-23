import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "../db/client.js";
import { loginWithIdentity } from "./auth/service.js";
import type { VerifiedIdentity } from "../lib/oidc.js";
import * as profiles from "./profiles/service.js";
import * as location from "./location/service.js";
import * as habits from "./habits/service.js";
import * as tasks from "./tasks/service.js";
import * as journal from "./journal/service.js";

const hasDb = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost");
const d = hasDb ? describe.sequential : describe.skip;

let uid = "";
let uid2 = "";

async function makeUser(tag: string): Promise<string> {
  const n = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const idn: VerifiedIdentity = {
    provider: "google", sub: "sub-" + n,
    email: `vitest+${n}@example.com`, emailVerified: true, name: "Test",
  };
  await loginWithIdentity(idn, {});
  const r = await sql<{ user_id: string }[]>`
    select user_id from public.auth_identities where provider_uid = ${idn.sub}`;
  return r[0].user_id;
}

d("módulos Fase 4 (integración)", () => {
  beforeAll(async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-larguísimo-1234567890";
    uid = await makeUser("mod");
    uid2 = await makeUser("mod2");
  });
  afterAll(async () => {
    for (const id of [uid, uid2]) if (id) await sql`delete from public.auth_users where id = ${id}`.catch(() => {});
    await sql.end({ timeout: 5 });
  });

  it("profiles: update + username único + público", async () => {
    const uname = "test" + Math.random().toString(36).slice(2, 8);
    await profiles.updateProfile(uid, { username: uname, displayName: "Marco", bio: "hola" });
    const own = await profiles.getOwnProfile(uid);
    expect(own.username).toBe(uname);

    // username duplicado en otro usuario falla
    await expect(profiles.updateProfile(uid2, { username: uname }))
      .rejects.toBeInstanceOf(profiles.ValidationError);

    const pub = await profiles.getPublicProfile(uname) as any;
    expect(pub.username).toBe(uname);
    expect(pub.level).toBeTruthy();
  });

  it("profiles: perfil privado no es público", async () => {
    const uname = "priv" + Math.random().toString(36).slice(2, 8);
    await profiles.updateProfile(uid2, { username: uname, isPublic: false });
    await expect(profiles.getPublicProfile(uname)).rejects.toBeInstanceOf(profiles.NotFoundError);
  });

  it("location: upsert + nearby respeta sharing", async () => {
    // uid en Madrid, exacto
    await profiles.updateProfile(uid, { locationSharing: "exact" });
    await location.upsertLocation(uid, 40.416, -3.703, 10);
    const near = await location.nearby(40.416, -3.703, 10, 50);
    const mine = near.find((r: any) => r.lat != null);
    expect(mine).toBeTruthy();

    // cambia a 'off' → desaparece del nearby
    const myUsername = (await profiles.getOwnProfile(uid)).username;
    await profiles.updateProfile(uid, { locationSharing: "off" });
    const near2 = await location.nearby(40.416, -3.703, 10, 50);
    expect(near2.find((r: any) => r.username === myUsername)).toBeFalsy();
  });

  it("location: coords inválidas fallan", async () => {
    await expect(location.upsertLocation(uid, 999, 0)).rejects.toBeInstanceOf(location.ValidationError);
  });

  it("habits: crear, marcar, racha", async () => {
    const h = await habits.createHabit(uid, "Meditar");
    await habits.setHabitLog(uid, h.id, "2026-06-22", true);
    await habits.setHabitLog(uid, h.id, "2026-06-21", true);
    const week = await habits.weekLogs(uid, "2026-06-16", "2026-06-22");
    expect(week.length).toBeGreaterThanOrEqual(2);
    expect(typeof (await habits.currentStreak(uid))).toBe("number");
  });

  it("habits: no puedo marcar hábito de otro", async () => {
    const h = await habits.createHabit(uid2, "Ajeno");
    await expect(habits.setHabitLog(uid, h.id, "2026-06-22", true))
      .rejects.toBeInstanceOf(habits.NotFoundError);
  });

  it("tasks: crear, toggle, borrar; aislamiento por dueño", async () => {
    const t = await tasks.createTask(uid, "Comprar pan");
    const toggled = await tasks.toggleTask(uid, t.id, true);
    expect(toggled.done).toBe(true);
    // otro usuario no puede tocarla
    await expect(tasks.toggleTask(uid2, t.id, false)).rejects.toBeInstanceOf(tasks.NotFoundError);
    await tasks.deleteTask(uid, t.id);
    await expect(tasks.deleteTask(uid, t.id)).rejects.toBeInstanceOf(tasks.NotFoundError);
  });

  it("journal: upsert idempotente por fecha", async () => {
    await journal.upsertEntry(uid, "2026-06-22", "primer texto");
    const updated = await journal.upsertEntry(uid, "2026-06-22", "texto editado");
    expect(updated.body).toBe("texto editado");
    const list = await journal.listEntries(uid, 10);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});
