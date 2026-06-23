import { sql } from "../../db/client.js";

export class NotFoundError extends Error {}

// Todas las queries filtran por profile_id = userId (autorización por dueño).

export async function listHabits(userId: string) {
  return sql`
    select id, name, icon, schedule, archived, created_at
    from public.habits where profile_id = ${userId} and archived = false
    order by created_at`;
}

export async function createHabit(userId: string, name: string, icon?: string | null) {
  const rows = await sql`
    insert into public.habits (profile_id, name, icon)
    values (${userId}, ${name}, ${icon ?? null})
    returning id, name, icon, schedule, archived, created_at`;
  return rows[0];
}

export async function archiveHabit(userId: string, habitId: string) {
  const rows = await sql`
    update public.habits set archived = true
    where id = ${habitId} and profile_id = ${userId}
    returning id`;
  if (!rows.length) throw new NotFoundError("hábito no encontrado");
}

// Marca/desmarca un hábito en una fecha (upsert idempotente).
export async function setHabitLog(userId: string, habitId: string, date: string, done: boolean) {
  // verifica propiedad del hábito
  const own = await sql`select 1 from public.habits where id = ${habitId} and profile_id = ${userId}`;
  if (!own.length) throw new NotFoundError("hábito no encontrado");

  await sql`
    insert into public.habit_logs (habit_id, profile_id, log_date, done)
    values (${habitId}, ${userId}, ${date}, ${done})
    on conflict (habit_id, log_date) do update set done = excluded.done`;
}

// Logs de la semana (rango de fechas) para la tabla semanal del diseño.
export async function weekLogs(userId: string, from: string, to: string) {
  return sql`
    select habit_id, log_date, done from public.habit_logs
    where profile_id = ${userId} and log_date between ${from} and ${to} and done = true`;
}

// Racha actual: días consecutivos (hasta hoy) con al menos un hábito hecho.
export async function currentStreak(userId: string): Promise<number> {
  const rows = await sql<{ streak: number }[]>`
    with days as (
      select distinct log_date from public.habit_logs
      where profile_id = ${userId} and done = true
    ),
    seq as (
      select log_date,
             log_date - (row_number() over (order by log_date desc))::int as grp
      from days where log_date <= current_date
    )
    select count(*)::int as streak
    from seq
    where grp = (
      select log_date - (row_number() over (order by log_date desc))::int
      from days where log_date <= current_date order by log_date desc limit 1
    )`;
  return rows[0]?.streak ?? 0;
}
