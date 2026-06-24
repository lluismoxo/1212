import { sql } from "../../db/client.js";

export class NotFoundError extends Error {}
export class ValidationError extends Error {}

export interface ProfileUpdate {
  username?: string;
  displayName?: string;
  bio?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  isPublic?: boolean;
  locationSharing?: "exact" | "city" | "off";
}

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

// Perfil propio completo (incluye campos privados de config).
export async function getOwnProfile(userId: string) {
  const rows = await sql`
    select id, username, display_name, avatar_url, bio, city,
           is_public, location_sharing, onboarding_done
    from public.profiles where id = ${userId} and deleted_at is null`;
  if (!rows.length) throw new NotFoundError("perfil no encontrado");
  return rows[0];
}

// Perfil público por username (solo si is_public y no borrado).
export async function getPublicProfile(username: string) {
  const rows = await sql`
    select id, username, display_name, avatar_url, bio, city, location_sharing
    from public.profiles
    where username = ${username} and is_public = true and deleted_at is null`;
  if (!rows.length) throw new NotFoundError("perfil no encontrado");
  const profile = rows[0];
  const links = await sql`
    select kind, url, position from public.social_links
    where profile_id = ${profile.id} order by position`;
  const level = await sql`
    select ul.current_level, ul.progress, l.name
    from public.user_levels ul join public.levels l on l.n = ul.current_level
    where ul.profile_id = ${profile.id}`;
  return { ...profile, links, level: level[0] ?? null };
}

export async function updateProfile(userId: string, patch: ProfileUpdate) {
  if (patch.username !== undefined && !USERNAME_RE.test(patch.username)) {
    throw new ValidationError("username inválido");
  }
  // username único (si cambia)
  if (patch.username !== undefined) {
    const taken = await sql`
      select 1 from public.profiles
      where username = ${patch.username} and id <> ${userId}`;
    if (taken.length) throw new ValidationError("username en uso");
  }

  const rows = await sql`
    update public.profiles set
      username        = coalesce(${patch.username ?? null}, username),
      display_name    = coalesce(${patch.displayName ?? null}, display_name),
      bio             = ${patch.bio === undefined ? sql`bio` : patch.bio},
      city            = ${patch.city === undefined ? sql`city` : patch.city},
      avatar_url      = ${patch.avatarUrl === undefined ? sql`avatar_url` : patch.avatarUrl},
      is_public       = coalesce(${patch.isPublic ?? null}, is_public),
      location_sharing = coalesce(${patch.locationSharing ?? null}, location_sharing)
    where id = ${userId} and deleted_at is null
    returning id, username, display_name, avatar_url, bio, city,
              is_public, location_sharing, onboarding_done`;
  if (!rows.length) throw new NotFoundError("perfil no encontrado");
  return rows[0];
}

// Reemplaza los enlaces sociales del usuario (máx 6).
export async function setSocialLinks(
  userId: string,
  links: { kind: string; url: string }[],
) {
  if (links.length > 6) throw new ValidationError("máximo 6 enlaces");
  await sql.begin(async (tx) => {
    await tx`delete from public.social_links where profile_id = ${userId}`;
    for (let i = 0; i < links.length; i++) {
      await tx`
        insert into public.social_links (profile_id, kind, url, position)
        values (${userId}, ${links[i].kind}, ${links[i].url}, ${i})`;
    }
  });
  return sql`select kind, url, position from public.social_links
            where profile_id = ${userId} order by position`;
}

// Marca onboarding completado.
export async function completeOnboarding(userId: string) {
  await sql`update public.profiles set onboarding_done = true where id = ${userId}`;
}
