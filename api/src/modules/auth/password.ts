import bcrypt from "bcryptjs";
import { sql } from "../../db/client.js";
import { generateRefreshToken, hashToken } from "../../lib/tokens.js";
import { signAccessToken } from "../../lib/jwt.js";
import { getEnv } from "../../config/env.js";
import { AuthError, type TokenPair } from "./service.js";

const ROUNDS = 12;

// Hash bcrypt "señuelo" (de una contraseña aleatoria fija) para comparar contra
// él cuando el email no existe o no tiene contraseña. Iguala el coste de tiempo
// del login, evitando el oráculo de enumeración por temporización (CWE-208).
const DUMMY_HASH = "$2a$12$OyW9k7RcENtd1uhoC/0/xOUQJLUyq9lxahVsTauEg/3LBaF.4KN1W";

async function issueFor(userId: string, meta: { userAgent?: string | null; ip?: string | null }): Promise<TokenPair> {
  const env = getEnv();
  const roles = await sql<{ role: string }[]>`select role from public.user_roles where profile_id = ${userId}`;
  const set = new Set(roles.map((r) => r.role));
  const role = set.has("admin") ? "admin" : set.has("moderator") ? "moderator" : "user";
  const accessToken = await signAccessToken({ sub: userId, role });
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400_000).toISOString();
  await sql`
    insert into public.auth_sessions (user_id, refresh_hash, user_agent, ip, expires_at)
    values (${userId}, ${hashToken(refreshToken)}, ${meta.userAgent ?? null}, ${meta.ip ?? null}, ${expiresAt}::timestamptz)`;
  return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL };
}

// ── Registro con email + contraseña ───────────────────────────
export async function registerWithPassword(
  email: string, password: string, name: string,
  meta: { userAgent?: string | null; ip?: string | null },
): Promise<TokenPair> {
  const e = email.toLowerCase().trim();
  const existing = await sql`select 1 from public.auth_users where email = ${e}`;
  if (existing.length) throw new AuthError("email_taken", "Email ya registrado");

  const hash = await bcrypt.hash(password, ROUNDS);
  const userId = await sql.begin(async (tx) => {
    const created = await tx<{ id: string }[]>`
      insert into public.auth_users (email, email_verified, password_hash)
      values (${e}, false, ${hash}) returning id`;
    const uid = created[0].id;
    await tx`select public.provision_user(${uid}, ${name})`;
    return uid;
  });
  return issueFor(userId, meta);
}

// ── Login con email + contraseña ──────────────────────────────
export async function loginWithPassword(
  email: string, password: string,
  meta: { userAgent?: string | null; ip?: string | null },
): Promise<TokenPair> {
  const e = email.toLowerCase().trim();
  const rows = await sql<{ id: string; password_hash: string | null; disabled: boolean }[]>`
    select id, password_hash, disabled from public.auth_users where email = ${e}`;
  // Comparar SIEMPRE (contra un hash señuelo si no hay cuenta/contraseña) para
  // que el tiempo de respuesta no revele si el email existe (anti-enumeración).
  const stored = rows[0]?.password_hash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, stored);
  // mensaje genérico (no revelar si el email existe)
  if (!rows.length || !rows[0].password_hash) throw new AuthError("invalid_credentials", "Credenciales inválidas");
  if (rows[0].disabled) throw new AuthError("account_disabled", "Cuenta deshabilitada");
  if (!ok) throw new AuthError("invalid_credentials", "Credenciales inválidas");
  await sql`update public.auth_users set last_login_at = now() where id = ${rows[0].id}`;
  return issueFor(rows[0].id, meta);
}

// ── Solicitar recuperación: genera token (lo devolvería por email) ─
// Devuelve el token en claro SOLO para que la capa de email lo envíe.
// No revela si el email existe.
export async function requestPasswordReset(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  const rows = await sql<{ id: string }[]>`select id from public.auth_users where email = ${e}`;
  if (!rows.length) return null;
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 3600_000).toISOString(); // 1h
  await sql`
    insert into public.password_resets (user_id, token_hash, expires_at)
    values (${rows[0].id}, ${hashToken(token)}, ${expiresAt}::timestamptz)`;
  return token;
}

// ── Aplicar nueva contraseña con el token ─────────────────────
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const h = hashToken(token);
  const rows = await sql<{ id: string; user_id: string; expires_at: string; used_at: string | null }[]>`
    select id, user_id, expires_at, used_at from public.password_resets where token_hash = ${h}`;
  if (!rows.length) throw new AuthError("invalid_token", "Token inválido");
  const r = rows[0];
  if (r.used_at) throw new AuthError("invalid_token", "Token ya usado");
  if (new Date(r.expires_at).getTime() < Date.now()) throw new AuthError("expired_token", "Token expirado");

  const hash = await bcrypt.hash(newPassword, ROUNDS);
  await sql.begin(async (tx) => {
    await tx`update public.auth_users set password_hash = ${hash} where id = ${r.user_id}`;
    await tx`update public.password_resets set used_at = now() where id = ${r.id}`;
    // revoca sesiones activas por seguridad
    await tx`update public.auth_sessions set revoked_at = now() where user_id = ${r.user_id} and revoked_at is null`;
  });
}
