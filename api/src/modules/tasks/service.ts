import { sql } from "../../db/client.js";

export class NotFoundError extends Error {}

// Tareas SOLO del día (regla de producto: sin histórico).
// La fecha la fija el servidor (current_date), no el cliente.
// Al listar, se purgan las tareas de días anteriores (no se guarda histórico).

async function purgeOld(userId: string) {
  await sql`delete from public.tasks
           where profile_id = ${userId}
             and due_date is not null and due_date < current_date`;
}

export async function listTasks(userId: string) {
  await purgeOld(userId);
  return sql`
    select id, text, done, due_date, position from public.tasks
    where profile_id = ${userId} and (due_date = current_date or due_date is null)
    order by position, created_at`;
}

export async function createTask(userId: string, text: string) {
  const rows = await sql`
    insert into public.tasks (profile_id, text, due_date)
    values (${userId}, ${text}, current_date)
    returning id, text, done, due_date, position`;
  return rows[0];
}

export async function toggleTask(userId: string, id: string, done: boolean) {
  const rows = await sql`
    update public.tasks set done = ${done}
    where id = ${id} and profile_id = ${userId}
    returning id, text, done, due_date, position`;
  if (!rows.length) throw new NotFoundError("tarea no encontrada");
  return rows[0];
}

export async function deleteTask(userId: string, id: string) {
  const rows = await sql`delete from public.tasks
    where id = ${id} and profile_id = ${userId} returning id`;
  if (!rows.length) throw new NotFoundError("tarea no encontrada");
}
