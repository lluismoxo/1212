import { sql } from "../../db/client.js";

// Diario: privado del dueño (ni siquiera admin lo lee — ver RLS doc/decisión).

export async function upsertEntry(userId: string, date: string, body: string) {
  const rows = await sql`
    insert into public.journal_entries (profile_id, entry_date, body)
    values (${userId}, ${date}, ${body})
    on conflict (profile_id, entry_date) do update set body = excluded.body, updated_at = now()
    returning entry_date, body, updated_at`;
  return rows[0];
}

export async function getEntry(userId: string, date: string) {
  const rows = await sql`
    select entry_date, body, updated_at from public.journal_entries
    where profile_id = ${userId} and entry_date = ${date}`;
  return rows[0] ?? null;
}

export async function listEntries(userId: string, limit: number, before?: string) {
  const lim = Math.min(Math.max(limit, 1), 100);
  if (before) {
    return sql`select entry_date, body from public.journal_entries
      where profile_id = ${userId} and entry_date < ${before}
      order by entry_date desc limit ${lim}`;
  }
  return sql`select entry_date, body from public.journal_entries
    where profile_id = ${userId} order by entry_date desc limit ${lim}`;
}
