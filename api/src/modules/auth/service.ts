import { sql } from "../../db/client.js";
import { getEnv } from "../../config/env.js";
import { signAccessToken } from "../../lib/jwt.js";
import { generateRefreshToken, hashToken } from "../../lib/tokens.js";
import type { VerifiedIdentity } from "../../lib/oidc.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

// rol principal para el claim del JWT (prioriza admin > moderator > user)
async function primaryRole(userId: string): Promise<string> {
  const rows = await sql<{ role: string }[]>`
    select role from public.user_roles where profile_id = ${userId}`;
  const set = new Set(rows.map((r) => r.role));
  if (set.has("admin")) return "admin";
  if (set.has("moderator")) return "moderator";
  return "user";
}

async function issueTokens(userId: string, meta: SessionMeta): Promise<TokenPair> {
  const env = getEnv();
  const role = await primaryRole(userId);
  const accessToken = await signAccessToken({ sub: userId, role });
  const refreshToken = generateRefreshToken();
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400_000).toISOString();

  await sql`
    insert into public.auth_sessions (user_id, refresh_hash, user_agent, ip, expires_at)
    values (${userId}, ${refreshHash}, ${meta.userAgent ?? null}, ${meta.ip ?? null}, ${expiresAt}::timestamptz)`;

  return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL };
}

// Política pura: ¿puede una identidad OIDC auto-enlazarse a una cuenta
// existente encontrada por email? Solo si el proveedor verificó el email.
// (Aislada para test sin DB — evita account pre-hijacking, CWE-287.)
export function canLinkToExistingAccount(emailVerified: boolean): boolean {
  return emailVerified === true;
}

// ── Login / signup vía OIDC ───────────────────────────────────
// Encuentra o crea el usuario para la identidad verificada y emite tokens.
export async function loginWithIdentity(
  identity: VerifiedIdentity,
  meta: SessionMeta,
): Promise<TokenPair> {
  const userId = await sql.begin(async (tx) => {
    // 1) ¿identidad ya enlazada?
    const existing = await tx<{ user_id: string }[]>`
      select user_id from public.auth_identities
      where provider = ${identity.provider} and provider_uid = ${identity.sub}`;

    let uid: string;
    if (existing.length) {
      uid = existing[0].user_id;
    } else {
      // 2) ¿hay usuario con ese email? (enlaza proveedor adicional)
      let matched: { id: string }[] = [];
      if (identity.email) {
        matched = await tx<{ id: string }[]>`
          select id from public.auth_users where email = ${identity.email}`;
      }
      if (matched.length) {
        // Auto-enlazar a una cuenta existente por email SOLO si el proveedor
        // afirma el email como verificado. Sin esto, un IdP que devuelva un
        // email no verificado podría enlazarse a la cuenta de otro (CWE-287).
        if (!canLinkToExistingAccount(identity.emailVerified)) {
          throw new AuthError("email_not_verified", "El proveedor no verificó el email");
        }
        uid = matched[0].id;
        // El enlace de un email verificado confirma la titularidad → marcar la
        // cuenta como verificada (blinda futuros enlaces y flujos de reset).
        await tx`update public.auth_users set email_verified = true where id = ${uid}`;
      } else {
        const created = await tx<{ id: string }[]>`
          insert into public.auth_users (email, email_verified)
          values (${identity.email}, ${identity.emailVerified})
          returning id`;
        uid = created[0].id;
        await tx`select public.provision_user(${uid}, ${identity.name ?? ""})`;
      }
      const raw = JSON.stringify({ email: identity.email });
      await tx`
        insert into public.auth_identities (user_id, provider, provider_uid, raw)
        values (${uid}, ${identity.provider}, ${identity.sub}, ${raw}::jsonb)`;
    }

    // 3) cuenta deshabilitada → bloquear
    const u = await tx<{ disabled: boolean }[]>`
      select disabled from public.auth_users where id = ${uid}`;
    if (u[0]?.disabled) throw new AuthError("account_disabled", "Cuenta deshabilitada");

    await tx`update public.auth_users set last_login_at = now() where id = ${uid}`;
    return uid;
  });

  return issueTokens(userId, meta);
}

// ── Refresh con rotación + detección de reuse ─────────────────
export async function refresh(refreshToken: string, meta: SessionMeta): Promise<TokenPair> {
  const incomingHash = hashToken(refreshToken);

  const rows = await sql<{ id: string; user_id: string; revoked_at: Date | null; expires_at: string | Date }[]>`
    select id, user_id, revoked_at, expires_at
    from public.auth_sessions where refresh_hash = ${incomingHash}`;

  if (!rows.length) throw new AuthError("invalid_refresh", "Refresh token inválido");
  const s = rows[0];
  const expiresMs = new Date(s.expires_at).getTime();

  // reuse de un token ya revocado → posible robo: revoca TODA la familia del usuario
  // (statement independiente: debe persistir aunque luego lancemos el error)
  if (s.revoked_at) {
    await sql`update public.auth_sessions set revoked_at = now()
             where user_id = ${s.user_id} and revoked_at is null`;
    throw new AuthError("refresh_reuse", "Refresh token reutilizado");
  }
  if (expiresMs < Date.now()) {
    throw new AuthError("refresh_expired", "Sesión expirada");
  }

  // rotación atómica: solo el primero que revoque esta sesión continúa
  // (evita carrera: dos refresh simultáneos del mismo token).
  const rotated = await sql`
    update public.auth_sessions set revoked_at = now()
    where id = ${s.id} and revoked_at is null
    returning id`;
  if (!rotated.length) throw new AuthError("invalid_refresh", "Refresh token inválido");

  return issueTokens(s.user_id, meta);
}

// ── Logout: revoca la sesión del refresh dado ─────────────────
export async function logout(refreshToken: string): Promise<void> {
  const h = hashToken(refreshToken);
  await sql`update public.auth_sessions set revoked_at = now()
           where refresh_hash = ${h} and revoked_at is null`;
}

// ── Logout global: revoca todas las sesiones del usuario ──────
export async function logoutAll(userId: string): Promise<void> {
  await sql`update public.auth_sessions set revoked_at = now()
           where user_id = ${userId} and revoked_at is null`;
}

// ── Eliminar cuenta: cascade borra datos; mensajes → anónimos ─
export async function deleteAccount(userId: string): Promise<void> {
  // on delete cascade limpia profile/contenido; on delete set null anonimiza mensajes.
  await sql`delete from public.auth_users where id = ${userId}`;
}
