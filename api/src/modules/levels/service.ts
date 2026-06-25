import { sql } from "../../db/client.js";

// El nivel se calcula SOLO server-side a partir de los hábitos (≥70%/mes natural).
// El cliente nunca escribe el nivel.

export interface LevelState {
  current_level: number;
  points: number;
  progress: number;
  tracking_since: string | null;
  current_month_compliance: number; // % del mes en curso (informativo, aún no cuenta)
}

// Recalcula (idempotente) y devuelve el estado del nivel del usuario.
export async function getOwnLevel(userId: string): Promise<LevelState> {
  // recálculo según histórico de meses completos
  await sql`select public.recalc_level(${userId})`;

  const rows = await sql<{ current_level: number; points: number; progress: number }[]>`
    select current_level, points, progress from public.user_levels where profile_id = ${userId}`;

  const prof = await sql<{ level_tracking_since: string | null }[]>`
    select level_tracking_since from public.profiles where id = ${userId}`;

  const comp = await sql<{ c: number }[]>`
    select public.month_compliance(${userId}, current_date) as c`;

  const r = rows[0] ?? { current_level: 1, points: 0, progress: 0 };
  return {
    current_level: r.current_level,
    points: r.points,
    progress: r.progress,
    tracking_since: prof[0]?.level_tracking_since ?? null,
    current_month_compliance: Number(comp[0]?.c ?? 0),
  };
}

// Cumplimiento de un mes concreto (para depurar / mostrar histórico).
export async function monthCompliance(userId: string, month: string): Promise<number> {
  const r = await sql<{ c: number }[]>`select public.month_compliance(${userId}, ${month}::date) as c`;
  return Number(r[0]?.c ?? 0);
}
