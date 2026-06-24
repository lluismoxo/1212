import { sql } from "../../db/client.js";

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class ValidationError extends Error {}

// ── helpers de pertenencia/rol (usan las funciones SQL is_member/is_moderator) ─
async function membership(communityId: string, userId: string): Promise<"none" | "member" | "moderator"> {
  const rows = await sql<{ role: string }[]>`
    select role from public.community_members
    where community_id = ${communityId} and profile_id = ${userId}`;
  if (!rows.length) return "none";
  return rows[0].role === "moderator" ? "moderator" : "member";
}

async function assertMember(communityId: string, userId: string) {
  if ((await membership(communityId, userId)) === "none") {
    throw new ForbiddenError("no eres miembro");
  }
}
async function assertModerator(communityId: string, userId: string) {
  if ((await membership(communityId, userId)) !== "moderator") {
    throw new ForbiddenError("requiere moderador");
  }
}

// ── listado / detalle ─────────────────────────────────────────
// Lista comunidades públicas + las privadas del usuario.
export async function listCommunities(userId: string) {
  return sql`
    select c.id, c.slug, c.name, c.description, c.goal, c.colors, c.is_private,
      (select count(*)::int from public.community_members m where m.community_id = c.id) as members,
      exists (select 1 from public.community_members m
              where m.community_id = c.id and m.profile_id = ${userId}) as joined
    from public.communities c
    where c.is_private = false
       or exists (select 1 from public.community_members m
                  where m.community_id = c.id and m.profile_id = ${userId})
    order by c.created_at desc`;
}

export async function getCommunity(communityId: string, userId: string) {
  const rows = await sql`
    select id, slug, name, description, goal, colors, is_private, created_by, created_at
    from public.communities where id = ${communityId}`;
  if (!rows.length) throw new NotFoundError("comunidad no encontrada");
  const c = rows[0];
  if (c.is_private) await assertMember(communityId, userId);
  return c;
}

export async function createCommunity(
  userId: string,
  data: { slug: string; name: string; description?: string; goal?: string; colors?: unknown; isPrivate?: boolean },
) {
  const dup = await sql`select 1 from public.communities where slug = ${data.slug}`;
  if (dup.length) throw new ValidationError("slug en uso");
  const colors = data.colors ? JSON.stringify(data.colors) : null;
  const id = await sql.begin(async (tx) => {
    const rows = await tx<{ id: string }[]>`
      insert into public.communities (slug, name, description, goal, colors, is_private, created_by)
      values (${data.slug}, ${data.name}, ${data.description ?? null}, ${data.goal ?? null},
              ${colors}::jsonb, ${data.isPrivate ?? true}, ${userId})
      returning id`;
    const cid = rows[0].id;
    // el creador entra como moderador
    await tx`insert into public.community_members (community_id, profile_id, role)
             values (${cid}, ${userId}, 'moderator')`;
    return cid;
  });
  return getCommunity(id, userId);
}

// ── membresía ─────────────────────────────────────────────────
export async function join(communityId: string, userId: string) {
  const c = await sql`select is_private from public.communities where id = ${communityId}`;
  if (!c.length) throw new NotFoundError("comunidad no encontrada");
  if (c[0].is_private) throw new ForbiddenError("comunidad privada (requiere invitación)");
  await sql`insert into public.community_members (community_id, profile_id, role)
           values (${communityId}, ${userId}, 'member')
           on conflict do nothing`;
}

export async function leave(communityId: string, userId: string) {
  await sql`delete from public.community_members
           where community_id = ${communityId} and profile_id = ${userId}`;
}

export async function members(communityId: string, userId: string) {
  await assertMember(communityId, userId);
  return sql`
    select p.username, p.display_name, p.avatar_url, ul.current_level, cm.role
    from public.community_members cm
    join public.profiles p on p.id = cm.profile_id
    left join public.user_levels ul on ul.profile_id = p.id
    where cm.community_id = ${communityId}
    order by cm.role desc, cm.joined_at`;
}

// ── mensajes (foro/chat) ──────────────────────────────────────
export async function listMessages(communityId: string, userId: string, limit: number, before?: string) {
  await assertMember(communityId, userId);
  const lim = Math.min(Math.max(limit, 1), 100);
  const isMod = (await membership(communityId, userId)) === "moderator";
  if (before) {
    return sql`
      select m.id, m.kind, m.body, m.media_url, m.created_at, m.hidden,
             p.username, p.display_name, p.avatar_url
      from public.community_messages m
      left join public.profiles p on p.id = m.profile_id
      where m.community_id = ${communityId} and m.created_at < ${before}
        and (${isMod} or m.hidden = false)
      order by m.created_at desc limit ${lim}`;
  }
  return sql`
    select m.id, m.kind, m.body, m.media_url, m.created_at, m.hidden,
           p.username, p.display_name, p.avatar_url
    from public.community_messages m
    left join public.profiles p on p.id = m.profile_id
    where m.community_id = ${communityId} and (${isMod} or m.hidden = false)
    order by m.created_at desc limit ${lim}`;
}

export async function postMessage(
  communityId: string, userId: string,
  data: { kind: "text" | "photo" | "file"; body?: string; mediaUrl?: string },
) {
  await assertMember(communityId, userId);
  if (data.kind === "text" && !data.body?.trim()) throw new ValidationError("mensaje vacío");
  if (data.kind !== "text" && !data.mediaUrl) throw new ValidationError("falta media");
  const rows = await sql`
    insert into public.community_messages (community_id, profile_id, kind, body, media_url)
    values (${communityId}, ${userId}, ${data.kind}, ${data.body ?? null}, ${data.mediaUrl ?? null})
    returning id, kind, body, media_url, created_at`;
  return rows[0];
}

// borrar mensaje: autor o moderador
export async function deleteMessage(communityId: string, userId: string, messageId: string) {
  const rows = await sql<{ profile_id: string | null }[]>`
    select profile_id from public.community_messages
    where id = ${messageId} and community_id = ${communityId}`;
  if (!rows.length) throw new NotFoundError("mensaje no encontrado");
  const isOwner = rows[0].profile_id === userId;
  if (!isOwner) await assertModerator(communityId, userId);
  await sql`delete from public.community_messages where id = ${messageId}`;
}

// ocultar/mostrar mensaje (moderación)
export async function setMessageHidden(communityId: string, userId: string, messageId: string, hidden: boolean) {
  await assertModerator(communityId, userId);
  const rows = await sql`
    update public.community_messages set hidden = ${hidden}
    where id = ${messageId} and community_id = ${communityId} returning id`;
  if (!rows.length) throw new NotFoundError("mensaje no encontrado");
}
