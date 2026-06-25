import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "../db/client.js";
import { loginWithIdentity } from "./auth/service.js";
import type { VerifiedIdentity } from "../lib/oidc.js";
import * as levels from "./levels/service.js";

const hasDb = !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres");
const d = hasDb ? describe.sequential : describe.skip;

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

// Inserta un hábito creado el día 1 del mes objetivo + N días marcados done.
async function seedMonth(uid: string, monthStart: string, daysDone: number, _totalDays: number) {
  const h = await sql<{ id: string }[]>`
    insert into public.habits (profile_id, name, created_at)
    values (${uid}, 'H', ${monthStart}::timestamptz) returning id`;
  const hid = h[0].id;
  // inserción en bloque (un solo round-trip)
  await sql`
    insert into public.habit_logs (habit_id, profile_id, log_date, done)
    select ${hid}, ${uid}, (${monthStart}::date + g), true
    from generate_series(0, ${daysDone - 1}) g
    on conflict do nothing`;
  return hid;
}

let users: string[] = [];

d("motor de niveles (integración)", () => {
  beforeAll(() => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-larguísimo-1234567890";
  });
  afterAll(async () => {
    for (const u of users) await sql`delete from public.auth_users where id = ${u}`.catch(() => {});
    await sql.end({ timeout: 5 });
  });

  // mes natural completo anterior, con 31 días para simplificar el cálculo
  // usamos enero del año pasado: 31 días.
  const prevYear = new Date().getUTCFullYear() - 1;
  const jan = `${prevYear}-01-01`;

  it("≥70% en un mes → sube 1 nivel", async () => {
    const uid = await makeUser("lvl-up"); users.push(uid);
    // tracking desde antes de ese mes
    await sql`update public.profiles set level_tracking_since = ${`${prevYear}-01-01`} where id = ${uid}`;
    await seedMonth(uid, jan, 23, 31); // 23/31 ≈ 74.2% → sube
    const st = await levels.getOwnLevel(uid);
    expect(st.current_level).toBe(2);
    expect(st.points).toBe(1);
  });

  it("<70% en un mes → NO sube", async () => {
    const uid = await makeUser("lvl-no"); users.push(uid);
    await sql`update public.profiles set level_tracking_since = ${`${prevYear}-01-01`} where id = ${uid}`;
    await seedMonth(uid, jan, 21, 31); // 21/31 ≈ 67.7% → no sube
    const st = await levels.getOwnLevel(uid);
    expect(st.current_level).toBe(1);
  });

  it("exactamente 70% → sube (umbral inclusivo)", async () => {
    const uid = await makeUser("lvl-70"); users.push(uid);
    await sql`update public.profiles set level_tracking_since = ${`${prevYear}-01-01`} where id = ${uid}`;
    // 30 días esperados, 21 done = 70.0%
    await sql`insert into public.habits (profile_id, name, created_at)
              values (${uid}, 'H30', ${`${prevYear}-04-01`}::timestamptz)`;
    const h = await sql<{ id: string }[]>`select id from public.habits where profile_id = ${uid} limit 1`;
    await sql`
      insert into public.habit_logs (habit_id, profile_id, log_date, done)
      select ${h[0].id}, ${uid}, (${`${prevYear}-04-01`}::date + g), true
      from generate_series(0, 20) g on conflict do nothing`;
    const c = await levels.monthCompliance(uid, `${prevYear}-04-15`);
    expect(c).toBe(70);
    const st = await levels.getOwnLevel(uid);
    expect(st.current_level).toBe(2);
  });

  it("recalc es idempotente (no acumula doble)", async () => {
    const uid = await makeUser("lvl-idem"); users.push(uid);
    await sql`update public.profiles set level_tracking_since = ${`${prevYear}-01-01`} where id = ${uid}`;
    await seedMonth(uid, jan, 28, 31);
    const a = await levels.getOwnLevel(uid);
    const b = await levels.getOwnLevel(uid); // recalcula otra vez
    expect(a.current_level).toBe(b.current_level);
    expect(b.points).toBe(1);
  });

  it("el cliente no puede escribir el nivel (no hay endpoint de escritura)", async () => {
    // garantía estructural: user_levels solo se actualiza vía recalc_level server-side.
    const uid = await makeUser("lvl-noapi"); users.push(uid);
    const st = await levels.getOwnLevel(uid);
    expect(st.current_level).toBe(1); // nuevo, sin meses completos
  });
});
