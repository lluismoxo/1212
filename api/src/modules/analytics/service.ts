import { sql } from "../../db/client.js";

// Lista blanca de eventos válidos (evita ruido/inyección de nombres arbitrarios).
const ALLOWED = new Set([
  "onboarding_completed",
  "habit_checked",
  "task_completed",
  "journal_written",
  "level_up",
  "community_joined",
  "profile_viewed",
  "account_deleted",
]);

export function isAllowed(name: string): boolean {
  return ALLOWED.has(name);
}

export async function track(profileId: string | null, name: string, props?: unknown) {
  if (!isAllowed(name)) return; // descarta silenciosamente eventos no permitidos
  await sql`
    insert into public.analytics_events (profile_id, name, props)
    values (${profileId}, ${name}, ${props ? JSON.stringify(props) : "{}"}::jsonb)`;
}

// Admin: conteo por evento en una ventana.
export async function summary(days: number) {
  const d = Math.min(Math.max(days, 1), 365);
  return sql`
    select name, count(*)::int as n
    from public.analytics_events
    where created_at > now() - (${d} || ' days')::interval
    group by name order by n desc`;
}
