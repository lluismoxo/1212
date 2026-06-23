import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "../../db/client.js";
import {
  loginWithIdentity,
  refresh,
  logout,
  deleteAccount,
  AuthError,
} from "./service.js";
import type { VerifiedIdentity } from "../../lib/oidc.js";

// Integración contra Neon. Requiere DATABASE_URL + JWT_SECRET.
// Cada test crea su propia identidad (aislada) y limpia al final.

const hasDb = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost");
const d = hasDb ? describe.sequential : describe.skip;

function newIdentity(tag: string): VerifiedIdentity {
  const n = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    provider: "google",
    sub: "sub-" + n,
    email: `vitest+${n}@example.com`,
    emailVerified: true,
    name: "Vitest User",
  };
}

async function userIdFor(sub: string): Promise<string> {
  const r = await sql<{ user_id: string }[]>`
    select user_id from public.auth_identities where provider_uid = ${sub}`;
  return r[0].user_id;
}

const created: string[] = [];

d("auth flow (integración)", () => {
  beforeAll(() => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-larguísimo-1234567890";
  });

  afterAll(async () => {
    for (const id of created) {
      await sql`delete from public.auth_users where id = ${id}`.catch(() => {});
    }
    await sql.end({ timeout: 5 });
  });

  it("login crea usuario + perfil + nivel + rol", async () => {
    const idn = newIdentity("create");
    const tokens = await loginWithIdentity(idn, {});
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    const uid = await userIdFor(idn.sub);
    created.push(uid);

    const p = await sql`select 1 from public.profiles where id = ${uid}`;
    const l = await sql`select 1 from public.user_levels where profile_id = ${uid}`;
    const r = await sql`select 1 from public.user_roles where profile_id = ${uid} and role = 'user'`;
    expect(p.length).toBe(1);
    expect(l.length).toBe(1);
    expect(r.length).toBe(1);
  });

  it("segundo login con misma identidad NO duplica usuario", async () => {
    const idn = newIdentity("dup");
    await loginWithIdentity(idn, {});
    await loginWithIdentity(idn, {});
    created.push(await userIdFor(idn.sub));

    const c = await sql<{ n: number }[]>`
      select count(*)::int n from public.auth_identities where provider_uid = ${idn.sub}`;
    expect(c[0].n).toBe(1);
  });

  it("refresh rota el token y detecta reuse", async () => {
    const idn = newIdentity("rot");
    const t1 = await loginWithIdentity(idn, {});
    created.push(await userIdFor(idn.sub));

    const t2 = await refresh(t1.refreshToken, {});
    expect(t2.refreshToken).not.toBe(t1.refreshToken);

    // reusar t1 (revocado) → reuse → revoca familia
    await expect(refresh(t1.refreshToken, {})).rejects.toMatchObject({ code: "refresh_reuse" });
    // t2 también queda revocado
    await expect(refresh(t2.refreshToken, {})).rejects.toBeInstanceOf(AuthError);
  });

  it("logout revoca la sesión", async () => {
    const idn = newIdentity("out");
    const t = await loginWithIdentity(idn, {});
    created.push(await userIdFor(idn.sub));

    await logout(t.refreshToken);
    await expect(refresh(t.refreshToken, {})).rejects.toBeInstanceOf(AuthError);
  });

  it("eliminar cuenta borra usuario y perfil (cascade)", async () => {
    const idn = newIdentity("del");
    await loginWithIdentity(idn, {});
    const uid = await userIdFor(idn.sub);

    await deleteAccount(uid);
    const u = await sql`select 1 from public.auth_users where id = ${uid}`;
    const p = await sql`select 1 from public.profiles where id = ${uid}`;
    expect(u.length).toBe(0);
    expect(p.length).toBe(0);
  });
});
