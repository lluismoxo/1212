import { sql } from "../../db/client.js";

export class NotFoundError extends Error {}

// Acceso administrativo del propietario a datos internos (requisito de negocio).
// NOTA: el diario (journal_entries) queda fuera a propósito (privacidad máxima).

export async function stats() {
  const rows = await sql<{ users: number; profiles: number; communities: number; reports_open: number }[]>`
    select
      (select count(*)::int from public.auth_users) as users,
      (select count(*)::int from public.profiles where deleted_at is null) as profiles,
      (select count(*)::int from public.communities) as communities,
      (select count(*)::int from public.moderation_reports where status = 'open') as reports_open`;
  return rows[0];
}

export async function listUsers(limit: number, q?: string) {
  const lim = Math.min(Math.max(limit, 1), 200);
  if (q) {
    const like = `%${q}%`;
    return sql`
      select au.id, au.email, au.disabled, au.created_at, au.last_login_at,
             p.username, p.display_name
      from public.auth_users au
      left join public.profiles p on p.id = au.id
      where au.email ilike ${like} or p.username ilike ${like}
      order by au.created_at desc limit ${lim}`;
  }
  return sql`
    select au.id, au.email, au.disabled, au.created_at, au.last_login_at,
           p.username, p.display_name
    from public.auth_users au
    left join public.profiles p on p.id = au.id
    order by au.created_at desc limit ${lim}`;
}

// Bloquear/desbloquear cuenta. Al bloquear, revoca sus sesiones.
export async function setUserDisabled(adminId: string, userId: string, disabled: boolean) {
  const rows = await sql`update public.auth_users set disabled = ${disabled}
                        where id = ${userId} returning id`;
  if (!rows.length) throw new NotFoundError("usuario no encontrado");
  if (disabled) {
    await sql`update public.auth_sessions set revoked_at = now()
             where user_id = ${userId} and revoked_at is null`;
  }
  await audit(adminId, disabled ? "user.disable" : "user.enable", "auth_user", userId);
}

export async function setUserRole(adminId: string, userId: string, role: "user" | "moderator" | "admin", grant: boolean) {
  if (grant) {
    await sql`insert into public.user_roles (profile_id, role) values (${userId}, ${role})
             on conflict do nothing`;
  } else {
    await sql`delete from public.user_roles where profile_id = ${userId} and role = ${role}`;
  }
  await audit(adminId, grant ? "role.grant" : "role.revoke", "user_role", userId, { role });
}

// Escribe en el log de auditoría (append-only).
export async function audit(
  actorId: string | null, action: string, entityType?: string, entityId?: string, metadata?: unknown,
) {
  await sql`
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (${actorId}, ${action}, ${entityType ?? null}, ${entityId ?? null},
            ${metadata ? JSON.stringify(metadata) : "{}"}::jsonb)`;
}

export async function listAudit(limit: number) {
  const lim = Math.min(Math.max(limit, 1), 200);
  return sql`select * from public.audit_logs order by created_at desc limit ${lim}`;
}
