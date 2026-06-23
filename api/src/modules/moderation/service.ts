import { sql } from "../../db/client.js";

export class NotFoundError extends Error {}

// Cualquier usuario puede reportar; admin resuelve.
export async function createReport(
  reporterId: string,
  targetType: "profile" | "message" | "community",
  targetId: string,
  reason: string,
) {
  const rows = await sql`
    insert into public.moderation_reports (reporter_id, target_type, target_id, reason)
    values (${reporterId}, ${targetType}, ${targetId}, ${reason})
    returning id, status, created_at`;
  return rows[0];
}

// Admin: lista reportes por estado.
export async function listReports(status?: string) {
  if (status) {
    return sql`select * from public.moderation_reports where status = ${status} order by created_at desc limit 200`;
  }
  return sql`select * from public.moderation_reports order by created_at desc limit 200`;
}

export async function resolveReport(adminId: string, id: string, status: "resolved" | "dismissed" | "reviewing") {
  const rows = await sql`
    update public.moderation_reports
    set status = ${status}, handled_by = ${adminId},
        resolved_at = case when ${status} in ('resolved','dismissed') then now() else null end
    where id = ${id} returning id`;
  if (!rows.length) throw new NotFoundError("reporte no encontrado");
}
