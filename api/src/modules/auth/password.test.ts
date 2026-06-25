import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "../../db/client.js";
import {
  registerWithPassword, loginWithPassword, requestPasswordReset, resetPassword,
} from "./password.js";
import { AuthError } from "./service.js";

const hasDb = !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres");
const d = hasDb ? describe.sequential : describe.skip;

const created: string[] = [];
function email(tag: string) { return `pwtest+${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`; }

d("auth email+password (integración)", () => {
  beforeAll(() => { if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-larguísimo-1234567890"; });
  afterAll(async () => {
    for (const e of created) await sql`delete from public.auth_users where email = ${e}`.catch(() => {});
    await sql.end({ timeout: 5 });
  });

  it("registro crea usuario + perfil y emite tokens", async () => {
    const e = email("reg"); created.push(e);
    const t = await registerWithPassword(e, "secret123", "Marco", {});
    expect(t.accessToken).toBeTruthy();
    const u = await sql`select 1 from public.auth_users where email = ${e} and password_hash is not null`;
    expect(u.length).toBe(1);
  });

  it("registro duplicado falla", async () => {
    const e = email("dup"); created.push(e);
    await registerWithPassword(e, "secret123", "X", {});
    await expect(registerWithPassword(e, "secret123", "X", {})).rejects.toMatchObject({ code: "email_taken" });
  });

  it("login correcto / incorrecto", async () => {
    const e = email("login"); created.push(e);
    await registerWithPassword(e, "secret123", "X", {});
    const t = await loginWithPassword(e, "secret123", {});
    expect(t.accessToken).toBeTruthy();
    await expect(loginWithPassword(e, "malísima", {})).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(loginWithPassword("noexiste@x.com", "x", {})).rejects.toBeInstanceOf(AuthError);
  });

  it("recuperación: token resetea y permite nuevo login", async () => {
    const e = email("reset"); created.push(e);
    await registerWithPassword(e, "oldpass123", "X", {});
    const token = await requestPasswordReset(e);
    expect(token).toBeTruthy();
    await resetPassword(token!, "newpass123");
    await expect(loginWithPassword(e, "oldpass123", {})).rejects.toMatchObject({ code: "invalid_credentials" });
    const t = await loginWithPassword(e, "newpass123", {});
    expect(t.accessToken).toBeTruthy();
    // token ya usado
    await expect(resetPassword(token!, "x")).rejects.toBeInstanceOf(AuthError);
  });
});
