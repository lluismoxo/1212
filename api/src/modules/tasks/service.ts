import { sql } from "../../db/client.js";

export class NotFoundError extends Error {}

export async function listTasks(userId: string, dueDate?: string) {
  if (dueDate) {
    return sql`select id, text, done, due_date, position from public.tasks
      where profile_id = ${userId} and due_date = ${dueDate} order by position, created_at`;
  }
  return sql`select id, text, done, due_date, position from public.tasks
    where profile_id = ${userId} order by position, created_at`;
}

export async function createTask(userId: string, text: string, dueDate?: string | null) {
  const rows = await sql`
    insert into public.tasks (profile_id, text, due_date)
    values (${userId}, ${text}, ${dueDate ?? null})
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
