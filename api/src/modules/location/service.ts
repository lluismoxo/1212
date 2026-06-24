import { sql } from "../../db/client.js";

export class ValidationError extends Error {}

// Guarda/actualiza la ubicación del usuario (exacta, PostGIS).
// El consentimiento/visibilidad se controla con profiles.location_sharing.
export async function upsertLocation(
  userId: string,
  lat: number,
  lng: number,
  accuracyM?: number | null,
) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ValidationError("coordenadas fuera de rango");
  }
  await sql`
    insert into public.locations (profile_id, geog, accuracy_m, updated_at)
    values (
      ${userId},
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${accuracyM ?? null},
      now()
    )
    on conflict (profile_id) do update set
      geog = excluded.geog, accuracy_m = excluded.accuracy_m, updated_at = now()`;
}

export async function deleteLocation(userId: string) {
  await sql`delete from public.locations where profile_id = ${userId}`;
}

// Usuarios públicos cercanos a un punto, dentro de radiusKm.
// Respeta location_sharing: 'off' se excluye; 'city' devuelve coords nulas
// (solo ciudad) — protección anti-abuso aunque la ubicación sea pública.
export async function nearby(lat: number, lng: number, radiusKm: number, limit: number) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ValidationError("coordenadas fuera de rango");
  }
  const radiusM = Math.min(Math.max(radiusKm, 1), 20000) * 1000;
  const lim = Math.min(Math.max(limit, 1), 200);

  const rows = await sql`
    select
      p.username, p.display_name, p.city, p.avatar_url, p.location_sharing,
      ul.current_level,
      case when p.location_sharing = 'exact'
           then ST_Y(loc.geog::geometry) end as lat,
      case when p.location_sharing = 'exact'
           then ST_X(loc.geog::geometry) end as lng,
      ST_Distance(loc.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as dist_m
    from public.locations loc
    join public.profiles p on p.id = loc.profile_id
    left join public.user_levels ul on ul.profile_id = p.id
    where p.is_public = true and p.deleted_at is null
      and p.location_sharing <> 'off'
      and ST_DWithin(loc.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusM})
    order by dist_m
    limit ${lim}`;
  return rows;
}
